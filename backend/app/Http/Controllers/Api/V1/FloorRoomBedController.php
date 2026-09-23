<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Bed;
use App\Models\Floor;
use App\Models\Mess;
use App\Models\Room;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FloorRoomBedController extends Controller
{
    /**
     * POST /api/v1/messes/{mess}/floors
     */
    public function storeFloor(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'sort_order' => ['sometimes', 'integer', 'min:0'],
        ]);

        $floor = $messModel->floors()->create($validated);

        return response()->json([
            'message' => 'Floor added successfully.',
            'floor' => $floor,
        ], 201);
    }

    /**
     * POST /api/v1/floors/{floor}/rooms
     */
    public function storeRoom(Request $request, string $floor): JsonResponse
    {
        $floorModel = Floor::findOrFail($floor);

        $validated = $request->validate([
            'name' => ['required', 'string', 'max:50'],
            'capacity' => ['sometimes', 'integer', 'min:1'],
        ]);

        $room = $floorModel->rooms()->create($validated);

        return response()->json([
            'message' => 'Room added successfully.',
            'room' => $room,
        ], 201);
    }

    /**
     * POST /api/v1/rooms/{room}/beds
     */
    public function storeBed(Request $request, string $room): JsonResponse
    {
        $roomModel = Room::findOrFail($room);

        $validated = $request->validate([
            'label' => ['required', 'string', 'max:20'],
        ]);

        $bed = $roomModel->beds()->create([
            ...$validated,
            'status' => 'empty',
        ]);

        return response()->json([
            'message' => 'Bed added successfully.',
            'bed' => $bed,
        ], 201);
    }

    /**
     * GET /api/v1/messes/{mess}/beds — list all beds with status
     */
    public function listBeds(string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $beds = Bed::whereHas('room.floor', function ($query) use ($messModel) {
            $query->where('mess_id', $messModel->id);
        })->with(['room:id,name,floor_id', 'room.floor:id,name', 'currentResidency.user:id,name'])
            ->get();

        return response()->json(['beds' => $beds]);
    }
}
