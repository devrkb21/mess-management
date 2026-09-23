<?php

namespace Tests\Feature;

use App\Models\Bed;
use App\Models\Floor;
use App\Models\Listing;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MarketplaceApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_marketplace_and_booking_flow(): void
    {
        // 1. Create Owner and Mess
        $owner = User::create([
            'name' => 'Owner Rafiq',
            'email' => 'rafiq@example.com',
            'phone' => '01711223344',
            'password' => 'password123',
        ]);

        $mess = Mess::create([
            'owner_id' => $owner->id,
            'name' => 'Mirpur Student Haven',
            'address' => 'Mirpur 10, Dhaka',
            'city' => 'Dhaka',
            'gender_policy' => 'male',
        ]);

        Residency::create([
            'user_id' => $owner->id,
            'mess_id' => $mess->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now()->toDateString(),
        ]);

        $floor = Floor::create(['mess_id' => $mess->id, 'name' => '2nd Floor', 'sort_order' => 2]);
        $room = Room::create(['floor_id' => $floor->id, 'name' => 'Room 202', 'capacity' => 2]);
        $bed = Bed::create(['room_id' => $room->id, 'label' => 'Bed 202-A', 'status' => 'empty']);

        // 2. Manager creates a Vacancy Listing (#23, #24, #25)
        Sanctum::actingAs($owner);
        $createRes = $this->postJson("/api/v1/messes/{$mess->id}/listings", [
            'room_id' => $room->id,
            'bed_id' => $bed->id,
            'title' => 'Master Bed Seat in Mirpur 10 near Metro',
            'description' => 'Clean room with balcony, high-speed WiFi, attached bath.',
            'rent_amount' => 4500,
            'security_deposit' => 3000,
            'available_from' => now()->toDateString(),
            'gender_policy' => 'male',
            'room_type' => 'double',
            'amenities' => ['wifi', 'attached_bath', 'balcony'],
            'rules' => ['smoking_allowed' => false, 'gate_close_time' => '11:00 PM'],
            'video_url' => 'https://youtu.be/sample-video',
            'area_name' => 'Mirpur 10',
            'photos' => ['https://images.unsplash.com/photo-1555854877-bab0e564b8d5'],
        ]);
        $createRes->assertStatus(201);
        $listingId = $createRes->json('listing.id');
        $this->assertNotNull($listingId);
        $this->assertTrue($createRes->json('listing.is_active'));

        // 3. Public Seeker searches marketplace with smart filters (#26)
        $seeker = User::create([
            'name' => 'Seeker Hasan',
            'email' => 'hasan@example.com',
            'phone' => '01899887766',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($seeker);

        $searchRes = $this->getJson('/api/v1/marketplace/listings?city=Dhaka&min_rent=3000&max_rent=5000&gender_policy=male&amenities=wifi');
        $searchRes->assertStatus(200);
        $this->assertCount(1, $searchRes->json('data'));

        // 4. Seeker favorites listing (#27)
        $favRes = $this->postJson("/api/v1/marketplace/listings/{$listingId}/favorite");
        $favRes->assertStatus(200);
        $this->assertTrue($favRes->json('is_favorited'));

        $myFavs = $this->getJson('/api/v1/marketplace/favorites');
        $myFavs->assertStatus(200);
        $this->assertCount(1, $myFavs->json('data'));

        // 5. Seeker requests physical visit (#32)
        $visitRes = $this->postJson("/api/v1/marketplace/listings/{$listingId}/visits", [
            'visit_date' => now()->addDays(2)->toDateString(),
            'time_slot' => '11:00 AM - 12:00 PM',
            'notes' => 'Would love to see the room before joining.',
        ]);
        $visitRes->assertStatus(201);
        $visitId = $visitRes->json('visit.id');

        // 6. In-App Chat between Seeker and Manager (#31)
        $chatRes = $this->postJson("/api/v1/marketplace/listings/{$listingId}/inquire", [
            'message' => 'Hello manager, is food included in the 4500 rent?',
        ]);
        $chatRes->assertStatus(201);
        $threadId = $chatRes->json('thread.id');

        // Manager replies
        Sanctum::actingAs($owner);
        $replyRes = $this->postJson("/api/v1/inquiries/{$threadId}/messages", [
            'message' => 'Hello Hasan, food/bazar is split based on daily meal count. Fixed rent covers room + maid + wifi.',
        ]);
        $replyRes->assertStatus(201);

        // Manager confirms visit
        $confirmVisit = $this->patchJson("/api/v1/visits/{$visitId}/status", [
            'status' => 'confirmed',
            'manager_notes' => 'Looking forward to meeting you.',
        ]);
        $confirmVisit->assertStatus(200);
        $this->assertEquals('confirmed', $confirmVisit->json('visit.status'));

        // 7. Seeker applies with KYC profile (#29)
        Sanctum::actingAs($seeker);
        $applyRes = $this->postJson("/api/v1/marketplace/listings/{$listingId}/apply", [
            'desired_move_in_date' => now()->addDays(5)->toDateString(),
            'applicant_note' => 'I am a software engineer looking for a peaceful mess.',
            'nid_number' => '19981234567890',
            'profession' => 'Software Engineer',
            'blood_group' => 'B+',
            'emergency_contact_name' => 'Father',
            'emergency_contact_phone' => '01700000000',
        ]);
        $applyRes->assertStatus(201);
        $applicationId = $applyRes->json('application.id');

        // 8. Manager reviews and accepts application (#33, #34, #28 Auto-Hide)
        Sanctum::actingAs($owner);
        $acceptRes = $this->postJson("/api/v1/booking-applications/{$applicationId}/decision", [
            'decision' => 'accepted',
            'manager_remarks' => 'Welcome to Mirpur Haven!',
        ]);
        $acceptRes->assertStatus(200);

        // Verify applicant has active residency
        $this->assertDatabaseHas('residencies', [
            'user_id' => $seeker->id,
            'mess_id' => $mess->id,
            'status' => 'active',
            'role' => 'resident',
        ]);

        // Verify bed is marked occupied
        $bed->refresh();
        $this->assertEquals('occupied', $bed->status);

        // Verify listing is auto-hidden (#28)
        $listing = Listing::find($listingId);
        $this->assertFalse($listing->is_active);

        // 9. Another user joins waiting list (#35)
        $seeker2 = User::create([
            'name' => 'Seeker Karim',
            'email' => 'karim@example.com',
            'phone' => '01511223344',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($seeker2);

        $waitRes = $this->postJson("/api/v1/messes/{$mess->id}/waiting-list", [
            'preferred_room_type' => 'double',
            'max_budget' => 5000,
            'note' => 'Please notify me if any bed in 2nd floor opens up.',
        ]);
        $waitRes->assertStatus(201);
        $this->assertDatabaseHas('waiting_lists', [
            'mess_id' => $mess->id,
            'user_id' => $seeker2->id,
        ]);
    }
}
