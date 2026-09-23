<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DailyMealLog;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\VacationRequest;
use App\Services\MealService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MealController extends Controller
{
    public function __construct(
        protected MealService $mealService,
    ) {}

    /**
     * POST /api/v1/residencies/{residency}/meals — Toggle a meal
     * Allowed for: Resident themselves OR any active Owner/Manager in that mess.
     */
    public function toggle(Request $request, string $residency): JsonResponse
    {
        $residencyModel = Residency::findOrFail($residency);

        $currentUser = $request->user();
        $isSelf = $residencyModel->user_id === $currentUser->id;
        $isManager = Residency::where('user_id', $currentUser->id)
            ->where('mess_id', $residencyModel->mess_id)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->exists();

        if (! $isSelf && ! $isManager) {
            return response()->json(['message' => 'Unauthorized. Only the resident or manager can modify meals.'], 403);
        }

        $validated = $request->validate([
            'date' => ['required', 'date'],
            'meal_type' => ['required', 'in:breakfast,lunch,dinner'],
            'is_on' => ['required', 'boolean'],
            'guest_count' => ['sometimes', 'integer', 'min:0', 'max:10'],
        ]);

        try {
            $guestCount = (int) ($validated['guest_count'] ?? 0);
            $log = $this->mealService->toggleMeal(
                $residencyModel,
                $validated['date'],
                $validated['meal_type'],
                $validated['is_on'],
                $guestCount,
                $isManager,
            );

            return response()->json([
                'message' => 'Meal updated.',
                'meal_log' => $log,
            ]);
        } catch (\Exception $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }
    }

    /**
     * GET /api/v1/residencies/{residency}/meals?month=YYYY-MM
     */
    public function history(Request $request, string $residency): JsonResponse
    {
        $residencyModel = Residency::findOrFail($residency);

        $month = $request->query('month', now()->format('Y-m'));

        $logs = $this->mealService->getResidentMealHistory($residencyModel, $month);

        return response()->json([
            'month' => $month,
            'meals' => $logs,
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/meals?date=YYYY-MM-DD
     * Collective daily meal sheet for all active residents.
     * Accessible by all mess members.
     */
    public function messDailyMeals(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $date = $request->query('date', Carbon::today()->toDateString());
        $dateStr = Carbon::parse($date)->toDateString();

        $residencies = Residency::where('mess_id', $messModel->id)
            ->whereIn('status', ['active', 'on_leave'])
            ->with(['user:id,name,phone,avatar_url', 'bed:id,label'])
            ->orderBy('role')
            ->get();

        $residencyIds = $residencies->pluck('id');

        $logs = DailyMealLog::whereIn('residency_id', $residencyIds)
            ->whereDate('date', $dateStr)
            ->get()
            ->groupBy('residency_id');

        $sheet = $residencies->map(function ($residency) use ($logs) {
            $residentLogs = $logs->get($residency->id, collect())->keyBy('meal_type');

            $breakfast = $residentLogs->get('breakfast');
            $lunch = $residentLogs->get('lunch');
            $dinner = $residentLogs->get('dinner');

            return [
                'residency_id' => $residency->id,
                'user_id' => $residency->user_id,
                'user_name' => $residency->user?->name,
                'user_phone' => $residency->user?->phone,
                'role' => $residency->role,
                'bed_label' => $residency->bed?->label ?? 'Unassigned',
                'meals' => [
                    'breakfast' => [
                        'is_on' => $breakfast ? (bool) $breakfast->is_on : true,
                        'guest_count' => $breakfast ? (int) $breakfast->guest_count : 0,
                    ],
                    'lunch' => [
                        'is_on' => $lunch ? (bool) $lunch->is_on : true,
                        'guest_count' => $lunch ? (int) $lunch->guest_count : 0,
                    ],
                    'dinner' => [
                        'is_on' => $dinner ? (bool) $dinner->is_on : true,
                        'guest_count' => $dinner ? (int) $dinner->guest_count : 0,
                    ],
                ],
            ];
        });

        $totalMeals = $this->mealService->getTotalMealsForDate($messModel, $dateStr);

        return response()->json([
            'date' => $dateStr,
            'total_meals' => $totalMeals,
            'sheet' => $sheet,
            'cutoffs' => [
                'breakfast' => $messModel->meal_cutoff_breakfast ?? '07:00',
                'lunch' => $messModel->meal_cutoff_lunch ?? '11:00',
                'dinner' => $messModel->meal_cutoff_dinner ?? '18:00',
            ],
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/vacations
     * List all vacation requests for this mess (for managers to review).
     */
    public function listVacations(Request $request, string $mess): JsonResponse
    {
        $vacations = VacationRequest::whereHas('residency', function ($query) use ($mess) {
            $query->where('mess_id', $mess);
        })
            ->with(['residency.user:id,name,phone'])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['vacations' => $vacations]);
    }

    /**
     * POST /api/v1/residencies/{residency}/vacation — Submit vacation request
     */
    public function submitVacation(Request $request, string $residency): JsonResponse
    {
        $residencyModel = Residency::findOrFail($residency);

        if ($residencyModel->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'reason' => ['sometimes', 'nullable', 'string', 'max:200'],
        ]);

        $vacation = VacationRequest::create([
            'residency_id' => $residencyModel->id,
            ...$validated,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Vacation request submitted.',
            'vacation' => $vacation,
        ], 201);
    }

    /**
     * PATCH /api/v1/vacation/{vacation}/approve — Approve/reject vacation
     */
    public function approveVacation(Request $request, string $vacation): JsonResponse
    {
        $vacationModel = VacationRequest::findOrFail($vacation);

        $validated = $request->validate([
            'status' => ['required', 'in:approved,rejected'],
        ]);

        $vacationModel->update(['status' => $validated['status']]);

        return response()->json([
            'message' => "Vacation request {$validated['status']}.",
            'vacation' => $vacationModel,
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/meal-rate/today
     */
    public function todayRate(string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $rateInfo = $this->mealService->getLiveMealRate($messModel);

        return response()->json($rateInfo);
    }
}
