<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Complaint;
use App\Models\Residency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ComplaintController extends Controller
{
    /**
     * POST /api/v1/residencies/{residency}/complaints — File complaint
     */
    public function store(Request $request, string $residency): JsonResponse
    {
        $residencyModel = Residency::findOrFail($residency);

        if ($residencyModel->user_id !== $request->user()->id) {
            return response()->json(['message' => 'Unauthorized.'], 403);
        }

        $validated = $request->validate([
            'subject' => ['required', 'string', 'max:150'],
            'description' => ['required', 'string'],
        ]);

        $complaint = Complaint::create([
            'residency_id' => $residencyModel->id,
            'mess_id' => $residencyModel->mess_id,
            ...$validated,
            'status' => 'open',
        ]);

        return response()->json([
            'message' => 'Complaint filed.',
            'complaint' => $complaint,
        ], 201);
    }

    /**
     * GET /api/v1/messes/{mess}/complaints
     */
    public function index(string $mess): JsonResponse
    {
        $complaints = Complaint::where('mess_id', $mess)
            ->with('residency.user:id,name')
            ->orderByDesc('created_at')
            ->get();

        return response()->json(['complaints' => $complaints]);
    }

    /**
     * PATCH /api/v1/complaints/{complaint}
     */
    public function update(Request $request, string $complaint): JsonResponse
    {
        $complaintModel = Complaint::findOrFail($complaint);

        $validated = $request->validate([
            'status' => ['sometimes', 'in:open,in_progress,resolved,closed'],
            'resolved_note' => ['sometimes', 'nullable', 'string'],
        ]);

        $complaintModel->update($validated);

        return response()->json([
            'message' => 'Complaint updated.',
            'complaint' => $complaintModel->fresh(),
        ]);
    }
}
