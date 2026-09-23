<?php

namespace Tests\Feature;

use App\Models\Bed;
use App\Models\DailyMealLog;
use App\Models\ExpenseEntry;
use App\Models\Floor;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\Room;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AiAnalyticsApiTest extends TestCase
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

        $this->owner = User::factory()->create(['phone' => '01711111111']);
        $this->resident = User::factory()->create(['phone' => '01722222222']);

        $this->mess = Mess::create([
            'owner_id' => $this->owner->id,
            'name' => 'AI Smart Mess',
            'address' => 'Dhanmondi 32, Dhaka',
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

    public function test_scan_receipt_extracts_items_and_total(): void
    {
        $response = $this->actingAs($this->owner)->postJson("/api/v1/messes/{$this->mess->id}/ai/scan-receipt", [
            'raw_text' => "চাল (Miniket Rice) 25kg 1750\nসয়াবিন তেল (Soybean Oil) 5L 900\nডিম (Eggs) 4 dozen 600",
        ]);

        $response->assertStatus(200)
            ->assertJsonPath('items_detected', 3)
            ->assertJsonPath('total_amount', 3250)
            ->assertJsonStructure([
                'mess_id',
                'confidence_score',
                'items_detected',
                'total_amount',
                'items' => [
                    '*' => ['item_name', 'quantity', 'amount'],
                ],
                'receipt_date',
            ]);
    }

    public function test_financial_and_waste_insights(): void
    {
        // Seed 3 meal slots for resident
        foreach (['breakfast', 'lunch', 'dinner'] as $slot) {
            DailyMealLog::create([
                'residency_id' => $this->residency->id,
                'date' => now()->toDateString(),
                'meal_type' => $slot,
                'is_on' => true,
                'checked_in_at' => now(),
                'checked_in_by' => $this->owner->id,
            ]);
        }

        // Seed an expense
        ExpenseEntry::create([
            'mess_id' => $this->mess->id,
            'entered_by' => $this->owner->id,
            'amount' => 600,
            'date' => now()->toDateString(),
            'description' => 'Morning Fresh Vegetables & Fish',
        ]);

        $response = $this->actingAs($this->owner)->getJson("/api/v1/messes/{$this->mess->id}/analytics/financial-waste");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'mess' => ['id', 'name'],
                'month',
                'total_scheduled_meals',
                'checked_in_meals',
                'unattended_meals',
                'waste_rate_percentage',
                'total_expense',
                'effective_meal_rate',
                'waste_status',
                'recommendations',
            ]);

        $this->assertEquals(3, $response->json('total_scheduled_meals'));
        $this->assertEquals(600, $response->json('total_expense'));
    }

    public function test_bilingual_ai_notice_generation(): void
    {
        $response = $this->actingAs($this->owner)->postJson("/api/v1/messes/{$this->mess->id}/ai/generate-notice", [
            'prompt' => 'water tank cleaning tomorrow morning',
            'tone' => 'urgent',
            'category' => 'maintenance',
        ]);

        $response->assertStatus(200)
            ->assertJsonStructure([
                'mess_id',
                'draft' => [
                    'title_bn',
                    'body_bn',
                    'title_en',
                    'body_en',
                    'category',
                    'suggested_pinned',
                ],
            ]);

        $this->assertStringContainsString('পানি', $response->json('draft.title_bn'));
        $this->assertStringContainsString('Water', $response->json('draft.title_en'));
    }

    public function test_predictive_budget_and_burn_rate(): void
    {
        ExpenseEntry::create([
            'mess_id' => $this->mess->id,
            'entered_by' => $this->owner->id,
            'amount' => 1500,
            'date' => now()->toDateString(),
            'description' => 'Weekly bazar',
        ]);

        $response = $this->actingAs($this->owner)->getJson("/api/v1/messes/{$this->mess->id}/analytics/predictive-budget");

        $response->assertStatus(200)
            ->assertJsonStructure([
                'mess' => ['id', 'name'],
                'spent_so_far',
                'daily_burn_rate',
                'projected_month_end_expense',
                'active_members_count',
                'budget_status',
            ]);

        $this->assertEquals(1500, $response->json('spent_so_far'));
        $this->assertGreaterThan(0, $response->json('daily_burn_rate'));
    }

    public function test_occupancy_analytics_dashboard(): void
    {
        $floor = Floor::create(['mess_id' => $this->mess->id, 'floor_number' => 1, 'name' => '1st Floor']);
        $room = Room::create(['floor_id' => $floor->id, 'name' => 'Room 101', 'capacity' => 2]);
        Bed::create(['room_id' => $room->id, 'label' => 'Bed 101-A', 'status' => 'occupied']);
        Bed::create(['room_id' => $room->id, 'label' => 'Bed 101-B', 'status' => 'empty']);

        $response = $this->actingAs($this->owner)->getJson("/api/v1/messes/{$this->mess->id}/analytics/occupancy");

        $response->assertStatus(200)
            ->assertJsonPath('total_beds', 2)
            ->assertJsonPath('occupied_beds', 1)
            ->assertJsonPath('empty_beds', 1);

        $this->assertEquals(50.0, (float)$response->json('occupancy_rate_percentage'));
        $this->assertEquals(50.0, (float)$response->json('vacancy_rate_percentage'));
    }
}
