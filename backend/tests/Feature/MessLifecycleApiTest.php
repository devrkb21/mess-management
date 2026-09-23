<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class MessLifecycleApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_full_mess_management_workflow(): void
    {
        // 1. Owner registers and authenticates
        $owner = User::create([
            'name' => 'Mess Owner Kabir',
            'email' => 'kabir@example.com',
            'phone' => '01711111111',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($owner);

        // 2. Owner creates a Mess
        $messRes = $this->postJson('/api/v1/messes', [
            'name' => 'Dhanmondi Lake View Mess',
            'address' => 'Road 27, Dhanmondi, Dhaka',
            'city' => 'Dhaka',
            'gender_policy' => 'male',
            'meal_cutoff_breakfast' => '07:30',
            'meal_cutoff_lunch' => '11:30',
            'meal_cutoff_dinner' => '18:30',
            'bill_split_default' => 'equal',
        ]);
        $messRes->assertStatus(201);
        $messId = $messRes->json('mess.id');
        $this->assertNotEmpty($messId);

        // 3. Add Floor, Room, Bed
        $floorRes = $this->postJson("/api/v1/messes/{$messId}/floors", [
            'name' => '3rd Floor',
            'sort_order' => 3,
        ]);
        $floorRes->assertStatus(201);
        $floorId = $floorRes->json('floor.id');

        $roomRes = $this->postJson("/api/v1/floors/{$floorId}/rooms", [
            'name' => 'Room 301',
            'capacity' => 2,
        ]);
        $roomRes->assertStatus(201);
        $roomId = $roomRes->json('room.id');

        $bedRes = $this->postJson("/api/v1/rooms/{$roomId}/beds", [
            'label' => 'Bed A',
        ]);
        $bedRes->assertStatus(201);
        $bedId = $bedRes->json('bed.id');

        // Check beds list
        $bedsList = $this->getJson("/api/v1/messes/{$messId}/beds");
        $bedsList->assertStatus(200);
        $this->assertCount(1, $bedsList->json('beds'));

        // 4. Owner creates Invite
        $inviteRes = $this->postJson("/api/v1/messes/{$messId}/invites", [
            'bed_id' => $bedId,
            'expires_in_hours' => 48,
        ]);
        $inviteRes->assertStatus(201);
        $inviteCode = $inviteRes->json('invite.code');

        // 5. New Resident registers & authenticates
        $residentUser = User::create([
            'name' => 'Mahmud Hasan',
            'email' => 'mahmud@example.com',
            'phone' => '01822222222',
            'password' => 'password123',
        ]);
        Sanctum::actingAs($residentUser);

        // Resident accepts invite
        $acceptRes = $this->postJson("/api/v1/invites/{$inviteCode}/accept", [
            'nid_number' => '19981234567890',
            'profession_or_institution' => 'Software Engineer at TechCorp',
            'blood_group' => 'B+',
            'emergency_contact_name' => 'Hasan Ali (Father)',
            'emergency_contact_phone' => '01700000000',
        ]);
        $acceptRes->assertStatus(200);
        $residencyId = $acceptRes->json('residency.id');

        // 6. Owner approves resident
        Sanctum::actingAs($owner);
        $approveRes = $this->postJson("/api/v1/invites/{$inviteCode}/approve");
        $approveRes->assertStatus(200);
        $this->assertEquals('active', $approveRes->json('residency.status'));
        $this->assertEquals('occupied', $approveRes->json('residency.bed.status'));

        // 7. Resident logs a meal
        Sanctum::actingAs($residentUser);
        $mealDate = '2026-10-15';
        $mealRes = $this->postJson("/api/v1/residencies/{$residencyId}/meals", [
            'date' => $mealDate,
            'meal_type' => 'lunch',
            'is_on' => true,
            'guest_count' => 1,
        ]);
        $mealRes->assertStatus(200);
        $this->assertTrue($mealRes->json('meal_log.is_on'));

        // 8. Owner logs market expense
        Sanctum::actingAs($owner);
        $expRes = $this->postJson("/api/v1/messes/{$messId}/expenses", [
            'date' => $mealDate,
            'amount' => 400.00,
            'description' => 'Beef, Rice, Lentils',
        ]);
        $expRes->assertStatus(201);

        // 9. Check live meal rate (as resident)
        Sanctum::actingAs($residentUser);
        $rateRes = $this->getJson("/api/v1/messes/{$messId}/meal-rate/today");
        $rateRes->assertStatus(200);

        // 10. Owner adds fixed bill
        Sanctum::actingAs($owner);
        $fixedRes = $this->postJson("/api/v1/messes/{$messId}/fixed-bills", [
            'title' => 'House Rent Oct',
            'amount' => 12000.00,
            'billing_month' => '2026-10',
            'split_method' => 'equal',
        ]);
        $fixedRes->assertStatus(201);

        // 11. Generate monthly bills (Owner)
        $genBillsRes = $this->postJson("/api/v1/messes/{$messId}/generate-bills", [
            'billing_month' => '2026-10',
        ]);
        $genBillsRes->assertStatus(200);

        // Resident checks their bills
        Sanctum::actingAs($residentUser);
        $billsRes = $this->getJson("/api/v1/residencies/{$residencyId}/bills");
        $billsRes->assertStatus(200);
        $this->assertNotEmpty($billsRes->json('bills'));
        $billId = $billsRes->json('bills.0.id');

        // 12. Manager records a payment for the bill
        Sanctum::actingAs($owner);
        $paymentRes = $this->postJson("/api/v1/bills/{$billId}/payments", [
            'amount' => 1000.00,
            'method' => 'cash',
            'paid_at' => '2026-10-20',
            'note' => 'Partial cash payment',
        ]);
        $paymentRes->assertStatus(201);
        $this->assertEquals('partially_paid', $paymentRes->json('bill_status'));

        // 13. Notice board (Owner posts, Resident views)
        $noticeRes = $this->postJson("/api/v1/messes/{$messId}/notices", [
            'title' => 'WiFi maintenance this Friday',
            'body' => 'Internet will be down from 2 PM to 5 PM.',
            'pinned' => true,
        ]);
        $noticeRes->assertStatus(201);

        Sanctum::actingAs($residentUser);
        $noticesList = $this->getJson("/api/v1/messes/{$messId}/notices");
        $noticesList->assertStatus(200);
        $this->assertCount(1, $noticesList->json('notices'));

        // 14. Complaint submission (Resident files, Owner resolves)
        $complaintRes = $this->postJson("/api/v1/residencies/{$residencyId}/complaints", [
            'subject' => 'Water tap leaking',
            'description' => 'Washroom tap on 3rd floor is dripping continuously.',
        ]);
        $complaintRes->assertStatus(201);
        $complaintId = $complaintRes->json('complaint.id');

        Sanctum::actingAs($owner);
        $resolveRes = $this->patchJson("/api/v1/complaints/{$complaintId}", [
            'status' => 'resolved',
            'resolved_note' => 'Plumber fixed the seal.',
        ]);
        $resolveRes->assertStatus(200);
        $this->assertEquals('resolved', $resolveRes->json('complaint.status'));

        // 15. Dashboard metrics (Owner)
        $dashRes = $this->getJson("/api/v1/messes/{$messId}/dashboard");
        $dashRes->assertStatus(200);
        $this->assertGreaterThanOrEqual(1, $dashRes->json('active_residents'));

        // 16. Resident submits leave notice, Owner clears
        Sanctum::actingAs($residentUser);
        $leaveRes = $this->postJson("/api/v1/residencies/{$residencyId}/leave", [
            'planned_leave_date' => '2026-11-01',
        ]);
        $leaveRes->assertStatus(201);
        $leaveId = $leaveRes->json('clearance.id');

        Sanctum::actingAs($owner);
        $clearRes = $this->postJson("/api/v1/leave/{$leaveId}/clear");
        $clearRes->assertStatus(200);
        $this->assertEquals('cleared', $clearRes->json('clearance.status'));
    }
}
