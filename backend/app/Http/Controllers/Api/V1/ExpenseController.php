<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\BazarSchedule;
use App\Models\ExpenseEntry;
use App\Models\FixedBill;
use App\Models\Mess;
use App\Models\Residency;
use App\Services\DebtSettlementService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ExpenseController extends Controller
{
    /**
     * POST /api/v1/messes/{mess}/expenses — Log market expense
     * Authorized if user is owner/manager OR if user is scheduled for bazar duty on that date!
     */
    public function storeExpense(Request $request, string $mess): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['required', 'string', 'max:200'],
            'receipt_photo_url' => ['sometimes', 'nullable', 'string'],
        ]);

        $currentUser = $request->user();
        $dateStr = Carbon::parse($validated['date'])->toDateString();

        // 1. Check if user is owner or manager in this mess
        $isManager = Residency::where('user_id', $currentUser->id)
            ->where('mess_id', $mess)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->exists();

        // 2. Check if user is assigned bazar duty on this date
        $isAssignedBazar = BazarSchedule::where('mess_id', $mess)
            ->whereDate('date', $dateStr)
            ->whereHas('assignedResidency', function ($query) use ($currentUser) {
                $query->where('user_id', $currentUser->id)->where('status', 'active');
            })
            ->exists();

        if (! $isManager && ! $isAssignedBazar) {
            return response()->json([
                'message' => 'Unauthorized. You are not assigned to do bazar on this date, and you are not a manager.',
            ], 403);
        }

        $expense = ExpenseEntry::create([
            'mess_id' => $mess,
            ...$validated,
            'entered_by' => $currentUser->id,
        ]);

        // Mark schedule as completed if exists
        BazarSchedule::where('mess_id', $mess)
            ->whereDate('date', $dateStr)
            ->update(['status' => 'completed']);

        return response()->json([
            'message' => 'Expense logged successfully.',
            'expense' => $expense->load('enteredByUser:id,name'),
        ], 201);
    }

    /**
     * GET /api/v1/messes/{mess}/expenses?month=YYYY-MM
     */
    public function listExpenses(Request $request, string $mess): JsonResponse
    {
        $month = $request->query('month', now()->format('Y-m'));
        $startDate = Carbon::parse($month . '-01');
        $endDate = $startDate->copy()->endOfMonth();

        $expenses = ExpenseEntry::where('mess_id', $mess)
            ->whereBetween('date', [$startDate, $endDate])
            ->with('enteredByUser:id,name')
            ->orderBy('date', 'desc')
            ->get();

        $total = $expenses->sum('amount');

        return response()->json([
            'month' => $month,
            'total' => (float) $total,
            'expenses' => $expenses,
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/bazar-schedules?month=YYYY-MM
     * Returns the monthly bazar duty roster for all members to see.
     */
    public function getBazarSchedules(Request $request, string $mess): JsonResponse
    {
        $month = $request->query('month', now()->format('Y-m'));
        $startDate = Carbon::parse($month . '-01');
        $endDate = $startDate->copy()->endOfMonth();

        $schedules = BazarSchedule::where('mess_id', $mess)
            ->whereBetween('date', [$startDate, $endDate])
            ->with(['assignedResidency.user:id,name,phone', 'createdByUser:id,name'])
            ->orderBy('date')
            ->get();

        return response()->json([
            'month' => $month,
            'schedules' => $schedules,
        ]);
    }

    /**
     * POST /api/v1/messes/{mess}/bazar-schedules
     * Manager assigns bazar duty to a resident for a given date.
     */
    public function assignBazarSchedule(Request $request, string $mess): JsonResponse
    {
        $validated = $request->validate([
            'date' => ['required', 'date'],
            'assigned_residency_id' => ['required', 'uuid', 'exists:residencies,id'],
            'note' => ['sometimes', 'nullable', 'string', 'max:150'],
        ]);

        $dateStr = Carbon::parse($validated['date'])->toDateString();

        $schedule = BazarSchedule::updateOrCreate(
            [
                'mess_id' => $mess,
                'date' => $dateStr,
                'assigned_residency_id' => $validated['assigned_residency_id'],
            ],
            [
                'note' => $validated['note'] ?? null,
                'status' => 'scheduled',
                'created_by' => $request->user()->id,
            ]
        );

        return response()->json([
            'message' => 'Bazar duty assigned successfully.',
            'schedule' => $schedule->load('assignedResidency.user:id,name'),
        ], 201);
    }

    /**
     * DELETE /api/v1/bazar-schedules/{schedule}
     * Remove a scheduled bazar duty.
     */
    public function deleteBazarSchedule(string $schedule): JsonResponse
    {
        $scheduleModel = BazarSchedule::findOrFail($schedule);
        $scheduleModel->delete();

        return response()->json(['message' => 'Bazar schedule removed.']);
    }

    /**
     * POST /api/v1/messes/{mess}/fixed-bills — Add fixed bill
     */
    public function storeFixedBill(Request $request, string $mess): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:100'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'billing_month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
            'split_method' => ['sometimes', 'in:equal,prorated'],
        ]);

        $bill = FixedBill::create([
            'mess_id' => $mess,
            ...$validated,
        ]);

        return response()->json([
            'message' => 'Fixed bill added.',
            'fixed_bill' => $bill,
        ], 201);
    }

    /**
     * GET /api/v1/messes/{mess}/settlements?month=YYYY-MM
     * Minimum debt settlement algorithm across all members.
     */
    public function getSettlements(Request $request, string $mess, DebtSettlementService $settlementService): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $month = $request->query('month', now()->format('Y-m'));

        $data = $settlementService->calculateSettlements($messModel, $month);

        return response()->json($data);
    }
}
