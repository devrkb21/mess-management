<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    /**
     * GET /api/v1/notifications
     */
    public function index(Request $request): JsonResponse
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->orderByDesc('created_at')
            ->limit(50)
            ->get();

        $unreadCount = Notification::where('user_id', $request->user()->id)
            ->unread()
            ->count();

        return response()->json([
            'unread_count' => $unreadCount,
            'notifications' => $notifications,
        ]);
    }

    /**
     * PATCH /api/v1/notifications/{notification}/read
     */
    public function markRead(Request $request, string $notification): JsonResponse
    {
        $notif = Notification::where('id', $notification)
            ->where('user_id', $request->user()->id)
            ->firstOrFail();

        $notif->markAsRead();

        return response()->json(['message' => 'Marked as read.']);
    }
}
