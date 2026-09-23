<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Models\Mess;
use App\Models\Notification;
use App\Models\Residency;
use App\Models\VisitSchedule;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class VisitScheduleController extends Controller
{
    /**
     * POST /api/v1/marketplace/listings/{id}/visits — Schedule a physical visit (#32)
     */
    public function schedule(Request $request, string $id): JsonResponse
    {
        $listing = Listing::with('mess')->findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'visit_date' => ['required', 'date', 'after_or_equal:today'],
            'time_slot' => ['required', 'string', 'max:50'],
            'notes' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $visit = VisitSchedule::create([
            'listing_id' => $listing->id,
            'user_id' => $user->id,
            'visit_date' => $validated['visit_date'],
            'time_slot' => $validated['time_slot'],
            'notes' => $validated['notes'] ?? null,
            'status' => 'requested',
        ]);

        // Notify mess managers
        $managerResidencies = Residency::where('mess_id', $listing->mess_id)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->get();

        foreach ($managerResidencies as $mgr) {
            Notification::create([
                'user_id' => $mgr->user_id,
                'mess_id' => $listing->mess_id,
                'type' => 'visit_requested',
                'title' => 'New Mess Visit Requested',
                'body' => "{$user->name} requested a visit for {$validated['visit_date']} ({$validated['time_slot']}).",
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Visit requested successfully! The mess manager will confirm your slot.',
            'visit' => $visit->load('listing'),
        ], 201);
    }

    /**
     * GET /api/v1/visits/my — User's visits
     */
    public function myVisits(Request $request): JsonResponse
    {
        $user = $request->user();

        $visits = VisitSchedule::with([
            'listing.mess:id,name,address,city,owner_id',
            'listing.mess.owner:id,name,phone',
            'listing.photos',
        ])
            ->where('user_id', $user->id)
            ->latest('visit_date')
            ->paginate(15);

        return response()->json($visits);
    }

    /**
     * GET /api/v1/messes/{mess}/visits — Manager view
     */
    public function messVisits(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $visits = VisitSchedule::with([
            'listing:id,title,rent_amount',
            'user:id,name,email,phone,avatar_url',
        ])
            ->whereHas('listing', fn ($q) => $q->where('mess_id', $messModel->id))
            ->latest('visit_date')
            ->paginate(20);

        return response()->json($visits);
    }

    /**
     * PATCH /api/v1/visits/{id}/status — Update visit status
     */
    public function updateStatus(Request $request, string $id): JsonResponse
    {
        $visit = VisitSchedule::with(['listing.mess', 'user'])->findOrFail($id);
        $user = $request->user();

        $isAuthorized = $user->is_superadmin ||
            Residency::where('user_id', $user->id)
                ->where('mess_id', $visit->listing->mess_id)
                ->whereIn('role', ['owner', 'manager'])
                ->where('status', 'active')
                ->exists();

        if (!$isAuthorized && $user->id !== $visit->user_id) {
            return response()->json(['message' => 'Unauthorized to update this visit.'], 403);
        }

        $validated = $request->validate([
            'status' => ['required', 'in:confirmed,rescheduled,cancelled,completed'],
            'manager_notes' => ['sometimes', 'nullable', 'string'],
        ]);

        $visit->update([
            'status' => $validated['status'],
            'manager_notes' => $validated['manager_notes'] ?? $visit->manager_notes,
        ]);

        // Notify resident/seeker if manager updated
        if ($user->id !== $visit->user_id) {
            Notification::create([
                'user_id' => $visit->user_id,
                'mess_id' => $visit->listing->mess_id,
                'type' => 'visit_status_updated',
                'title' => 'Visit Status: ' . ucfirst($validated['status']),
                'body' => "Your mess visit for {$visit->visit_date} has been {$validated['status']}.",
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Visit status updated successfully.',
            'visit' => $visit->fresh(),
        ]);
    }
}
