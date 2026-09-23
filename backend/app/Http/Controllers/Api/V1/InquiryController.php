<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\InquiryMessage;
use App\Models\InquiryThread;
use App\Models\Listing;
use App\Models\Notification;
use App\Models\Residency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class InquiryController extends Controller
{
    /**
     * GET /api/v1/inquiries — List active chat threads for current user
     */
    public function threads(Request $request): JsonResponse
    {
        $user = $request->user();

        // Mess IDs user manages
        $managedMessIds = Residency::where('user_id', $user->id)
            ->whereIn('role', ['owner', 'manager'])
            ->where('status', 'active')
            ->pluck('mess_id');

        $threads = InquiryThread::with([
            'listing:id,mess_id,title,rent_amount',
            'listing.mess:id,name',
            'listing.photos',
            'applicant:id,name,avatar_url',
            'manager:id,name,avatar_url',
            'messages' => fn ($q) => $q->latest()->limit(1),
        ])
            ->where(function ($q) use ($user, $managedMessIds) {
                $q->where('applicant_id', $user->id)
                  ->orWhere('manager_id', $user->id)
                  ->orWhereHas('listing', fn ($lq) => $lq->whereIn('mess_id', $managedMessIds));
            })
            ->latest('updated_at')
            ->paginate(20);

        return response()->json($threads);
    }

    /**
     * GET /api/v1/inquiries/{id} — View thread messages
     */
    public function showThread(Request $request, string $id): JsonResponse
    {
        $user = $request->user();

        $thread = InquiryThread::with([
            'listing.mess:id,name,address,city',
            'listing.photos',
            'applicant:id,name,avatar_url,phone',
            'manager:id,name,avatar_url,phone',
            'messages.sender:id,name,avatar_url',
        ])->findOrFail($id);

        // Verify participant
        $isParticipant = $thread->applicant_id === $user->id ||
            $thread->manager_id === $user->id ||
            $user->is_superadmin ||
            Residency::where('user_id', $user->id)
                ->where('mess_id', $thread->listing->mess_id)
                ->whereIn('role', ['owner', 'manager'])
                ->where('status', 'active')
                ->exists();

        if (!$isParticipant) {
            return response()->json(['message' => 'Unauthorized to view this thread.'], 403);
        }

        // Mark incoming messages as read
        InquiryMessage::where('thread_id', $thread->id)
            ->where('sender_id', '!=', $user->id)
            ->whereNull('read_at')
            ->update(['read_at' => now()]);

        return response()->json($thread);
    }

    /**
     * POST /api/v1/marketplace/listings/{id}/inquire — Start or continue chat from listing
     */
    public function startOrSendMessage(Request $request, string $id): JsonResponse
    {
        $listing = Listing::with('mess.owner')->findOrFail($id);
        $user = $request->user();

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
            'subject' => ['sometimes', 'nullable', 'string', 'max:150'],
        ]);

        // Find existing thread between this applicant and listing
        $thread = InquiryThread::firstOrCreate(
            [
                'listing_id' => $listing->id,
                'applicant_id' => $user->id,
            ],
            [
                'manager_id' => $listing->mess->owner_id,
                'subject' => $validated['subject'] ?? "Inquiry for {$listing->title}",
            ]
        );

        $msg = InquiryMessage::create([
            'thread_id' => $thread->id,
            'sender_id' => $user->id,
            'message' => $validated['message'],
        ]);

        $thread->touch();

        // Notify recipient (manager)
        Notification::create([
            'user_id' => $thread->manager_id,
            'mess_id' => $listing->mess_id,
            'type' => 'inquiry_message',
            'title' => 'New Inquiry Message',
            'body' => "{$user->name}: \"{$msg->message}\"",
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Message sent successfully.',
            'thread' => $thread->load(['messages.sender:id,name,avatar_url', 'listing']),
            'new_message' => $msg->load('sender:id,name,avatar_url'),
        ], 201);
    }

    /**
     * POST /api/v1/inquiries/{id}/messages — Reply in existing thread
     */
    public function reply(Request $request, string $id): JsonResponse
    {
        $thread = InquiryThread::with('listing.mess')->findOrFail($id);
        $user = $request->user();

        // Check participant
        $isParticipant = $thread->applicant_id === $user->id ||
            $thread->manager_id === $user->id ||
            $user->is_superadmin ||
            Residency::where('user_id', $user->id)
                ->where('mess_id', $thread->listing->mess_id)
                ->whereIn('role', ['owner', 'manager'])
                ->where('status', 'active')
                ->exists();

        if (!$isParticipant) {
            return response()->json(['message' => 'Unauthorized to reply in this thread.'], 403);
        }

        $validated = $request->validate([
            'message' => ['required', 'string', 'max:2000'],
        ]);

        $msg = InquiryMessage::create([
            'thread_id' => $thread->id,
            'sender_id' => $user->id,
            'message' => $validated['message'],
        ]);

        $thread->touch();

        // Notify recipient
        $recipientId = ($user->id === $thread->applicant_id) ? $thread->manager_id : $thread->applicant_id;
        Notification::create([
            'user_id' => $recipientId,
            'mess_id' => $thread->listing->mess_id,
            'type' => 'inquiry_message',
            'title' => 'New Reply from ' . $user->name,
            'body' => $msg->message,
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Reply sent.',
            'new_message' => $msg->load('sender:id,name,avatar_url'),
        ], 201);
    }
}
