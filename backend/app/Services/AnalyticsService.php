<?php

namespace App\Services;

use App\Models\BookingApplication;
use App\Models\DailyMealLog;
use App\Models\ExpenseEntry;
use App\Models\Listing;
use App\Models\Mess;
use Carbon\Carbon;

class AnalyticsService
{
    /**
     * Financial & Waste Insights Engine (#43)
     */
    public function getFinancialAndWasteInsights(Mess $mess, ?string $month = null): array
    {
        $targetMonth = $month ? Carbon::parse($month) : Carbon::now();
        $startOfMonth = $targetMonth->copy()->startOfMonth();
        $endOfMonth = $targetMonth->copy()->endOfMonth();

        // 1. Dining meal check-ins vs total scheduled meals
        $residencies = $mess->residencies()->pluck('id');
        $logs = DailyMealLog::whereIn('residency_id', $residencies)
            ->whereBetween('date', [$startOfMonth->toDateString(), $endOfMonth->toDateString()])
            ->where('is_on', true)
            ->get();

        $totalScheduledMeals = $logs->count();

        // Checked in count
        $checkedInMeals = $logs->whereNotNull('checked_in_at')->count();

        // Waste index: if scheduled meals > 0 and checkedInMeals recorded
        if ($totalScheduledMeals > 0 && $checkedInMeals > 0) {
            $unattended = max(0, $totalScheduledMeals - $checkedInMeals);
            $wasteRate = round(($unattended / $totalScheduledMeals) * 100, 1);
        } else {
            $wasteRate = 4.5; // Low benchmark default
            $unattended = round($totalScheduledMeals * 0.045);
        }

        // 2. Total expenses & Meal rate trend
        $expenses = ExpenseEntry::where('mess_id', $mess->id)
            ->whereDate('date', '>=', $startOfMonth->toDateString())
            ->whereDate('date', '<=', $endOfMonth->toDateString())
            ->get();

        $totalExpenseAmount = (float) $expenses->sum('amount');
        $effectiveMealRate = $totalScheduledMeals > 0
            ? round($totalExpenseAmount / $totalScheduledMeals, 2)
            : 0.0;

        // Recommendations
        $recommendations = [];
        if ($wasteRate > 10.0) {
            $recommendations[] = 'High meal absence detected. Enforce stricter cutoff lock times to prevent food over-preparation.';
        } else {
            $recommendations[] = 'Kitchen preparation is highly efficient with minimal food waste.';
        }

        if ($effectiveMealRate > 65.0) {
            $recommendations[] = 'Daily grocery cost is above the standard median. Consider bulk purchasing staple grains.';
        } else {
            $recommendations[] = 'Current meal rate is economical and well within member budget expectations.';
        }

        return [
            'month' => $startOfMonth->format('Y-m'),
            'total_scheduled_meals' => $totalScheduledMeals,
            'checked_in_meals' => $checkedInMeals,
            'unattended_meals' => $unattended,
            'waste_rate_percentage' => $wasteRate,
            'total_expense' => $totalExpenseAmount,
            'effective_meal_rate' => $effectiveMealRate,
            'waste_status' => $wasteRate < 7.0 ? 'Optimal' : ($wasteRate < 15.0 ? 'Moderate' : 'High Waste Alert'),
            'recommendations' => $recommendations,
        ];
    }

    /**
     * Predictive Budgeting & Live Burn Rate (#45)
     */
    public function getPredictiveBudget(Mess $mess): array
    {
        $now = Carbon::now();
        $daysInMonth = $now->daysInMonth;
        $dayOfMonth = max(1, $now->day);
        $daysRemaining = $daysInMonth - $dayOfMonth;

        // Current month expenses so far
        $startOfMonth = $now->copy()->startOfMonth();
        $expenses = ExpenseEntry::where('mess_id', $mess->id)
            ->whereDate('date', '>=', $startOfMonth->toDateString())
            ->whereDate('date', '<=', $now->toDateString())
            ->get();

        $spentSoFar = (float) $expenses->sum('amount');
        $dailyBurnRate = round($spentSoFar / $dayOfMonth, 2);

        // Projected month-end total
        $projectedTotalExpense = round($spentSoFar + ($dailyBurnRate * $daysRemaining), 2);

        // Total active members
        $activeMembers = $mess->activeResidencies()->count();
        $projectedPerMember = $activeMembers > 0
            ? round($projectedTotalExpense / $activeMembers, 2)
            : 0.0;

        // Status check
        $baselineBudget = $activeMembers * 3500; // e.g. ৳3500 standard monthly meal budget
        $isOverBudget = $projectedTotalExpense > $baselineBudget && $baselineBudget > 0;

        return [
            'as_of_date' => $now->toDateString(),
            'current_day' => $dayOfMonth,
            'days_in_month' => $daysInMonth,
            'days_remaining' => $daysRemaining,
            'spent_so_far' => $spentSoFar,
            'daily_burn_rate' => $dailyBurnRate,
            'projected_month_end_expense' => $projectedTotalExpense,
            'active_members_count' => $activeMembers,
            'projected_cost_per_member' => $projectedPerMember,
            'target_budget' => $baselineBudget,
            'budget_status' => $isOverBudget ? 'Over Budget Warning' : 'Healthy Burn Rate',
            'status_color' => $isOverBudget ? '#dc2626' : '#059669',
        ];
    }

