<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use App\Models\BookingApplication;
use App\Models\Listing;
use App\Models\Mess;
use App\Models\Notification;
use App\Models\Residency;
use App\Models\ResidentProfile;
use App\Models\WaitingList;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BookingApplicationController extends Controller
{
    /**
     * POST /api/v1/marketplace/listings/{id}/apply
     * Seeker applies with desired move-in date and KYC profile (#29)
     */
    public function apply(Request $request, string $id): JsonResponse
    {
        $listing = Listing::with('mess')->findOrFail($id);
        $user = $request->user();

        // Check if already applied and pending
        $existing = BookingApplication::where('listing_id', $listing->id)
            ->where('user_id', $user->id)
            ->where('status', 'pending')
            ->first();

        if ($existing) {
            return response()->json([
                'message' => 'You already have a pending booking application for this listing.',
                'application' => $existing,
            ], 422);
        }

        $validated = $request->validate([
            'desired_move_in_date' => ['required', 'date'],
            'applicant_note' => ['sometimes', 'nullable', 'string', 'max:1000'],
            // Optional inline KYC update
            'nid_number' => ['sometimes', 'nullable', 'string', 'max:50'],
            'profession' => ['sometimes', 'nullable', 'string', 'max:100'],
            'blood_group' => ['sometimes', 'nullable', 'in:A+,A-,B+,B-,AB+,AB-,O+,O-'],
            'emergency_contact_name' => ['sometimes', 'nullable', 'string', 'max:120'],
            'emergency_contact_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
        ]);

        $application = BookingApplication::create([
            'listing_id' => $listing->id,
            'user_id' => $user->id,
            'desired_move_in_date' => $validated['desired_move_in_date'],
            'applicant_note' => $validated['applicant_note'] ?? null,
            'nid_number' => $validated['nid_number'] ?? null,
            'profession' => $validated['profession'] ?? null,
            'blood_group' => $validated['blood_group'] ?? null,
            'emergency_contact_name' => $validated['emergency_contact_name'] ?? null,
            'emergency_contact_phone' => $validated['emergency_contact_phone'] ?? null,
            'status' => 'pending',
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
                'type' => 'booking_application_received',
                'title' => 'New Booking Application',
                'body' => "{$user->name} applied for vacancy \"{$listing->title}\".",
                'created_at' => now(),
            ]);
        }

        return response()->json([
            'message' => 'Application submitted successfully! The mess manager will review your request.',
            'application' => $application->load('listing'),
        ], 201);
    }

    /**
     * GET /api/v1/booking-applications/my — User's applications
     */
    public function myApplications(Request $request): JsonResponse
    {
        $user = $request->user();

        $applications = BookingApplication::with([
            'listing.mess:id,name,city,address',
            'listing.photos',
            'assignedBed',
        ])
            ->where('user_id', $user->id)
            ->latest()
            ->paginate(15);

        return response()->json($applications);
    }

    /**
     * GET /api/v1/messes/{mess}/applications — Manager view (#33)
     */
    public function messApplications(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $applications = BookingApplication::with([
            'listing:id,title,rent_amount,bed_id',
            'user:id,name,email,phone,avatar_url',
            'user.profile',
            'assignedBed',
        ])
            ->whereHas('listing', fn ($q) => $q->where('mess_id', $messModel->id))
            ->latest()
            ->paginate(20);

        return response()->json($applications);
    }

    /**
     * POST /api/v1/booking-applications/{id}/decision (#33, #34)
     */
    public function decide(Request $request, string $id): JsonResponse
    {
        $application = BookingApplication::with(['listing.mess', 'user'])->findOrFail($id);
        $user = $request->user();

        // Check permission
        $isAuthorized = $user->is_superadmin ||
            Residency::where('user_id', $user->id)
                ->where('mess_id', $application->listing->mess_id)
                ->whereIn('role', ['owner', 'manager'])
                ->where('status', 'active')
                ->exists();

        if (!$isAuthorized) {
            return response()->json(['message' => 'Unauthorized to decide on this application.'], 403);
        }

        $validated = $request->validate([
            'decision' => ['required', 'in:accepted,rejected'],
            'manager_remarks' => ['sometimes', 'nullable', 'string'],
            'bed_id' => ['sometimes', 'nullable', 'uuid', 'exists:beds,id'],
        ]);

        return DB::transaction(function () use ($application, $validated) {
            if ($validated['decision'] === 'rejected') {
                $application->update([
                    'status' => 'rejected',
                    'manager_remarks' => $validated['manager_remarks'] ?? null,
                ]);

                Notification::create([
                    'user_id' => $application->user_id,
                    'mess_id' => $application->listing->mess_id,
                    'type' => 'booking_application_rejected',
                    'title' => 'Application Update',
                    'body' => "Your application for \"{$application->listing->title}\" was not accepted.",
                    'created_at' => now(),
                ]);

                return response()->json([
                    'message' => 'Application rejected.',
                    'application' => $application->fresh(),
                ]);
            }

            // Accepted flow: Auto Bed Assignment (#34)
            $bedId = $validated['bed_id'] ?? $application->listing->bed_id;

            if (!$bedId) {
                // Find first vacant bed in mess
                $vacantBed = Bed::whereHas('room.floor', fn ($q) => $q->where('mess_id', $application->listing->mess_id))
                    ->where('status', 'empty')
                    ->first();

                if ($vacantBed) {
                    $bedId = $vacantBed->id;
                }
            }

            $application->update([
                'status' => 'accepted',
                'manager_remarks' => $validated['manager_remarks'] ?? null,
                'assigned_bed_id' => $bedId,
            ]);

            // Create or activate Residency
            $residency = Residency::create([
                'user_id' => $application->user_id,
                'mess_id' => $application->listing->mess_id,
                'bed_id' => $bedId,
                'role' => 'resident',
                'status' => 'active',
                'joined_at' => $application->desired_move_in_date ?? now()->toDateString(),
            ]);

            // If application contained KYC data, create ResidentProfile
            if ($application->nid_number || $application->profession || $application->emergency_contact_phone) {
                ResidentProfile::create([
                    'residency_id' => $residency->id,
                    'nid_number' => $application->nid_number,
                    'profession_or_institution' => $application->profession,
                    'blood_group' => $application->blood_group,
                    'emergency_contact_name' => $application->emergency_contact_name,
                    'emergency_contact_phone' => $application->emergency_contact_phone,
                ]);
            }

            // Mark Bed occupied (which also auto-hides listing if linked via Bed observer! #28)
            if ($bedId) {
                $bed = Bed::find($bedId);
                if ($bed) {
                    $bed->markOccupied();
                }
            }

            // Also explicitly ensure listing is inactive
            $application->listing->update(['is_active' => false]);

            // Notify applicant
            Notification::create([
                'user_id' => $application->user_id,
                'mess_id' => $application->listing->mess_id,
                'type' => 'booking_application_accepted',
                'title' => '🎉 Application Approved!',
                'body' => "Congratulations! Your booking for {$application->listing->mess->name} has been approved. You are now an active resident.",
                'created_at' => now(),
            ]);

            return response()->json([
                'message' => 'Application accepted and resident onboarded successfully.',
                'application' => $application->fresh(['assignedBed']),
                'residency' => $residency,
            ]);
        });
    }

    /**
     * POST /api/v1/messes/{mess}/waiting-list (#35 Waiting List)
     */
    public function joinWaitingList(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $user = $request->user();

        $validated = $request->validate([
            'preferred_room_type' => ['sometimes', 'nullable', 'string', 'max:50'],
            'max_budget' => ['sometimes', 'nullable', 'numeric', 'min:0'],
            'note' => ['sometimes', 'nullable', 'string', 'max:500'],
        ]);

        $waiting = WaitingList::updateOrCreate(
            [
                'mess_id' => $messModel->id,
                'user_id' => $user->id,
            ],
            [
                'preferred_room_type' => $validated['preferred_room_type'] ?? null,
                'max_budget' => $validated['max_budget'] ?? null,
                'note' => $validated['note'] ?? null,
            ]
        );

        return response()->json([
            'message' => 'You have joined the waiting list! You will be notified as soon as a matching bed opens up.',
            'waiting_list' => $waiting,
        ], 201);
    }

    /**
     * GET /api/v1/messes/{mess}/waiting-list (#35)
     */
    public function messWaitingList(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $waiting = WaitingList::with('user:id,name,email,phone')
            ->where('mess_id', $messModel->id)
            ->latest()
            ->get();

        return response()->json($waiting);
    }
}
