<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use App\Models\LeaveClearance;
use App\Models\MonthlyBill;
use App\Models\Residency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class LeaveController extends Controller
{
    /**
     * POST /api/v1/residencies/{residency}/leave — Submit leave notice
     */
    public function submitLeave(Request $request, string $residency): JsonResponse
    {
        $residencyModel = Residency::findOrFail($residency);

        if ($residencyModel->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'planned_leave_date' => ['required', 'date', 'after_or_equal:today'],
        ]);

        // Calculate final dues (sum of all unpaid bills)
        $totalDues = MonthlyBill::where('residency_id', $residencyModel->id)
            ->whereIn('status', ['issued', 'partially_paid', 'overdue'])
            ->get()
            ->sum(fn ($bill) => $bill->remainingDue());

        $depositRefund = max(0, (float) $residencyModel->security_deposit_amount - $totalDues);

        $clearance = LeaveClearance::create([
            'residency_id' => $residencyModel->id,
            'notice_date' => now()->toDateString(),
            'planned_leave_date' => $validated['planned_leave_date'],
            'final_dues' => $totalDues,
            'deposit_refunded' => $depositRefund,
            'status' => 'pending',
        ]);

        return response()->json([
            'message' => 'Leave notice submitted.',
            'clearance' => $clearance,
        ], 201);
    }

    /**
     * POST /api/v1/leave/{leave}/clear — Finalize clearance (Manager)
     */
    public function finalizeClearance(Request $request, string $leave): JsonResponse
    {
        $clearance = LeaveClearance::findOrFail($leave);
        $residency = $clearance->residency;

        // Mark residency as left
        $residency->update([
            'status' => 'left',
            'left_at' => now()->toDateString(),
        ]);

        // Free up the bed
        if ($residency->bed_id) {
            Bed::where('id', $residency->bed_id)->update(['status' => 'empty']);
        }

        // Mark clearance as cleared
        $clearance->update(['status' => 'cleared']);

        return response()->json([
            'message' => 'Clearance finalized. Resident has left the mess.',
            'clearance' => $clearance->fresh(),
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/leaves — List all leave requests in this mess for manager review
     */
    public function listMessLeaves(Request $request, string $mess): JsonResponse
    {
        $leaves = LeaveClearance::whereHas('residency', function ($query) use ($mess) {
            $query->where('mess_id', $mess);
        })
            ->with([
                'residency.user:id,name,phone,email',
                'residency.bed:id,label',
            ])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['leaves' => $leaves]);
    }
}