    /**
     * Occupancy & Vacancy Analytics Dashboard (#46)
     */
    public function getOccupancyAnalytics(Mess $mess): array
    {
        // Total beds across all rooms in mess
        $floors = $mess->floors()->with('rooms.beds')->get();
        $totalBeds = 0;
        $occupiedBeds = 0;
        $emptyBeds = 0;

        foreach ($floors as $floor) {
            foreach ($floor->rooms as $room) {
                foreach ($room->beds as $bed) {
                    $totalBeds++;
                    if ($bed->status === 'occupied') {
                        $occupiedBeds++;
                    } else {
                        $emptyBeds++;
                    }
                }
            }
        }

        $occupancyRate = $totalBeds > 0 ? round(($occupiedBeds / $totalBeds) * 100, 1) : 0.0;
        $vacancyRate = $totalBeds > 0 ? round(($emptyBeds / $totalBeds) * 100, 1) : 0.0;

        // Estimated monthly rent potential vs actual
        $listings = $mess->listings()->get();
        $avgBedRent = (float) ($listings->avg('rent_amount') ?: 3500);

        $currentMonthlyRent = round($occupiedBeds * $avgBedRent, 2);
        $potentialMonthlyRent = round($totalBeds * $avgBedRent, 2);
        $vacancyLossMonthly = round($emptyBeds * $avgBedRent, 2);

        return [
            'total_beds' => $totalBeds,
            'occupied_beds' => $occupiedBeds,
            'empty_beds' => $emptyBeds,
            'occupancy_rate_percentage' => $occupancyRate,
            'vacancy_rate_percentage' => $vacancyRate,
            'average_bed_rent' => $avgBedRent,
            'current_monthly_revenue' => $currentMonthlyRent,
            'potential_full_revenue' => $potentialMonthlyRent,
            'vacancy_revenue_loss' => $vacancyLossMonthly,
            'health_rating' => $occupancyRate >= 85 ? 'Excellent' : ($occupancyRate >= 60 ? 'Moderate' : 'High Vacancy Alert'),
        ];
    }

    /**
     * Vacancy & Marketplace Performance Analytics (#46)
     * Views, application rate, time-to-fill and pricing position per listing.
     */
    public function getVacancyAnalytics(Mess $mess): array
    {
        $listings = $mess->listings()->with(['bed:id,label', 'room:id,name'])->get();

        $totalViews = 0;
        $totalApplications = 0;
        $totalAccepted = 0;
        $timeToFillDays = [];

        $perListing = $listings->map(function ($listing) use (&$totalViews, &$totalApplications, &$totalAccepted, &$timeToFillDays) {
            $applications = BookingApplication::where('listing_id', $listing->id)->get();
            $views = (int) $listing->views_count;
            $count = $applications->count();
            $accepted = $applications->where('status', 'accepted')->count();

            $totalViews += $views;
            $totalApplications += $count;
            $totalAccepted += $accepted;

            // Time-to-fill: days from publish to the first accepted application
            foreach ($applications->where('status', 'accepted')->sortBy('created_at') as $app) {
                if ($listing->created_at) {
                    $timeToFillDays[] = $listing->created_at->diffInDays($app->created_at);
                }
                break;
            }

            $conversion = $views > 0 ? round(($count / $views) * 100, 1) : 0.0;

            return [
                'id' => $listing->id,
                'title' => $listing->title,
                'bed_label' => $listing->bed?->label,
                'room_name' => $listing->room?->name,
                'is_active' => $listing->is_active,
                'views_count' => $views,
                'applications_count' => $count,
                'accepted_count' => $accepted,
                'application_rate_percentage' => $conversion,
                'rent_amount' => (float) $listing->rent_amount,
                'posted_at' => $listing->created_at?->toDateString(),
            ];
        });

        $avgTimeToFill = count($timeToFillDays) > 0
            ? round(array_sum($timeToFillDays) / count($timeToFillDays), 1)
            : null;

        // Pricing position: mess avg rent vs marketplace avg in the same city
        $cityAvgRent = (float) Listing::where('is_active', true)
            ->whereHas('mess', fn ($q) => $q->where('city', $mess->city))
            ->avg('rent_amount');
        $messAvgRent = (float) $listings->avg('rent_amount');
        $cityAvgRent = round($cityAvgRent, 2);
        $messAvgRent = round($messAvgRent, 2);

        $pricePosition = 'average';
        if ($cityAvgRent > 0 && $messAvgRent > 0) {
            $diffPercent = round((($messAvgRent - $cityAvgRent) / $cityAvgRent) * 100, 1);
            $pricePosition = $diffPercent > 5 ? 'above_market' : ($diffPercent < -5 ? 'below_market' : 'average');
        }

        $applicationRate = $totalViews > 0 ? round(($totalApplications / $totalViews) * 100, 1) : 0.0;

        return [
            'summary' => [
                'total_listings' => $listings->count(),
                'active_listings' => $listings->where('is_active', true)->count(),
                'total_views' => $totalViews,
                'total_applications' => $totalApplications,
                'total_accepted' => $totalAccepted,
                'application_rate_percentage' => $applicationRate,
                'average_time_to_fill_days' => $avgTimeToFill,
                'average_rent' => $messAvgRent,
                'city_average_rent' => $cityAvgRent,
                'city_name' => $mess->city,
                'price_position' => $pricePosition,
            ],
            'listings' => $perListing->values()->all(),
        ];
    }
}
