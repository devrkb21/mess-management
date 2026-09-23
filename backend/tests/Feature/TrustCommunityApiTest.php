<?php

namespace Tests\Feature;

use App\Models\LifestyleProfile;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\Review;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class TrustCommunityApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;
    protected User $resident;
    protected Mess $mess;
    protected Residency $residency;

    protected function setUp(): void
    {
        parent::setUp();

        $this->owner = User::factory()->create(['name' => 'Mess Owner', 'phone' => '01711111111']);
        $this->resident = User::factory()->create(['name' => 'John Doe', 'phone' => '01722222222']);

        $this->mess = Mess::create([
            'owner_id' => $this->owner->id,
            'name' => 'Trustful Mess',
            'address' => 'Mirpur-2, Dhaka',
            'city' => 'Dhaka',
            'gender_policy' => 'male',
        ]);

        $this->residency = Residency::create([
            'user_id' => $this->resident->id,
            'mess_id' => $this->mess->id,
            'role' => 'resident',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }

    public function test_resident_can_submit_review_for_mess(): void
    {
        $response = $this->actingAs($this->resident)->postJson('/api/v1/reviews', [
            'mess_id' => $this->mess->id,
            'type' => 'resident_to_mess',
            'rating_overall' => 5,
            'rating_food' => 4,
            'rating_cleanliness' => 5,
            'rating_punctuality' => 5,
            'comment' => 'Exceptional food and clean facilities!',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('review.rating_overall', 5)
            ->assertJsonPath('review.comment', 'Exceptional food and clean facilities!');

        $this->assertDatabaseHas('reviews', [
            'mess_id' => $this->mess->id,
            'reviewer_id' => $this->resident->id,
            'rating_overall' => 5,
        ]);
    }

    public function test_manager_can_submit_exit_review_for_resident(): void
    {
        $response = $this->actingAs($this->owner)->postJson('/api/v1/reviews', [
            'mess_id' => $this->mess->id,
            'reviewee_id' => $this->resident->id,
            'residency_id' => $this->residency->id,
            'type' => 'manager_to_resident',
            'rating_overall' => 5,
            'rating_punctuality' => 5,
            'rating_cleanliness' => 4,
            'rating_compliance' => 5,
            'comment' => 'Always paid bills on time and kept room spotless.',
        ]);

        $response->assertStatus(201)
            ->assertJsonPath('review.rating_overall', 5)
            ->assertJsonPath('review.reviewee.name', 'John Doe');

        $this->assertDatabaseHas('reviews', [
            'reviewee_id' => $this->resident->id,
            'reviewer_id' => $this->owner->id,
            'type' => 'manager_to_resident',
        ]);
    }

    public function test_get_user_trust_score_breakdown_and_badge(): void
    {
        $response = $this->getJson("/api/v1/users/{$this->resident->id}/trust-score");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'user' => ['id', 'name'],
                'trust_score',
                'badge',
                'badge_title',
                'color',
                'breakdown' => [
                    'payment_score',
                    'review_score',
                    'clearance_score',
                    'kyc_score',
                ],
                'stats',
            ]);

        $score = $response->json('trust_score');
        $this->assertGreaterThanOrEqual(0, $score);
        $this->assertLessThanOrEqual(100, $score);
    }

    public function test_get_mess_trust_score_and_reviews(): void
    {
        Review::create([
            'mess_id' => $this->mess->id,
            'reviewer_id' => $this->resident->id,
            'type' => 'resident_to_mess',
            'rating_overall' => 4,
            'rating_food' => 4,
            'rating_cleanliness' => 5,
            'rating_punctuality' => 4,
            'comment' => 'Great experience overall.',
        ]);

        $response = $this->getJson("/api/v1/messes/{$this->mess->id}/trust-score");

        $response->assertStatus(200)
            ->assertJsonPath('total_reviews', 1);
        $this->assertEquals(4.0, (float)$response->json('rating_overall'));
        $this->assertEquals(4.0, (float)$response->json('rating_food'));
    }

    public function test_lifestyle_profile_save_and_retrieve(): void
    {
        $saveResponse = $this->actingAs($this->resident)->postJson('/api/v1/lifestyle/profile', [
            'sleep_schedule' => 'early_bird',
            'study_work_habits' => 'silent',
            'cleanliness_level' => 'strict',
            'smoking_policy' => 'non_smoker',
            'guest_frequency' => 'rare',
        ]);

        $saveResponse->assertStatus(200)
            ->assertJsonPath('profile.sleep_schedule', 'early_bird')
            ->assertJsonPath('profile.cleanliness_level', 'strict');

        $getResponse = $this->actingAs($this->resident)->getJson('/api/v1/lifestyle/profile');
        $getResponse->assertStatus(200)
            ->assertJsonPath('profile.smoking_policy', 'non_smoker');
    }

    public function test_mess_lifestyle_compatibility_calculation(): void
    {
        // Resident profile
        LifestyleProfile::create([
            'user_id' => $this->resident->id,
            'sleep_schedule' => 'early_bird',
            'study_work_habits' => 'silent',
            'cleanliness_level' => 'strict',
            'smoking_policy' => 'non_smoker',
            'guest_frequency' => 'rare',
        ]);

        // Seeker profile with matching habits
        $seeker = User::factory()->create(['phone' => '01733333333']);
        LifestyleProfile::create([
            'user_id' => $seeker->id,
            'sleep_schedule' => 'early_bird',
            'study_work_habits' => 'silent',
            'cleanliness_level' => 'strict',
            'smoking_policy' => 'non_smoker',
            'guest_frequency' => 'rare',
        ]);

        $response = $this->actingAs($seeker)->getJson("/api/v1/messes/{$this->mess->id}/compatibility");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'match_percentage',
                'highlights',
                'resident_profiles_count',
            ]);

        // Should be a 100% exact match
        $this->assertEquals(100, $response->json('match_percentage'));
    }
}
