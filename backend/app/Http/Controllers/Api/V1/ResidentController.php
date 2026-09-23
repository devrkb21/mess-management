<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use App\Models\Invite;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\ResidentProfile;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class ResidentController extends Controller
{
    /**
     * POST /api/v1/messes/{mess}/invites — Generate invite link
     */
    public function createInvite(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $validated = $request->validate([
            'bed_id' => ['sometimes', 'nullable', 'uuid', 'exists:beds,id'],
            'expires_in_hours' => ['sometimes', 'integer', 'min:1', 'max:720'],
        ]);

        $expiresInHours = $validated['expires_in_hours'] ?? 72;

        $invite = Invite::create([
            'mess_id' => $messModel->id,
            'bed_id' => $validated['bed_id'] ?? null,
            'code' => strtoupper(Str::random(8)),
            'status' => 'pending',
            'expires_at' => now()->addHours($expiresInHours),
            'created_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Invite created successfully.',
            'invite' => $invite,
            'invite_link' => url("/api/v1/invites/{$invite->code}"),
        ], 201);
    }

    /**
     * POST /api/v1/invites/{code}/accept — Applicant accepts invite + submits profile
     */
    public function acceptInvite(Request $request, string $code): JsonResponse
    {
        $invite = Invite::where('code', $code)
            ->where('status', 'pending')
            ->firstOrFail();

        if ($invite->isExpired()) {
            return response()->json(['message' => 'This invite has expired.'], 410);
        }

        $user = $request->user();

        // Check if user already has an active residency in this mess
        $existingResidency = Residency::where('user_id', $user->id)
            ->where('mess_id', $invite->mess_id)
            ->whereIn('status', ['active', 'invited'])
            ->first();

        if ($existingResidency) {
            return response()->json(['message' => 'You are already a member of this mess.'], 409);
        }

        // Validate profile data
        $validated = $request->validate([
            'nid_number' => ['sometimes', 'nullable', 'string', 'max:30'],
            'profession_or_institution' => ['sometimes', 'nullable', 'string', 'max:150'],
            'blood_group' => ['sometimes', 'nullable', 'string', 'max:5'],
            'emergency_contact_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'emergency_contact_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
        ]);

        // Find a bed — either pre-selected in invite or auto-assign first empty bed
        $bedId = $invite->bed_id;
        if (! $bedId) {
            $emptyBed = Bed::whereHas('room.floor', function ($query) use ($invite) {
                $query->where('mess_id', $invite->mess_id);
            })->where('status', 'empty')->first();

            $bedId = $emptyBed?->id;
        }

        // Create residency (status: invited — needs manager approval)
        $residency = Residency::create([
            'user_id' => $user->id,
            'mess_id' => $invite->mess_id,
            'bed_id' => $bedId,
            'role' => 'resident',
            'status' => 'invited',
        ]);

        // Create profile
        ResidentProfile::create([
            'residency_id' => $residency->id,
            ...$validated,
        ]);

        // Update invite
        $invite->update([
            'accepted_by_user_id' => $user->id,
        ]);

        return response()->json([
            'message' => 'Invite accepted. Waiting for manager approval.',
            'residency' => $residency->load('profile'),
        ]);
    }

    /**
     * POST /api/v1/invites/{code}/approve — Manager approves applicant
     */
    public function approveInvite(Request $request, string $code): JsonResponse
    {
        $invite = Invite::where('code', $code)->firstOrFail();

        if (! $invite->accepted_by_user_id) {
            return response()->json(['message' => 'No applicant has accepted this invite yet.'], 400);
        }

        $residency = Residency::where('user_id', $invite->accepted_by_user_id)
            ->where('mess_id', $invite->mess_id)
            ->where('status', 'invited')
            ->firstOrFail();

        // Activate residency
        $residency->update([
            'status' => 'active',
            'joined_at' => now()->toDateString(),
        ]);

        // Mark bed as occupied
        if ($residency->bed_id) {
            Bed::where('id', $residency->bed_id)->update(['status' => 'occupied']);
        }

        // Mark invite as accepted
        $invite->update(['status' => 'accepted']);

        return response()->json([
            'message' => 'Resident approved and activated.',
            'residency' => $residency->load(['user:id,name,email,phone', 'bed', 'profile']),
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/residents — List all residents
     */
    public function index(string $mess): JsonResponse
    {
        $residents = Residency::where('mess_id', $mess)
            ->with(['user:id,name,email,phone,avatar_url', 'bed:id,label', 'profile'])
            ->orderByRaw("CASE WHEN status = 'active' THEN 0 WHEN status = 'on_leave' THEN 1 WHEN status = 'invited' THEN 2 ELSE 3 END")
            ->get();

        return response()->json(['residents' => $residents]);
    }

    /**
     * GET /api/v1/residencies/{residency} — Single resident detail
     */
    public function show(Request $request, string $residency): JsonResponse
    {
        $residencyModel = Residency::with(['user', 'bed.room.floor', 'profile', 'mess:id,name'])
            ->findOrFail($residency);

        // Access control: only self, owner, or manager can see full profile
        $currentUser = $request->user();
        $isOwnerOrManager = Residency::where('user_id', $currentUser->id)
            ->where('mess_id', $residencyModel->mess_id)
            ->whereIn('role', ['owner', 'manager'])
            ->whereIn('status', ['active', 'on_leave'])
            ->exists();

        $isSelf = $residencyModel->user_id === $currentUser->id;

        if (! $isSelf && ! $isOwnerOrManager) {
            // Hide sensitive profile data
            $residencyModel->unsetRelation('profile');
        }

        return response()->json(['residency' => $residencyModel]);
    }

    /**
     * GET /api/v1/invites/{code} — Preview invite details before accepting
     */
    public function showInvite(string $code): JsonResponse
    {
        $invite = Invite::where('code', $code)
            ->with(['mess:id,name,city,address,gender_policy', 'bed:id,label'])
            ->firstOrFail();

        if ($invite->isExpired()) {
            return response()->json([
                'message' => 'This invite has expired.',
                'expired' => true,
                'invite' => $invite,
            ], 410);
        }

        if ($invite->status === 'accepted') {
            return response()->json([
                'message' => 'This invite has already been used.',
                'used' => true,
                'invite' => $invite,
            ], 410);
        }

        return response()->json(['invite' => $invite]);
    }

    /**
     * POST /api/v1/residencies/{residency}/approve — 1-click approve applicant by Manager
     */
    public function approveResidency(Request $request, string $residency): JsonResponse
    {
        $residencyModel = Residency::findOrFail($residency);

        $isManager = Residency::where('user_id', $request->user()->id)
            ->where('mess_id', $residencyModel->mess_id)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->exists();

        if (! $isManager) {
            return response()->json(['message' => 'Unauthorized. Manager role required.'], 403);
        }

        $validated = $request->validate([
            'bed_id' => ['sometimes', 'nullable', 'uuid', 'exists:beds,id'],
        ]);

        $bedId = $validated['bed_id'] ?? $residencyModel->bed_id;

        // If still no bed assigned, find first available empty bed
        if (! $bedId) {
            $emptyBed = Bed::whereHas('room.floor', function ($query) use ($residencyModel) {
                $query->where('mess_id', $residencyModel->mess_id);
            })->where('status', 'empty')->first();

            $bedId = $emptyBed?->id;
        }

        $residencyModel->update([
            'status' => 'active',
            'bed_id' => $bedId,
            'joined_at' => now()->toDateString(),
        ]);

        if ($bedId) {
            Bed::where('id', $bedId)->update(['status' => 'occupied']);
        }

        // Mark associated invite as accepted
        Invite::where('mess_id', $residencyModel->mess_id)
            ->where('accepted_by_user_id', $residencyModel->user_id)
            ->where('status', 'pending')
            ->update(['status' => 'accepted']);

        return response()->json([
            'message' => 'Resident approved and activated.',
            'residency' => $residencyModel->fresh()->load(['user:id,name,email,phone', 'bed', 'profile']),
        ]);
    }
}
