<?php

namespace App\Http\Controllers\Api\V1\Admin;

use App\Http\Controllers\Controller;
use App\Models\DailyMealLog;
use App\Models\ExpenseEntry;
use App\Models\Mess;
use App\Models\MonthlyBill;
use App\Models\Residency;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class SuperadminController extends Controller
{
    /**
     * GET /api/v1/admin/stats — SaaS platform-wide metrics
     */
    public function stats(): JsonResponse
    {
        $totalUsers = User::count();
        $totalMesses = Mess::count();
        $activeMesses = Mess::where('status', 'active')->count();
        $pendingMesses = Mess::where('status', 'pending')->count();
        $suspendedMesses = Mess::where('status', 'suspended')->count();
        $totalMealsLogged = DailyMealLog::where('is_on', true)->count();
        $totalExpenseVolume = (float) ExpenseEntry::sum('amount');
        $totalBillsIssued = (float) MonthlyBill::sum('total_payable');

        return response()->json([
            'total_users' => $totalUsers,
            'total_messes' => $totalMesses,
            'messes_by_status' => [
                'active' => $activeMesses,
                'pending' => $pendingMesses,
                'suspended' => $suspendedMesses,
            ],
            'total_meals_logged' => $totalMealsLogged,
            'total_expense_volume' => $totalExpenseVolume,
            'total_bills_issued' => $totalBillsIssued,
        ]);
    }

    /**
     * GET /api/v1/admin/messes — List all messes across the platform
     */
    public function messes(): JsonResponse
    {
        $messes = Mess::with(['owner:id,name,email,phone'])
            ->withCount(['residencies' => function ($query) {
                $query->where('status', 'active');
            }])
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['messes' => $messes]);
    }

    /**
     * PATCH /api/v1/admin/messes/{mess}/status — Approve, Suspend, Activate, or Deny mess
     */
    public function updateMessStatus(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $validated = $request->validate([
            'status' => ['required', 'in:active,pending,suspended,rejected'],
        ]);

        $messModel->update(['status' => $validated['status']]);

        return response()->json([
            'message' => "Mess status updated to {$validated['status']}.",
            'mess' => $messModel->fresh(['owner']),
        ]);
    }

    /**
     * GET /api/v1/admin/users — List all registered users
     */
    public function users(): JsonResponse
    {
        $users = User::with(['residencies.mess:id,name'])
            ->orderByDesc('created_at')
            ->limit(100)
            ->get();

        return response()->json(['users' => $users]);
    }

    /**
     * PATCH /api/v1/admin/users/{user}/suspend — Suspend or Reactivate a user
     */
    public function updateUserStatus(Request $request, string $user): JsonResponse
    {
        $userModel = User::findOrFail($user);

        // Prevent suspending oneself
        if ($userModel->id === $request->user()->id) {
            return response()->json(['message' => 'You cannot suspend your own superadmin account.'], 400);
        }

        $validated = $request->validate([
            'is_suspended' => ['required', 'boolean'],
        ]);

        $userModel->update(['is_suspended' => $validated['is_suspended']]);

        // If suspending, revoke all tokens
        if ($validated['is_suspended']) {
            $userModel->tokens()->delete();
        }

        return response()->json([
            'message' => $validated['is_suspended'] ? 'User has been suspended.' : 'User has been reactivated.',
            'user' => $userModel->fresh(),
        ]);
    }

    /**
     * POST /api/v1/admin/impersonate/{mess} — Enter any mess as Owner
     */
    public function impersonateMess(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::with('owner')->findOrFail($mess);
        $owner = $messModel->owner;

        if (! $owner) {
            return response()->json(['message' => 'This mess has no registered owner.'], 404);
        }

        // Generate impersonation token for the mess owner
        $token = $owner->createToken('superadmin-impersonation')->plainTextToken;

        return response()->json([
            'message' => "Impersonating {$messModel->name} as Owner ({$owner->name}).",
            'mess' => $messModel,
            'owner' => $owner,
            'token' => $token,
        ]);
    }
}
