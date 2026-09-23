<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BazarSchedule;
use App\Models\Complaint;
use App\Models\DailyMealLog;
use App\Models\ExpenseEntry;
use App\Models\Mess;
use App\Models\MonthlyBill;
use App\Models\Residency;
use App\Services\MealService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;

class DashboardController extends Controller
{
    public function __construct(
        protected MealService $mealService,
    ) {}

    /**
     * GET /api/v1/messes/{mess}/dashboard
     */
    public function index(string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $today = Carbon::today()->toDateString();
        $currentMonth = Carbon::today()->format('Y-m');

        // Active residents count
        $activeResidencies = Residency::where('mess_id', $mess)
            ->whereIn('status', ['active', 'on_leave'])
            ->get();
        $activeResidentsCount = $activeResidencies->where('status', 'active')->count();
        $activeResidencyIds = $activeResidencies->pluck('id');

        // Today's meal logs
        $todayLogs = DailyMealLog::whereIn('residency_id', $activeResidencyIds)
            ->whereDate('date', $today)
            ->get();

        // Calculate counts for breakfast, lunch, dinner
        $breakfastLogs = $todayLogs->where('meal_type', 'breakfast')->where('is_on', true);
        $lunchLogs = $todayLogs->where('meal_type', 'lunch')->where('is_on', true);
        $dinnerLogs = $todayLogs->where('meal_type', 'dinner')->where('is_on', true);

        $breakfastCount = $breakfastLogs->count();
        $breakfastGuests = (int) $breakfastLogs->sum('guest_count');
        $breakfastTotal = $breakfastCount + $breakfastGuests;

        $lunchCount = $lunchLogs->count();
        $lunchGuests = (int) $lunchLogs->sum('guest_count');
        $lunchTotal = $lunchCount + $lunchGuests;

        $dinnerCount = $dinnerLogs->count();
        $dinnerGuests = (int) $dinnerLogs->sum('guest_count');
        $dinnerTotal = $dinnerCount + $dinnerGuests;

        $totalMealsToday = $breakfastTotal + $lunchTotal + $dinnerTotal;

        // Today's live rate
        $todayMealRate = $this->mealService->getLiveMealRate($messModel);

        // Today's assigned bazar shoppers
        $todayBazarShoppers = BazarSchedule::where('mess_id', $mess)
            ->whereDate('date', $today)
            ->with('assignedResidency.user:id,name,phone')
            ->get()
            ->map(function ($s) {
                return [
                    'id' => $s->id,
                    'name' => $s->assignedResidency?->user?->name,
                    'phone' => $s->assignedResidency?->user?->phone,
                    'status' => $s->status,
                ];
            });

        // Monthly expense total
        $startOfMonth = Carbon::today()->startOfMonth();
        $endOfMonth = Carbon::today()->endOfMonth();
        $monthlyExpenseTotal = ExpenseEntry::where('mess_id', $mess)
            ->whereBetween('date', [$startOfMonth, $endOfMonth])
            ->sum('amount');

        // Pending dues
        $pendingDues = MonthlyBill::whereIn('residency_id', $activeResidencyIds)
            ->whereIn('status', ['issued', 'partially_paid', 'overdue'])
            ->get()
            ->sum(fn ($bill) => $bill->remainingDue());

        // Open complaints
        $openComplaints = Complaint::where('mess_id', $mess)
            ->open()
            ->count();

        return response()->json([
            'active_residents' => $activeResidentsCount,
            'today' => $todayMealRate,
            'today_breakdown' => [
                'breakfast' => [
                    'count' => $breakfastCount,
                    'guests' => $breakfastGuests,
                    'total' => $breakfastTotal,
                ],
                'lunch' => [
                    'count' => $lunchCount,
                    'guests' => $lunchGuests,
                    'total' => $lunchTotal,
                ],
                'dinner' => [
                    'count' => $dinnerCount,
                    'guests' => $dinnerGuests,
                    'total' => $dinnerTotal,
                ],
                'total_meals' => $totalMealsToday,
                'bazar_shoppers' => $todayBazarShoppers,
            ],
            'monthly_expense_total' => (float) $monthlyExpenseTotal,
            'pending_dues' => $pendingDues,
            'open_complaints' => $openComplaints,
            'current_month' => $currentMonth,
        ]);
    }
}
