<?php

namespace Tests\Feature;

use App\Models\BookingApplication;
use App\Models\Listing;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class VacancyMarketplaceApiTest extends TestCase
{
    use RefreshDatabase;

    protected User $owner;

    protected User $resident;

    protected Mess $mess;

    protected Residency $ownerResidency;

    protected Residency $residency;

    protected function setUp(): void
    {
        parent::setUp();

        Storage::fake('public');

        $this->owner = User::factory()->create(['phone' => '01711111111']);
        $this->resident = User::factory()->create(['phone' => '01722222222']);

        $this->mess = Mess::create([
            'owner_id' => $this->owner->id,
            'name' => 'Map View Mess',
            'address' => 'Dhanmondi 27, Dhaka',
            'city' => 'Dhaka',
            'gender_policy' => 'male',
        ]);

        $this->ownerResidency = Residency::create([
            'user_id' => $this->owner->id,
            'mess_id' => $this->mess->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now(),
        ]);

        $this->residency = Residency::create([
            'user_id' => $this->resident->id,
            'mess_id' => $this->mess->id,
            'role' => 'resident',
            'status' => 'active',
            'joined_at' => now(),
        ]);
    }

    protected function createListing(array $overrides = []): Listing
    {
        return Listing::create(array_merge([
            'mess_id' => $this->mess->id,
            'title' => 'Sunny Bed near DU',
            'rent_amount' => 4000,
            'available_from' => now()->toDateString(),
            'gender_policy' => 'male',
            'room_type' => 'double',
            'latitude' => 23.7811,
            'longitude' => 90.4060,
            'area_name' => 'Dhanmondi',
            'is_active' => true,
            'views_count' => 0,
        ], $overrides));
    }

    public function test_map_returns_only_geolocated_active_listings(): void
    {
        $this->createListing();
        $this->createListing(['title' => 'Inactive listing', 'is_active' => false]);
        $this->createListing(['title' => 'No coordinates', 'latitude' => null, 'longitude' => null]);

        $response = $this->getJson('/api/v1/marketplace/map');

        $response->assertStatus(200)
            ->assertJsonPath('count', 1)
            ->assertJsonStructure([
                'pins' => [
                    [
                        'id',
                        'title',
                        'rent_amount',
                        'gender_policy',
                        'room_type',
                        'latitude',
                        'longitude',
                        'area_name',
                        'city',
                        'mess_name',
                        'available_from',
                    ],
                ],
            ]);

        $this->assertEquals(23.7811, $response->json('pins.0.latitude'));
        $this->assertEquals('Dhaka', $response->json('pins.0.city'));
    }

    public function test_map_filters_by_bounding_box(): void
    {
        $this->createListing(['title' => 'Dhaka seat']); // 23.7811, 90.4060
        $this->createListing(['title' => 'Chattogram seat', 'latitude' => 22.3569, 'longitude' => 91.7832]);

        $response = $this->getJson('/api/v1/marketplace/map?south=23.5&west=90.0&north=24.0&east=90.8');

        $response->assertStatus(200)->assertJsonPath('count', 1);
        $this->assertEquals('Dhaka seat', $response->json('pins.0.title'));
    }

    public function test_map_applies_rent_and_gender_filters(): void
    {
        $this->createListing(['rent_amount' => 3500]);
        $this->createListing(['title' => 'Premium seat', 'rent_amount' => 9000]);
        $this->createListing(['title' => 'Female seat', 'gender_policy' => 'female']);

        $response = $this->getJson('/api/v1/marketplace/map?max_rent=5000&gender_policy=male');

        $response->assertStatus(200)->assertJsonPath('count', 1);
        $this->assertEquals(3500, $response->json('pins.0.rent_amount'));
    }

    public function test_manager_can_upload_walk_through_video(): void
    {
        $listing = $this->createListing();

        $response = $this->actingAs($this->owner)
            ->post("/api/v1/messes/{$this->mess->id}/listings/video", [
                'listing_id' => $listing->id,
                'video' => UploadedFile::fake()->create('tour.mp4', 200, 'video/mp4'),
            ]);

        $response->assertStatus(200)
            ->assertJsonPath('message', 'Walk-through video uploaded successfully.');

        $this->assertNotNull($response->json('video_url'));
        $this->assertDatabaseHas('listings', [
            'id' => $listing->id,
        ]);

        Storage::disk('public')->assertExists('listing-videos/'.basename($response->json('video_url')));
    }

    public function test_video_upload_rejects_non_video_files(): void
    {
        $listing = $this->createListing();

        $response = $this->actingAs($this->owner)
            ->post("/api/v1/messes/{$this->mess->id}/listings/video", [
                'listing_id' => $listing->id,
                'video' => UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
            ]);

        $response->assertStatus(422);
    }

    public function test_video_upload_is_forbidden_for_regular_residents(): void
    {
        $listing = $this->createListing();

        $response = $this->actingAs($this->resident)
            ->post("/api/v1/messes/{$this->mess->id}/listings/video", [
                'listing_id' => $listing->id,
                'video' => UploadedFile::fake()->create('tour.mp4', 200, 'video/mp4'),
            ]);

        $response->assertStatus(403);
    }

    public function test_manager_can_upload_listing_photos_without_listing(): void
    {
        $response = $this->actingAs($this->owner)
            ->post("/api/v1/messes/{$this->mess->id}/listings/photos", [
                'photos' => [
                    UploadedFile::fake()->image('room-a.jpg'),
                    UploadedFile::fake()->image('room-b.png'),
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Photos uploaded successfully.');

        $this->assertCount(2, $response->json('photo_urls'));
        $this->assertNull($response->json('listing'));
        Storage::disk('public')->assertExists('listing-photos/'.basename($response->json('photo_urls.0')));
    }

    public function test_photos_can_be_attached_to_existing_listing_while_uploading(): void
    {
        $listing = $this->createListing();

        $response = $this->actingAs($this->owner)
            ->post("/api/v1/messes/{$this->mess->id}/listings/photos", [
                'listing_id' => $listing->id,
                'photos' => [
                    UploadedFile::fake()->image('room.jpg', 600, 400),
                ],
            ]);

        $response->assertStatus(201);

        $this->assertCount(1, $listing->fresh()->photos);
        $this->assertStringContainsString('listing-photos/', $response->json('listing.photos.0.photo_url'));
    }

    public function test_photo_upload_rejects_non_image_files(): void
    {
        $response = $this->actingAs($this->owner)
            ->post("/api/v1/messes/{$this->mess->id}/listings/photos", [
                'photos' => [
                    UploadedFile::fake()->create('notes.pdf', 100, 'application/pdf'),
                ],
            ]);

        $response->assertStatus(422);
    }

    public function test_photo_upload_is_forbidden_for_regular_residents(): void
    {
        $response = $this->actingAs($this->resident)
            ->post("/api/v1/messes/{$this->mess->id}/listings/photos", [
                'photos' => [
                    UploadedFile::fake()->image('room.jpg'),
                ],
            ]);

        $response->assertStatus(403);
    }

    public function test_photo_urls_can_be_attached_to_a_listing_in_batch(): void
    {
        $listing = $this->createListing();

        $response = $this->actingAs($this->owner)
            ->post("/api/v1/messes/{$this->mess->id}/listings/photos/attach", [
                'listing_id' => $listing->id,
                'photo_urls' => [
                    'https://r2.example.com/listing-photos/a.png',
                    'https://r2.example.com/listing-photos/b.png',
                ],
            ]);

        $response->assertStatus(201)
            ->assertJsonPath('message', 'Photos attached successfully.');

        $this->assertCount(2, $listing->fresh()->photos);
        $this->assertEquals(
            'https://r2.example.com/listing-photos/a.png',
            $listing->fresh()->photos->first()->photo_url
        );
    }

    public function test_photo_attach_validates_input(): void
    {
        $listing = $this->createListing();

        $response = $this->actingAs($this->resident)
            ->post("/api/v1/messes/{$this->mess->id}/listings/photos/attach", [
                'listing_id' => $listing->id,
                'photo_urls' => ['https://r2.example.com/listing-photos/a.png'],
            ]);

        $response->assertStatus(403);
    }

    public function test_vacancy_analytics_summarizes_views_applications_and_fill_time(): void
    {
        // Another mess in the same city to build a marketplace average
        $otherOwner = User::factory()->create(['phone' => '01733333333']);
        $otherMess = Mess::create([
            'owner_id' => $otherOwner->id,
            'name' => 'Other Dhaka Mess',
            'address' => 'Mirpur 10, Dhaka',
            'city' => 'Dhaka',
            'gender_policy' => 'male',
        ]);
        Listing::create([
            'mess_id' => $otherMess->id,
            'title' => 'Expensive nearby seat',
            'rent_amount' => 6000,
            'available_from' => now()->toDateString(),
            'is_active' => true,
        ]);

        $listing = $this->createListing(['rent_amount' => 4000, 'views_count' => 100]);
        $listing->forceFill(['created_at' => now()->subDays(6)])->save();

        $pending = BookingApplication::create([
            'listing_id' => $listing->id,
            'user_id' => $this->resident->id,
            'status' => 'pending',
            'desired_move_in_date' => now()->addDays(10)->toDateString(),
        ]);
        $pending->forceFill(['created_at' => now()->subDays(2)])->save();

        $accepted = BookingApplication::create([
            'listing_id' => $listing->id,
            'user_id' => $this->resident->id,
            'status' => 'accepted',
            'desired_move_in_date' => now()->addDays(10)->toDateString(),
        ]);
        $accepted->forceFill(['created_at' => now()->subDays(4)])->save();

        $response = $this->actingAs($this->owner)
            ->getJson("/api/v1/messes/{$this->mess->id}/analytics/vacancy");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'mess' => ['id', 'name'],
                'summary' => [
                    'total_listings',
                    'active_listings',
                    'total_views',
                    'total_applications',
                    'total_accepted',
                    'application_rate_percentage',
                    'average_time_to_fill_days',
                    'average_rent',
                    'city_average_rent',
                    'price_position',
                ],
                'listings',
            ]);

        $summary = $response->json('summary');
        $this->assertEquals(1, $summary['total_listings']);
        $this->assertEquals(100, $summary['total_views']);
        $this->assertEquals(2, $summary['total_applications']);
        $this->assertEquals(1, $summary['total_accepted']);
        $this->assertEquals(2.0, $summary['application_rate_percentage']);
        $this->assertEqualsWithDelta(2.0, $summary['average_time_to_fill_days'], 0.05);
        $this->assertEquals(5000.0, $summary['city_average_rent']);
        $this->assertEquals('below_market', $summary['price_position']);

        $this->assertEquals(100, $response->json('listings.0.views_count'));
        $this->assertEquals(2, $response->json('listings.0.applications_count'));
        $this->assertEquals(2.0, $response->json('listings.0.application_rate_percentage'));
    }

    public function test_listing_update_accepts_coordinates(): void
    {
        $listing = $this->createListing();

        $response = $this->actingAs($this->owner)
            ->json('PATCH', "/api/v1/marketplace/listings/{$listing->id}", [
                'latitude' => 23.7509,
                'longitude' => 90.3932,
            ]);

        $response->assertStatus(200);

        $this->assertEqualsWithDelta(23.7509, (float) $listing->fresh()->latitude, 0.0001);
        $this->assertEqualsWithDelta(90.3932, (float) $listing->fresh()->longitude, 0.0001);
    }
}
