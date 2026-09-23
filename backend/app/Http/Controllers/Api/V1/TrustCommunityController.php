<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\LifestyleProfile;
use App\Models\Mess;
use App\Models\Notification;
use App\Models\Review;
use App\Models\User;
use App\Services\CompatibilityService;
use App\Services\TrustScoreService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TrustCommunityController extends Controller
{
    public function __construct(
        protected TrustScoreService $trustService,
        protected CompatibilityService $compatService
    ) {}

    /**
     * Submit two-way exit review (#39)
     */
    public function submitReview(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'mess_id' => 'required|uuid|exists:messes,id',
            'reviewee_id' => 'nullable|uuid|exists:users,id',
            'residency_id' => 'nullable|uuid|exists:residencies,id',
            'leave_clearance_id' => 'nullable|uuid|exists:leave_clearances,id',
            'type' => ['required', Rule::in(['manager_to_resident', 'resident_to_mess'])],
            'rating_overall' => 'required|integer|min:1|max:5',
            'rating_punctuality' => 'nullable|integer|min:1|max:5',
            'rating_cleanliness' => 'nullable|integer|min:1|max:5',
            'rating_compliance' => 'nullable|integer|min:1|max:5',
            'rating_food' => 'nullable|integer|min:1|max:5',
            'comment' => 'nullable|string|max:1000',
        ]);

        $review = Review::create([
            'mess_id' => $validated['mess_id'],
            'reviewer_id' => $request->user()->id,
            'reviewee_id' => $validated['reviewee_id'] ?? null,
            'residency_id' => $validated['residency_id'] ?? null,
            'leave_clearance_id' => $validated['leave_clearance_id'] ?? null,
            'type' => $validated['type'],
            'rating_overall' => $validated['rating_overall'],
            'rating_punctuality' => $validated['rating_punctuality'] ?? null,
            'rating_cleanliness' => $validated['rating_cleanliness'] ?? null,
            'rating_compliance' => $validated['rating_compliance'] ?? null,
            'rating_food' => $validated['rating_food'] ?? null,
            'comment' => $validated['comment'] ?? null,
        ]);

        // Trigger Notification
        if ($validated['type'] === 'manager_to_resident' && !empty($validated['reviewee_id'])) {
            Notification::create([
                'user_id' => $validated['reviewee_id'],
                'mess_id' => $validated['mess_id'],
                'type' => 'review_received',
                'title' => '⭐ New Review Received',
                'body' => 'Your mess manager submitted an exit rating for your residency.',
            ]);
        } elseif ($validated['type'] === 'resident_to_mess') {
            $mess = Mess::find($validated['mess_id']);
            if ($mess && $mess->owner_id !== $request->user()->id) {
                Notification::create([
                    'user_id' => $mess->owner_id,
                    'mess_id' => $mess->id,
                    'type' => 'mess_review',
                    'title' => '⭐ New Mess Review',
                    'body' => "A resident submitted a {$validated['rating_overall']}-star review for {$mess->name}.",
                ]);
            }
        }

        return response()->json([
            'message' => 'Review submitted successfully',
            'review' => $review->load(['reviewer:id,name', 'reviewee:id,name']),
        ], 201);
    }

    /**
     * Get Trust Score breakdown for a User (#40)
     */
    public function getUserTrustScore(string $userId): JsonResponse
    {
        $user = User::findOrFail($userId);
        $scoreData = $this->trustService->calculateUserTrustScore($user);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'name' => $user->name,
                'avatar_url' => $user->avatar_url,
            ],
            ...$scoreData,
        ]);
    }

    /**
     * Get Mess Trust Score & Reviews (#40)
     */
    public function getMessTrustScore(string $messId): JsonResponse
    {
        $mess = Mess::findOrFail($messId);
        $scoreData = $this->trustService->calculateMessTrustScore($mess);

        return response()->json([
            'mess' => [
                'id' => $mess->id,
                'name' => $mess->name,
                'city' => $mess->city,
            ],
            ...$scoreData,
        ]);
    }

    /**
     * Get current user's Lifestyle Profile (#41)
     */
    public function getLifestyleProfile(Request $request): JsonResponse
    {
        $profile = LifestyleProfile::firstOrCreate(
            ['user_id' => $request->user()->id],
            [
                'sleep_schedule' => 'flexible',
                'study_work_habits' => 'moderate',
                'cleanliness_level' => 'moderate',
                'smoking_policy' => 'non_smoker',
                'guest_frequency' => 'occasional',
            ]
        );

        return response()->json(['profile' => $profile]);
    }

    /**
     * Save / Update Lifestyle Profile (#41)
     */
    public function saveLifestyleProfile(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'sleep_schedule' => ['required', Rule::in(['early_bird', 'night_owl', 'flexible'])],
            'study_work_habits' => ['required', Rule::in(['silent', 'moderate', 'lively'])],
            'cleanliness_level' => ['required', Rule::in(['strict', 'moderate', 'relaxed'])],
            'smoking_policy' => ['required', Rule::in(['non_smoker', 'smoker_outside', 'no_preference'])],
            'guest_frequency' => ['required', Rule::in(['rare', 'occasional', 'frequent'])],
        ]);

        $profile = LifestyleProfile::updateOrCreate(
            ['user_id' => $request->user()->id],
            $validated
        );

        return response()->json([
            'message' => 'Lifestyle profile updated successfully',
            'profile' => $profile,
        ]);
    }

    /**
     * Get user compatibility with a mess (#41)
     */
    public function getMessCompatibility(string $messId, Request $request): JsonResponse
    {
        $mess = Mess::findOrFail($messId);
        $result = $this->compatService->computeUserMessCompatibility($request->user(), $mess);

        return response()->json($result);
    }
}
