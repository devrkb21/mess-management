<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Listing;
use App\Models\ListingFavorite;
use App\Models\ListingPhoto;
use App\Models\Mess;
use App\Models\Residency;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class MarketplaceController extends Controller
{
    /**
     * GET /api/v1/marketplace/listings
     * Public search with smart filters (#26, #27)
     */
    public function index(Request $request): JsonResponse
    {
        $query = Listing::query()
            ->with([
                'mess:id,name,address,city,gender_policy',
                'room:id,name',
                'bed:id,label,status',
                'photos',
            ])
            ->where('is_active', true);

        $like = \Illuminate\Support\Facades\DB::connection()->getDriverName() === 'pgsql' ? 'ilike' : 'like';

        // Search text
        if ($search = $request->query('query')) {
            $query->where(function ($q) use ($search, $like) {
                $q->where('title', $like, "%{$search}%")
                  ->orWhere('description', $like, "%{$search}%")
                  ->orWhere('area_name', $like, "%{$search}%")
                  ->orWhereHas('mess', function ($mq) use ($search, $like) {
                      $mq->where('city', $like, "%{$search}%")
                         ->orWhere('address', $like, "%{$search}%")
                         ->orWhere('name', $like, "%{$search}%");
                  });
            });
        }

        // City filter
        if ($city = $request->query('city')) {
            $query->whereHas('mess', fn ($q) => $q->where('city', $like, "%{$city}%"));
        }

        // Area filter
        if ($area = $request->query('area')) {
            $query->where('area_name', $like, "%{$area}%");
        }

        // Budget / Rent min & max
        if ($minRent = $request->query('min_rent')) {
            $query->where('rent_amount', '>=', (float) $minRent);
        }
        if ($maxRent = $request->query('max_rent')) {
            $query->where('rent_amount', '<=', (float) $maxRent);
        }

        // Gender policy
        if ($gender = $request->query('gender_policy')) {
            $query->where('gender_policy', $gender);
        }

        // Room type
        if ($roomType = $request->query('room_type')) {
            $query->where('room_type', $roomType);
        }

        // Amenities filter (e.g. amenities=wifi,ac,attached_bath)
        if ($amenities = $request->query('amenities')) {
            $amenitiesList = is_array($amenities) ? $amenities : explode(',', $amenities);
            foreach ($amenitiesList as $amenity) {
                $amenity = trim($amenity);
                if ($amenity) {
                    $query->whereJsonContains('amenities', $amenity);
                }
            }
        }

        // Sorting
        $sortBy = $request->query('sort_by', 'newest');
        match ($sortBy) {
            'rent_asc' => $query->orderBy('rent_amount', 'asc'),
            'rent_desc' => $query->orderBy('rent_amount', 'desc'),
            'views' => $query->orderBy('views_count', 'desc'),
            default => $query->orderBy('created_at', 'desc'),
        };

        $listings = $query->paginate($request->query('per_page', 12));

        // If authenticated user, mark favorited
        $user = $request->user('sanctum');
        if ($user) {
            $favoritedIds = ListingFavorite::where('user_id', $user->id)
                ->pluck('listing_id')
                ->flip();

            $listings->getCollection()->transform(function ($item) use ($favoritedIds) {
                $item->is_favorited = isset($favoritedIds[$item->id]);
                return $item;
            });
        }

        return response()->json($listings);
    }

    /**
     * GET /api/v1/marketplace/listings/{id}
     * Public detail view (#23, #24, #25)
     */
    public function show(Request $request, string $id): JsonResponse
    {
        $listing = Listing::with([
            'mess.owner:id,name,phone,avatar_url',
            'room',
            'bed',
            'photos',
        ])->findOrFail($id);

        $listing->increment('views_count');

        $user = $request->user('sanctum');
        $listing->is_favorited = false;
        $listing->user_application = null;
        $listing->user_visit = null;

        if ($user) {
            $listing->is_favorited = ListingFavorite::where('user_id', $user->id)
                ->where('listing_id', $listing->id)
                ->exists();

            $listing->user_application = $listing->applications()
                ->where('user_id', $user->id)
                ->latest()
                ->first();

            $listing->user_visit = $listing->visits()
                ->where('user_id', $user->id)
                ->latest()
                ->first();
        }

        return response()->json($listing);
    }

    /**
     * GET /api/v1/marketplace/listings/{id}/share-qr (#30 QR / Invite link)
     */
    public function shareQr(Request $request, string $id): JsonResponse
    {
        $listing = Listing::with('mess:id,name,address,city')->findOrFail($id);

        $webBaseUrl = env('FRONTEND_URL', 'http://' . $request->getHost() . ':3000');
        $shareUrl = "{$webBaseUrl}/marketplace/{$listing->id}";

        return response()->json([
            'listing_id' => $listing->id,
            'title' => $listing->title,
            'mess_name' => $listing->mess->name,
            'share_url' => $shareUrl,
            'qr_data' => $shareUrl,
        ]);
    }

    /**
     * POST /api/v1/marketplace/listings/{id}/favorite (#27 Favorites)
     */
    public function toggleFavorite(Request $request, string $id): JsonResponse
    {
        $user = $request->user();
        $listing = Listing::findOrFail($id);

        $existing = ListingFavorite::where('user_id', $user->id)
            ->where('listing_id', $listing->id)
            ->first();

        if ($existing) {
            $existing->delete();
            return response()->json([
                'message' => 'Listing removed from favorites.',
                'is_favorited' => false,
            ]);
        }

        ListingFavorite::create([
            'user_id' => $user->id,
            'listing_id' => $listing->id,
        ]);

        return response()->json([
            'message' => 'Listing added to favorites.',
            'is_favorited' => true,
        ]);
    }

    /**
     * GET /api/v1/marketplace/favorites (#27 List saved)
     */
    public function favorites(Request $request): JsonResponse
    {
        $user = $request->user();

        $favorites = ListingFavorite::with([
            'listing.mess:id,name,city,address',
            'listing.photos',
            'listing.room:id,name',
            'listing.bed:id,label',
        ])
            ->where('user_id', $user->id)
            ->latest()
            ->paginate(15);

        return response()->json($favorites);
    }

    /**
     * POST /api/v1/messes/{mess}/listings (#23 Vacancy Postings)
     */
    public function store(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $validated = $request->validate([
            'room_id' => ['sometimes', 'nullable', 'uuid', 'exists:rooms,id'],
            'bed_id' => ['sometimes', 'nullable', 'uuid', 'exists:beds,id'],
            'title' => ['required', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string'],
            'rent_amount' => ['required', 'numeric', 'min:0'],
            'security_deposit' => ['sometimes', 'numeric', 'min:0'],
            'available_from' => ['required', 'date'],
            'gender_policy' => ['sometimes', 'in:male,female,mixed'],
            'room_type' => ['sometimes', 'string', 'max:50'],
            'amenities' => ['sometimes', 'nullable', 'array'],
            'rules' => ['sometimes', 'nullable', 'array'],
            'video_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'latitude' => ['sometimes', 'nullable', 'numeric'],
            'longitude' => ['sometimes', 'nullable', 'numeric'],
            'area_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'photos' => ['sometimes', 'nullable', 'array'],
            'photos.*' => ['string'],
        ]);

        $listing = Listing::create([
            'mess_id' => $messModel->id,
            'room_id' => $validated['room_id'] ?? null,
            'bed_id' => $validated['bed_id'] ?? null,
            'title' => $validated['title'],
            'description' => $validated['description'] ?? null,
            'rent_amount' => $validated['rent_amount'],
            'security_deposit' => $validated['security_deposit'] ?? 0,
            'available_from' => $validated['available_from'],
            'gender_policy' => $validated['gender_policy'] ?? $messModel->gender_policy,
            'room_type' => $validated['room_type'] ?? 'double',
            'amenities' => $validated['amenities'] ?? [],
            'rules' => $validated['rules'] ?? [],
            'video_url' => $validated['video_url'] ?? null,
            'latitude' => $validated['latitude'] ?? null,
            'longitude' => $validated['longitude'] ?? null,
            'area_name' => $validated['area_name'] ?? $messModel->city,
            'is_active' => true,
        ]);

        // Add photos if provided
        if (!empty($validated['photos'])) {
            foreach ($validated['photos'] as $idx => $photoUrl) {
                ListingPhoto::create([
                    'listing_id' => $listing->id,
                    'photo_url' => $photoUrl,
                    'sort_order' => $idx,
                ]);
            }
        }

        return response()->json([
            'message' => 'Vacancy listing published successfully.',
            'listing' => $listing->load(['photos', 'mess:id,name', 'room', 'bed']),
        ], 201);
    }

    /**
     * PATCH /api/v1/marketplace/listings/{id}
     */
    public function update(Request $request, string $id): JsonResponse
    {
        $listing = Listing::findOrFail($id);

        $user = $request->user();
        $isAuthorized = $user->is_superadmin ||
            Residency::where('user_id', $user->id)
                ->where('mess_id', $listing->mess_id)
                ->whereIn('role', ['owner', 'manager'])
                ->where('status', 'active')
                ->exists();

        if (!$isAuthorized) {
            return response()->json(['message' => 'Unauthorized to modify this listing.'], 403);
        }

        $validated = $request->validate([
            'title' => ['sometimes', 'string', 'max:200'],
            'description' => ['sometimes', 'nullable', 'string'],
            'rent_amount' => ['sometimes', 'numeric', 'min:0'],
            'security_deposit' => ['sometimes', 'numeric', 'min:0'],
            'available_from' => ['sometimes', 'date'],
            'gender_policy' => ['sometimes', 'in:male,female,mixed'],
            'room_type' => ['sometimes', 'string', 'max:50'],
            'amenities' => ['sometimes', 'nullable', 'array'],
            'rules' => ['sometimes', 'nullable', 'array'],
            'video_url' => ['sometimes', 'nullable', 'url', 'max:500'],
            'area_name' => ['sometimes', 'nullable', 'string', 'max:100'],
            'is_active' => ['sometimes', 'boolean'],
        ]);

        $listing->update($validated);

        return response()->json([
            'message' => 'Listing updated successfully.',
            'listing' => $listing->fresh(['photos', 'mess', 'room', 'bed']),
        ]);
    }

    /**
     * DELETE /api/v1/marketplace/listings/{id}
     */
    public function destroy(Request $request, string $id): JsonResponse
    {
        $listing = Listing::findOrFail($id);

        $user = $request->user();
        $isAuthorized = $user->is_superadmin ||
            Residency::where('user_id', $user->id)
                ->where('mess_id', $listing->mess_id)
                ->whereIn('role', ['owner', 'manager'])
                ->where('status', 'active')
                ->exists();

        if (!$isAuthorized) {
            return response()->json(['message' => 'Unauthorized to delete this listing.'], 403);
        }

        $listing->delete();

        return response()->json(['message' => 'Listing deleted successfully.']);
    }

    /**
     * GET /api/v1/messes/{mess}/listings — Manager view of all mess listings
     */
    public function messListings(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $listings = Listing::with(['photos', 'room', 'bed'])
            ->withCount(['applications', 'visits', 'favorites'])
            ->where('mess_id', $messModel->id)
            ->latest()
            ->get();

        return response()->json($listings);
    }
}
