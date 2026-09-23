<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Notice;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NoticeController extends Controller
{
    /**
     * POST /api/v1/messes/{mess}/notices
     */
    public function store(Request $request, string $mess): JsonResponse
    {
        $validated = $request->validate([
            'title' => ['required', 'string', 'max:150'],
            'body' => ['required', 'string'],
            'pinned' => ['sometimes', 'boolean'],
        ]);

        $notice = Notice::create([
            'mess_id' => $mess,
            ...$validated,
            'posted_by' => $request->user()->id,
        ]);

        return response()->json([
            'message' => 'Notice posted.',
            'notice' => $notice,
        ], 201);
    }

    /**
     * GET /api/v1/messes/{mess}/notices
     */
    public function index(string $mess): JsonResponse
    {
        $notices = Notice::where('mess_id', $mess)
            ->with('postedByUser:id,name')
            ->orderByDesc('pinned')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['notices' => $notices]);
    }
}
