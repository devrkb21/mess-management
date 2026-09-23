<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Mess;
use App\Models\Residency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MessController extends Controller
{
    /**
     * POST /api/v1/messes — Create a new mess
     * The creator automatically becomes the Owner.
     */
    public function store(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:150'],
            'address' => ['required', 'string'],
            'city' => ['required', 'string', 'max:80'],
            'gender_policy' => ['required', 'in:male,female,mixed'],
            'meal_cutoff_breakfast' => ['sometimes', 'date_format:H:i'],
            'meal_cutoff_lunch' => ['sometimes', 'date_format:H:i'],
            'meal_cutoff_dinner' => ['sometimes', 'date_format:H:i'],
            'bill_split_default' => ['sometimes', 'in:equal,prorated'],
        ]);

        $mess = Mess::create([
            ...$validated,
            'owner_id' => $request->user()->id,
        ]);

        // Create owner residency automatically
        Residency::create([
            'user_id' => $request->user()->id,
            'mess_id' => $mess->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now()->toDateString(),
        ]);

        return response()->json([
            'message' => 'Mess created successfully.',
            'mess' => $mess->load('owner'),
        ], 201);
    }

    /**
     * GET /api/v1/messes/{mess} — Get mess details
     */
    public function show(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::with(['owner:id,name,email', 'floors.rooms.beds'])
            ->findOrFail($mess);

        return response()->json(['mess' => $messModel]);
    }

    /**
     * PATCH /api/v1/messes/{mess} — Update mess settings
     */
    public function update(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'max:150'],
            'address' => ['sometimes', 'string'],
            'city' => ['sometimes', 'string', 'max:80'],
            'gender_policy' => ['sometimes', 'in:male,female,mixed'],
            'meal_cutoff_breakfast' => ['sometimes', 'date_format:H:i'],
            'meal_cutoff_lunch' => ['sometimes', 'date_format:H:i'],
            'meal_cutoff_dinner' => ['sometimes', 'date_format:H:i'],
            'bill_split_default' => ['sometimes', 'in:equal,prorated'],
        ]);

        $messModel->update($validated);

        return response()->json([
            'message' => 'Mess updated successfully.',
            'mess' => $messModel->fresh(),
        ]);
    }
}
