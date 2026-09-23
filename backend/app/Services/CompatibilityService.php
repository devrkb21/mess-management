<?php

namespace App\Services;

use App\Models\LifestyleProfile;
use App\Models\Mess;
use App\Models\User;

class CompatibilityService
{
    /**
     * Compute lifestyle compatibility between two profiles (0% to 100%)
     */
    public function computeMatch(LifestyleProfile $p1, LifestyleProfile $p2): array
    {
        // 1. Sleep Schedule (Weight: 25%)
        $sleepScore = $this->calculateSleepScore($p1->sleep_schedule, $p2->sleep_schedule);

        // 2. Study / Work habits (Weight: 20%)
        $studyScore = $this->calculateStudyScore($p1->study_work_habits, $p2->study_work_habits);

        // 3. Cleanliness (Weight: 25%)
        $cleanScore = $this->calculateCleanlinessScore($p1->cleanliness_level, $p2->cleanliness_level);

        // 4. Smoking Policy (Weight: 20%)
        $smokeScore = $this->calculateSmokingScore($p1->smoking_policy, $p2->smoking_policy);

        // 5. Guest Frequency (Weight: 10%)
        $guestScore = $this->calculateGuestScore($p1->guest_frequency, $p2->guest_frequency);

        $totalMatch = round(
            ($sleepScore * 0.25) +
            ($studyScore * 0.20) +
            ($cleanScore * 0.25) +
            ($smokeScore * 0.20) +
            ($guestScore * 0.10)
        );

        $totalMatch = min(100, max(10, $totalMatch));

        // High compatibility summary
        $highlights = [];
        if ($sleepScore >= 80) $highlights[] = 'Harmonious sleep rhythms';
        if ($cleanScore >= 80) $highlights[] = 'Similar cleanliness standards';
        if ($smokeScore >= 80) $highlights[] = 'Aligned smoking preferences';
        if ($studyScore >= 80) $highlights[] = 'Compatible study/work vibes';

        return [
            'match_percentage' => $totalMatch,
            'highlights' => $highlights,
            'breakdown' => [
                'sleep' => $sleepScore,
                'study' => $studyScore,
                'cleanliness' => $cleanScore,
                'smoking' => $smokeScore,
                'guest' => $guestScore,
            ],
        ];
    }

    /**
     * Compute compatibility of a user against active residents in a mess
     */
    public function computeUserMessCompatibility(User $user, Mess $mess): array
    {
        $userProfile = $user->lifestyleProfile;
        if (!$userProfile) {
            // Default neutral profile if user hasn't filled questionnaire yet
            $userProfile = new LifestyleProfile([
                'sleep_schedule' => 'flexible',
                'study_work_habits' => 'moderate',
                'cleanliness_level' => 'moderate',
                'smoking_policy' => 'non_smoker',
                'guest_frequency' => 'occasional',
            ]);
        }

        // Fetch active residents with lifestyle profiles
        $residentUserIds = $mess->activeResidencies()->pluck('user_id');
        $residentProfiles = LifestyleProfile::whereIn('user_id', $residentUserIds)->get();

        if ($residentProfiles->isEmpty()) {
            return [
                'match_percentage' => 88, // Standard welcoming baseline
                'highlights' => ['Welcoming & balanced environment', 'Open culture'],
                'resident_profiles_count' => 0,
            ];
        }

        $scores = [];
        foreach ($residentProfiles as $otherProfile) {
            $match = $this->computeMatch($userProfile, $otherProfile);
            $scores[] = $match['match_percentage'];
        }

        $avgScore = round(array_sum($scores) / count($scores));

        return [
            'match_percentage' => $avgScore,
            'highlights' => $avgScore >= 75
                ? ['High roommate compatibility', 'Similar living habits']
                : ['Diverse resident habits', 'Adaptable living environment'],
            'resident_profiles_count' => $residentProfiles->count(),
        ];
    }

    private function calculateSleepScore(string $s1, string $s2): int
    {
        if ($s1 === $s2) return 100;
        if ($s1 === 'flexible' || $s2 === 'flexible') return 80;
        return 30; // early_bird vs night_owl
    }

    private function calculateStudyScore(string $s1, string $s2): int
    {
        if ($s1 === $s2) return 100;
        if ($s1 === 'moderate' || $s2 === 'moderate') return 75;
        return 30; // silent vs lively
    }

    private function calculateCleanlinessScore(string $c1, string $c2): int
    {
        if ($c1 === $c2) return 100;
        if ($c1 === 'moderate' || $c2 === 'moderate') return 70;
        return 20; // strict vs relaxed
    }

    private function calculateSmokingScore(string $s1, string $s2): int
    {
        if ($s1 === $s2) return 100;
        if ($s1 === 'no_preference' || $s2 === 'no_preference') return 85;
        if (($s1 === 'non_smoker' && $s2 === 'smoker_outside') || ($s2 === 'non_smoker' && $s1 === 'smoker_outside')) {
            return 60;
        }
        return 20;
    }

    private function calculateGuestScore(string $g1, string $g2): int
    {
        if ($g1 === $g2) return 100;
        if ($g1 === 'occasional' || $g2 === 'occasional') return 75;
        return 30; // rare vs frequent
    }
}
