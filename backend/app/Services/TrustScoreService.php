<?php

namespace App\Services;

use App\Models\Mess;
use App\Models\MonthlyBill;
use App\Models\Review;
use App\Models\User;

class TrustScoreService
{
    /**
     * Calculate comprehensive Trust Score for a User (0 to 100)
     */
    public function calculateUserTrustScore(User $user): array
    {
        // 1. Payment Punctuality (Weight: 40 points)
        $residencies = $user->residencies()->pluck('id');
        $bills = MonthlyBill::whereIn('residency_id', $residencies)->get();
        $totalBills = $bills->count();

        if ($totalBills > 0) {
            $paidBills = $bills->where('status', 'paid')->count();
            $paymentScore = round(($paidBills / $totalBills) * 40);
        } else {
            // New user baseline
            $paymentScore = 36; // 90% default baseline
        }

        // 2. Exit Reviews Received (Weight: 35 points)
        $reviews = Review::where('reviewee_id', $user->id)->get();
        $totalReviews = $reviews->count();

        if ($totalReviews > 0) {
            $avgRating = $reviews->avg('rating_overall') ?: 5.0;
            $reviewScore = round(($avgRating / 5.0) * 35);
        } else {
            $avgRating = 5.0;
            $reviewScore = 32; // Default baseline
        }

        // 3. Leave & Clearance Record (Weight: 15 points)
        $clearances = $user->residencies()->with('leaveClearance')->get()->pluck('leaveClearance')->filter();
        $unpaidClearances = $clearances->where('final_dues', '>', 0)->where('deposit_refunded', false)->count();

        if ($clearances->count() > 0) {
            $clearanceScore = $unpaidClearances === 0 ? 15 : 5;
        } else {
            $clearanceScore = 15; // Clean slate
        }

        // 4. KYC Verification (Weight: 10 points)
        $kycScore = 0;
        $profile = $user->residencies()->whereNotNull('id')->first()?->profile;
        if ($profile && !empty($profile->nid_number)) {
            $kycScore += 6;
        }
        if (!empty($user->phone)) {
            $kycScore += 4;
        }

        $totalScore = min(100, max(0, $paymentScore + $reviewScore + $clearanceScore + $kycScore));

        // Determine Badge & Title
        if ($totalScore >= 90) {
            $badge = 'elite';
            $badgeTitle = '⭐ Elite Resident';
            $color = '#059669'; // Emerald
        } elseif ($totalScore >= 75) {
            $badge = 'trusted';
            $badgeTitle = '🛡️ Highly Trusted';
            $color = '#2563eb'; // Blue
        } elseif ($totalScore >= 50) {
            $badge = 'good';
            $badgeTitle = '✓ Good Standing';
            $color = '#d97706'; // Amber
        } else {
            $badge = 'warning';
            $badgeTitle = '⚠️ Needs Attention';
            $color = '#dc2626'; // Red
        }

        return [
            'trust_score' => $totalScore,
            'badge' => $badge,
            'badge_title' => $badgeTitle,
            'color' => $color,
            'breakdown' => [
                'payment_score' => $paymentScore,
                'max_payment' => 40,
                'review_score' => $reviewScore,
                'max_review' => 35,
                'clearance_score' => $clearanceScore,
                'max_clearance' => 15,
                'kyc_score' => $kycScore,
                'max_kyc' => 10,
            ],
            'stats' => [
                'total_bills' => $totalBills,
                'total_reviews' => $totalReviews,
                'avg_rating' => round($avgRating, 1),
            ],
        ];
    }

    /**
     * Calculate Trust Score & Community Rating for a Mess
     */
    public function calculateMessTrustScore(Mess $mess): array
    {
        $reviews = Review::where('mess_id', $mess->id)
            ->where('type', 'resident_to_mess')
            ->get();

        $totalReviews = $reviews->count();
        if ($totalReviews === 0) {
            return [
                'rating_overall' => 5.0,
                'rating_food' => 5.0,
                'rating_cleanliness' => 5.0,
                'rating_punctuality' => 5.0,
                'total_reviews' => 0,
                'trust_badge' => 'verified',
                'badge_title' => '⭐ Verified Mess',
                'recent_reviews' => [],
            ];
        }

        $avgOverall = round($reviews->avg('rating_overall') ?: 5.0, 1);
        $avgFood = round($reviews->avg('rating_food') ?: 5.0, 1);
        $avgCleanliness = round($reviews->avg('rating_cleanliness') ?: 5.0, 1);
        $avgPunctuality = round($reviews->avg('rating_punctuality') ?: 5.0, 1);

        $recentReviews = $reviews->sortByDesc('created_at')->take(5)->values()->map(function ($r) {
            return [
                'id' => $r->id,
                'reviewer_name' => $r->reviewer?->name ?: 'Resident',
                'rating_overall' => $r->rating_overall,
                'rating_food' => $r->rating_food,
                'rating_cleanliness' => $r->rating_cleanliness,
                'comment' => $r->comment,
                'created_at' => $r->created_at->diffForHumans(),
            ];
        });

        return [
            'rating_overall' => $avgOverall,
            'rating_food' => $avgFood,
            'rating_cleanliness' => $avgCleanliness,
            'rating_punctuality' => $avgPunctuality,
            'total_reviews' => $totalReviews,
            'trust_badge' => $avgOverall >= 4.0 ? 'verified' : 'standard',
            'badge_title' => $avgOverall >= 4.0 ? '⭐ Verified Mess' : '✓ Community Mess',
            'recent_reviews' => $recentReviews,
        ];
    }
}
