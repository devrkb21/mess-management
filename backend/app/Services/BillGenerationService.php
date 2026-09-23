<?php

namespace App\Services;

use App\Models\FixedBill;
use App\Models\Mess;
use App\Models\MonthlyBill;
use App\Models\Residency;
use Carbon\Carbon;
use Illuminate\Support\Collection;

class BillGenerationService
{
    public function __construct(
        protected MealService $mealService,
    ) {}

    /**
     * Generate monthly bills for ALL active residents in a mess.
     *
     * @return Collection<MonthlyBill>
     */
    public function generateMonthlyBills(Mess $mess, string $billingMonth): Collection
    {
        $activeResidencies = $mess->residencies()
            ->whereIn('status', ['active', 'on_leave'])
            ->get();

        $bills = collect();

        foreach ($activeResidencies as $residency) {
            $bill = $this->generateBillForResident($residency, $billingMonth);
            $bills->push($bill);
        }

        return $bills;
    }

    /**
     * Generate a monthly bill for a single resident.
     */
    public function generateBillForResident(Residency $residency, string $billingMonth): MonthlyBill
    {
        $mess = $residency->mess;

        // 1. Calculate meal cost
        $mealCostTotal = $this->mealService->calculateResidentMealCostForMonth(
            $residency,
            $billingMonth,
        );

        // 2. Calculate fixed bill share
        $fixedBillShareTotal = $this->calculateFixedBillShare(
            $residency,
            $mess,
            $billingMonth,
        );

        // 3. Get previous dues (from last month's bill, if any)
        $previousDue = $this->getPreviousDue($residency, $billingMonth);

        // 4. Total payable
        $totalPayable = round($mealCostTotal + $fixedBillShareTotal + $previousDue, 2);

        // 5. Create or update the bill
        $bill = MonthlyBill::updateOrCreate(
            [
                'residency_id' => $residency->id,
                'billing_month' => $billingMonth,
            ],
            [
                'meal_cost_total' => $mealCostTotal,
                'fixed_bill_share_total' => $fixedBillShareTotal,
                'previous_due' => $previousDue,
                'total_payable' => $totalPayable,
                'status' => 'issued',
                'generated_at' => now(),
            ]
        );

        return $bill;
    }

    /**
     * Calculate a resident's share of fixed bills for a month.
     *
     * Split methods:
     * - 'equal': total / number_of_active_residents
     * - 'prorated': total × (days_in_mess / total_days_in_month)
     */
    public function calculateFixedBillShare(
        Residency $residency,
        Mess $mess,
        string $billingMonth,
    ): float {
        $fixedBills = FixedBill::where('mess_id', $mess->id)
            ->where('billing_month', $billingMonth)
            ->get();

        if ($fixedBills->isEmpty()) {
            return 0;
        }

        $totalShare = 0;

        foreach ($fixedBills as $bill) {
            $splitMethod = $bill->split_method ?? $mess->bill_split_default;

            if ($splitMethod === 'equal') {
                $totalShare += $this->equalSplit($bill, $mess);
            } else {
                $totalShare += $this->proratedSplit($bill, $residency, $billingMonth);
            }
        }

        return round($totalShare, 2);
    }

    /**
     * Get the remaining due from the previous month's bill.
     */
    public function getPreviousDue(Residency $residency, string $currentBillingMonth): float
    {
        $previousMonth = Carbon::parse($currentBillingMonth . '-01')
            ->subMonth()
            ->format('Y-m');

        $previousBill = MonthlyBill::where('residency_id', $residency->id)
            ->where('billing_month', $previousMonth)
            ->first();

        if (! $previousBill) {
            return 0;
        }

        return max(0, $previousBill->remainingDue());
    }

    // ---- Private Helpers ----

    /**
     * Equal split: bill amount / total active residents.
     */
    private function equalSplit(FixedBill $bill, Mess $mess): float
    {
        $activeResidentCount = $mess->residencies()
            ->whereIn('status', ['active', 'on_leave'])
            ->count();

        if ($activeResidentCount <= 0) {
            return 0;
        }

        return round((float) $bill->amount / $activeResidentCount, 2);
    }

    /**
     * Prorated split: bill amount × (days_resident_was_present / total_days_in_month).
     */
    private function proratedSplit(
        FixedBill $bill,
        Residency $residency,
        string $billingMonth,
    ): float {
        $monthStart = Carbon::parse($billingMonth . '-01');
        $monthEnd = $monthStart->copy()->endOfMonth();
        $totalDays = $monthStart->daysInMonth;

        // Determine resident's actual days in the mess this month
        $residentStart = $residency->joined_at
            ? max($monthStart, $residency->joined_at)
            : $monthStart;

        $residentEnd = $residency->left_at
            ? min($monthEnd, $residency->left_at)
            : $monthEnd;

        if ($residentStart->greaterThan($residentEnd)) {
            return 0;
        }

        $daysPresent = $residentStart->diffInDays($residentEnd) + 1;

        // Get total prorated days across all residents for normalization
        $totalProratedDays = $this->getTotalProratedDays(
            $residency->mess,
            $billingMonth,
            $monthStart,
            $monthEnd,
        );

        if ($totalProratedDays <= 0) {
            return 0;
        }

        return round(((float) $bill->amount * $daysPresent) / $totalProratedDays, 2);
    }

    /**
     * Sum of days-present for all active residents in a month.
     * Used as denominator for prorated splits so the total sums to 100%.
     */
    private function getTotalProratedDays(
        Mess $mess,
        string $billingMonth,
        Carbon $monthStart,
        Carbon $monthEnd,
    ): int {
        $residencies = $mess->residencies()
            ->whereIn('status', ['active', 'on_leave', 'left'])
            ->where(function ($query) use ($monthStart, $monthEnd) {
                $query->where(function ($q) use ($monthEnd) {
                    $q->whereNull('joined_at')->orWhere('joined_at', '<=', $monthEnd);
                })->where(function ($q) use ($monthStart) {
                    $q->whereNull('left_at')->orWhere('left_at', '>=', $monthStart);
                });
            })
            ->get();

        $totalDays = 0;

        foreach ($residencies as $residency) {
            $start = $residency->joined_at
                ? max($monthStart, $residency->joined_at)
                : $monthStart;

            $end = $residency->left_at
                ? min($monthEnd, $residency->left_at)
                : $monthEnd;

            if ($start->lte($end)) {
                $totalDays += $start->diffInDays($end) + 1;
            }
        }

        return $totalDays;
    }
}
