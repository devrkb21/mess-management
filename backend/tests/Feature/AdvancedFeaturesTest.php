<?php

namespace Tests\Feature;

use App\Models\Bed;
use App\Models\Floor;
use App\Models\Invite;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AdvancedFeaturesTest extends TestCase
{
    use RefreshDatabase;

    public function test_v1_remaining_features_work_end_to_end(): void
    {
        // 1. Setup Owner & Mess
        $owner = User::create([
            'name' => 'Owner Rafiq',
            'email' => 'rafiq@example.com',
            'phone' => '01710000001',
            'password' => 'secret123',
        ]);

        $mess = Mess::create([
            'owner_id' => $owner->id,
            'name' => 'Green Mess Dhanmondi',
            'address' => 'Road 4A, Dhanmondi',
            'city' => 'Dhaka',
            'gender_policy' => 'male',
            'meal_cutoff_breakfast' => '07:00',
            'meal_cutoff_lunch' => '11:00',
            'meal_cutoff_dinner' => '18:00',
        ]);

        $ownerResidency = Residency::create([
            'user_id' => $owner->id,
            'mess_id' => $mess->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => now()->toDateString(),
        ]);

        $floor = Floor::create(['mess_id' => $mess->id, 'name' => '1st Floor', 'sort_order' => 1]);
        $room = Room::create(['floor_id' => $floor->id, 'name' => 'Room 101', 'capacity' => 2]);
        $bed1 = Bed::create(['room_id' => $room->id, 'label' => 'Bed 101-A', 'status' => 'empty']);
        $bed2 = Bed::create(['room_id' => $room->id, 'label' => 'Bed 101-B', 'status' => 'empty']);

        // 2. Test Feature #7: Invite Creation & Preview
        Sanctum::actingAs($owner);
        $inviteRes = $this->postJson("/api/v1/messes/{$mess->id}/invites", [
            'bed_id' => $bed1->id,
            'expires_in_hours' => 24,
        ]);
        $inviteRes->assertStatus(201);
        $code = $inviteRes->json('invite.code');

        // Test GET /invites/{code}
        $previewRes = $this->getJson("/api/v1/invites/{$code}");
        $previewRes->assertStatus(200);
        $previewRes->assertJsonPath('invite.code', $code);
        $previewRes->assertJsonPath('invite.mess.name', 'Green Mess Dhanmondi');

        // 3. Resident Joins with NID, profession, emergency contact (#7, #8)
        $residentUser = User::create([
            'name' => 'New Resident Tanvir',
            'email' => 'tanvir@example.com',
            'phone' => '01820000002',
            'password' => 'secret123',
        ]);
        Sanctum::actingAs($residentUser);

        $joinRes = $this->postJson("/api/v1/invites/{$code}/accept", [
            'nid_number' => '19951234567890',
            'profession_or_institution' => 'Software Engineer, Brain Station',
            'blood_group' => 'B+',
            'emergency_contact_name' => 'Father M. Rahman',
            'emergency_contact_phone' => '01719999999',
        ]);
        $joinRes->assertStatus(200);
        $residencyId = $joinRes->json('residency.id');
        $this->assertNotEmpty($residencyId);

        // 4. Manager 1-Click Approval (#8)
        Sanctum::actingAs($owner);
        $approveRes = $this->postJson("/api/v1/residencies/{$residencyId}/approve");
        $approveRes->assertStatus(200);
        $approveRes->assertJsonPath('residency.status', 'active');
        $this->assertEquals('occupied', $bed1->fresh()->status);

        // 5. Meal Auto-Lock with Cutoff and Manager Override (#10)
        // Simulate past cutoff time for today's breakfast (cutoff was 07:00 AM)
        Carbon::setTestNow(Carbon::today()->setTime(9, 0, 0)); // 9:00 AM today

        // Resident tries to toggle breakfast after 7:00 AM -> Should be 422 Unprocessable
        Sanctum::actingAs($residentUser);
        $residentToggle = $this->postJson("/api/v1/residencies/{$residencyId}/meals", [
            'date' => Carbon::today()->toDateString(),
            'meal_type' => 'breakfast',
            'is_on' => false,
        ]);
        $residentToggle->assertStatus(422);

        // Manager toggles breakfast on behalf of resident -> Should succeed (override!)
        Sanctum::actingAs($owner);
        $managerToggle = $this->postJson("/api/v1/residencies/{$residencyId}/meals", [
            'date' => Carbon::today()->toDateString(),
            'meal_type' => 'breakfast',
            'is_on' => true,
        ]);
        $managerToggle->assertStatus(200);
        $managerToggle->assertJsonPath('meal_log.is_on', true);

        // Reset Carbon test time
        Carbon::setTestNow();

        // 6. Test Minimum Debt Settlement (#16)
        // Log an expense entered by Tanvir
        Sanctum::actingAs($owner);
        $expenseRes = $this->postJson("/api/v1/messes/{$mess->id}/expenses", [
            'date' => now()->toDateString(),
            'amount' => 1500.00,
            'description' => 'Weekly grocery market',
        ]);
        $expenseRes->assertStatus(201);

        $settlementRes = $this->getJson("/api/v1/messes/{$mess->id}/settlements?month=" . now()->format('Y-m'));
        $settlementRes->assertStatus(200);
        $settlementRes->assertJsonStructure([
            'billing_month',
            'total_expenses',
            'balances',
            'transfers',
        ]);

        // 7. Manager All Bills List (#18) & Invoice Show (#17)
        // Generate bills
        $genRes = $this->postJson("/api/v1/messes/{$mess->id}/generate-bills", [
            'billing_month' => now()->format('Y-m'),
        ]);
        $genRes->assertStatus(200);

        // Fetch manager bill roster
        $rosterRes = $this->getJson("/api/v1/messes/{$mess->id}/bills?month=" . now()->format('Y-m'));
        $rosterRes->assertStatus(200);
        $rosterRes->assertJsonStructure(['month', 'summary', 'bills']);
        $firstBillId = $rosterRes->json('bills.0.id');

        // Fetch detailed single invoice
        $invoiceRes = $this->getJson("/api/v1/bills/{$firstBillId}");
        $invoiceRes->assertStatus(200);
        $invoiceRes->assertJsonStructure(['bill', 'fixed_bills', 'total_meals_eaten']);

        // 8. Smart Leave Clearance Listing (#21)
        Sanctum::actingAs($residentUser);
        $leaveRes = $this->postJson("/api/v1/residencies/{$residencyId}/leave", [
            'planned_leave_date' => now()->addDays(15)->toDateString(),
        ]);
        $leaveRes->assertStatus(201);

        Sanctum::actingAs($owner);
        $leaveListRes = $this->getJson("/api/v1/messes/{$mess->id}/leaves");
        $leaveListRes->assertStatus(200);
        $leaveListRes->assertJsonCount(1, 'leaves');
        $leaveId = $leaveListRes->json('leaves.0.id');

        // Finalize clearance & verify bed is freed
        $clearRes = $this->postJson("/api/v1/leave/{$leaveId}/clear");
        $clearRes->assertStatus(200);
        $this->assertEquals('empty', $bed1->fresh()->status);
        $this->assertEquals('left', Residency::find($residencyId)->status);
    }
}
