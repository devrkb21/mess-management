<?php

namespace App\Services;

use App\Models\DailyMealLog;
use App\Models\ExpenseEntry;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\VacationRequest;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class MealService
{
    /**
     * Toggle a meal ON/OFF for a resident on a given date.
     *
     * @throws \Exception if meal is locked (past cutoff)
     */
    public function toggleMeal(
        Residency $residency,
        string $date,
        string $mealType,
        bool $isOn,
        int $guestCount = 0,
        bool $bypassCutoff = false,
    ): DailyMealLog {
        $mess = $residency->mess;

        // Check if within cutoff time (unless manager bypass)
        if (! $bypassCutoff) {
            $this->ensureNotLocked($mess, $mealType, $date);
        }

        // Check if resident is on vacation
        $this->ensureNotOnVacation($residency, $date);

        $dateStr = Carbon::parse($date)->toDateString();

        $log = DailyMealLog::where('residency_id', $residency->id)
            ->whereDate('date', $dateStr)
            ->where('meal_type', $mealType)
            ->first();

        if ($log) {
            $log->update([
                'is_on' => $isOn,
                'is_guest_meal' => $isOn && $guestCount > 0,
                'guest_count' => $isOn ? $guestCount : 0,
            ]);
            return $log->fresh();
        }

        return DailyMealLog::create([
            'residency_id' => $residency->id,
            'date' => $dateStr,
            'meal_type' => $mealType,
            'is_on' => $isOn,
            'is_guest_meal' => $isOn && $guestCount > 0,
            'guest_count' => $isOn ? $guestCount : 0,
        ]);
    }

    /**
     * Add guest meals for a resident on a given date and meal type.
     */
    public function addGuestMeals(
        Residency $residency,
        string $date,
        string $mealType,
        int $guestCount,
        bool $bypassCutoff = false,
    ): DailyMealLog {
        $mess = $residency->mess;
        if (! $bypassCutoff) {
            $this->ensureNotLocked($mess, $mealType, $date);
        }

        $dateStr = Carbon::parse($date)->toDateString();

        $log = DailyMealLog::where('residency_id', $residency->id)
            ->whereDate('date', $dateStr)
            ->where('meal_type', $mealType)
            ->first();

        if ($log) {
            $log->update([
                'is_on' => true,
                'is_guest_meal' => $guestCount > 0,
                'guest_count' => $guestCount,
            ]);
            return $log->fresh();
        }

        return DailyMealLog::create([
            'residency_id' => $residency->id,
            'date' => $dateStr,
            'meal_type' => $mealType,
            'is_on' => true,
            'is_guest_meal' => $guestCount > 0,
            'guest_count' => $guestCount,
        ]);
    }

    /**
     * Lock all meals past cutoff for a given mess and date.
     * Called by a scheduled job.
     */
    public function lockMealsPastCutoff(Mess $mess, string $date): int
    {
        $now = Carbon::now();
        $lockedCount = 0;

        foreach (['breakfast', 'lunch', 'dinner'] as $mealType) {
            $cutoff = $this->getCutoffTime($mess, $mealType, $date);

            if ($now->greaterThanOrEqualTo($cutoff)) {
                $updated = DailyMealLog::where('residency_id', function ($query) use ($mess) {
                    $query->select('id')
                        ->from('residencies')
                        ->where('mess_id', $mess->id)
                        ->whereIn('status', ['active', 'on_leave']);
                })
                    ->whereDate('date', $date)
                    ->where('meal_type', $mealType)
                    ->whereNull('locked_at')
                    ->update(['locked_at' => $now]);

                $lockedCount += $updated;
            }
        }

        return $lockedCount;
    }

    /**
     * Calculate per-meal rate for a mess on a given date.
     *
     * Formula: daily_grocery_cost / total_meals_eaten_that_day
     */
    public function calculateDailyMealRate(Mess $mess, string $date): float
    {
        $totalGroceryCost = ExpenseEntry::where('mess_id', $mess->id)
            ->whereDate('date', $date)
            ->sum('amount');

        if ($totalGroceryCost <= 0) {
            return 0;
        }

        $totalMeals = $this->getTotalMealsForDate($mess, $date);

        if ($totalMeals <= 0) {
            return 0;
        }

        return round((float) $totalGroceryCost / $totalMeals, 2);
    }

    /**
     * Get total meal count for a mess on a specific date.
     * Counts each ON meal as 1 + guest_count.
     */
    public function getTotalMealsForDate(Mess $mess, string $date): int
    {
        $activeResidencyIds = $mess->activeResidencies()->pluck('id');

        $logs = DailyMealLog::whereIn('residency_id', $activeResidencyIds)
            ->whereDate('date', $date)
            ->where('is_on', true)
            ->get();

        return $logs->sum(fn (DailyMealLog $log) => $log->totalMealCount());
    }

    /**
     * Get a resident's total meal cost for a billing month.
     *
     * For each day, cost = (meals_they_ate × that_day's_per_meal_rate)
     */
    public function calculateResidentMealCostForMonth(
        Residency $residency,
        string $billingMonth,
    ): float {
        $mess = $residency->mess;
        $startDate = Carbon::parse($billingMonth . '-01');
        $endDate = $startDate->copy()->endOfMonth();

        // Clamp to residency's actual dates in the mess
        if ($residency->joined_at && $residency->joined_at->greaterThan($startDate)) {
            $startDate = $residency->joined_at->copy();
        }
        if ($residency->left_at && $residency->left_at->lessThan($endDate)) {
            $endDate = $residency->left_at->copy();
        }

        $totalCost = 0;

        for ($date = $startDate->copy(); $date->lte($endDate); $date->addDay()) {
            $dateStr = $date->toDateString();
            $dailyRate = $this->calculateDailyMealRate($mess, $dateStr);

            if ($dailyRate <= 0) {
                continue;
            }

            // Count this resident's meals for the day
            $residentMeals = DailyMealLog::where('residency_id', $residency->id)
                ->whereDate('date', $dateStr)
                ->where('is_on', true)
                ->get()
                ->sum(fn (DailyMealLog $log) => $log->totalMealCount());

            $totalCost += $residentMeals * $dailyRate;
        }

        return round($totalCost, 2);
    }

    /**
     * Get meal logs for a resident for a given month.
     */
    public function getResidentMealHistory(Residency $residency, string $billingMonth): Collection
    {
        $startDate = Carbon::parse($billingMonth . '-01');
        $endDate = $startDate->copy()->endOfMonth();

        return DailyMealLog::where('residency_id', $residency->id)
            ->whereBetween('date', [$startDate, $endDate])
            ->orderBy('date')
            ->orderByRaw("CASE meal_type WHEN 'breakfast' THEN 1 WHEN 'lunch' THEN 2 WHEN 'dinner' THEN 3 ELSE 4 END")
            ->get();
    }

    /**
     * Get the live meal rate for today.
     */
    public function getLiveMealRate(Mess $mess): array
    {
        $today = Carbon::today()->toDateString();
        $rate = $this->calculateDailyMealRate($mess, $today);
        $totalMeals = $this->getTotalMealsForDate($mess, $today);
        $totalExpense = ExpenseEntry::where('mess_id', $mess->id)
            ->whereDate('date', $today)
            ->sum('amount');

        return [
            'date' => $today,
            'per_meal_rate' => $rate,
            'total_meals' => $totalMeals,
            'total_expense' => (float) $totalExpense,
        ];
    }

    // ---- Private Helpers ----

    private function ensureNotLocked(Mess $mess, string $mealType, string $date): void
    {
        $cutoff = $this->getCutoffTime($mess, $mealType, $date);

        if (Carbon::now()->greaterThanOrEqualTo($cutoff)) {
            throw new \Exception(
                "The {$mealType} cutoff time ({$cutoff->format('h:i A')}) has passed. Meal toggle is locked."
            );
        }
    }

    private function ensureNotOnVacation(Residency $residency, string $date): void
    {
        $onVacation = VacationRequest::where('residency_id', $residency->id)
            ->where('status', 'approved')
            ->where('start_date', '<=', $date)
            ->where('end_date', '>=', $date)
            ->exists();

        if ($onVacation) {
            throw new \Exception('You are on vacation for this date. Meal toggling is disabled.');
        }
    }

    private function getCutoffTime(Mess $mess, string $mealType, string $date): Carbon
    {
        $cutoffField = "meal_cutoff_{$mealType}";
        $cutoffTime = $mess->{$cutoffField};

        return Carbon::parse("{$date} {$cutoffTime}");
    }
}
