<?php

namespace Tests\Feature;

use App\Models\BazarSchedule;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SuperadminAndBazarTest extends TestCase
{
    use RefreshDatabase;

    public function test_superadmin_can_view_stats_and_manage_messes(): void
    {
        $superadmin = User::create([
            'name' => 'Superadmin',
            'email' => 'admin@test.com',
            'phone' => '01700000001',
            'password' => 'password123',
            'is_superadmin' => true,
        ]);

        $owner = User::create([
            'name' => 'Mess Owner',
            'email' => 'owner@test.com',
            'phone' => '01700000002',
            'password' => 'password123',
        ]);

        $mess = Mess::create([
            'owner_id' => $owner->id,
            'name' => 'Sample Mess',
            'address' => 'Dhaka',
            'city' => 'Dhaka',
            'status' => 'pending',
        ]);

        Sanctum::actingAs($superadmin);

        // Stats
        $statsRes = $this->getJson('/api/v1/admin/stats');
        $statsRes->assertStatus(200)
            ->assertJsonStructure(['total_users', 'total_messes', 'messes_by_status']);

        // List messes
        $messesRes = $this->getJson('/api/v1/admin/messes');
        $messesRes->assertStatus(200);

        // Approve mess
        $statusRes = $this->patchJson("/api/v1/admin/messes/{$mess->id}/status", [
            'status' => 'active',
        ]);
        $statusRes->assertStatus(200);
        $this->assertEquals('active', $mess->fresh()->status);

        // Impersonate mess as owner
        $impersonateRes = $this->postJson("/api/v1/admin/impersonate/{$mess->id}");
        $impersonateRes->assertStatus(200)
            ->assertJsonStructure(['token', 'mess', 'owner']);
    }

    public function test_bazar_duty_allows_assigned_resident_to_log_expense(): void
    {
        $owner = User::create([
            'name' => 'Owner',
            'email' => 'owner@test.com',
            'phone' => '01700000010',
            'password' => 'password123',
        ]);

        $mess = Mess::create([
            'owner_id' => $owner->id,
            'name' => 'Test Mess',
            'address' => 'Dhaka',
            'city' => 'Dhaka',
        ]);

        $ownerRes = Residency::create([
            'user_id' => $owner->id,
            'mess_id' => $mess->id,
            'role' => 'owner',
            'status' => 'active',
        ]);

        $resident = User::create([
            'name' => 'Resident Shopper',
            'email' => 'shopper@test.com',
            'phone' => '01700000011',
            'password' => 'password123',
        ]);

        $residentRes = Residency::create([
            'user_id' => $resident->id,
            'mess_id' => $mess->id,
            'role' => 'resident',
            'status' => 'active',
        ]);

        $today = now()->toDateString();

        // Resident tries to log expense WITHOUT duty -> 403 Forbidden
        Sanctum::actingAs($resident);
        $unauthRes = $this->postJson("/api/v1/messes/{$mess->id}/expenses", [
            'date' => $today,
            'amount' => 500,
            'description' => 'Unauthorized bazar',
        ]);
        $unauthRes->assertStatus(403);

        // Manager assigns bazar duty to Resident
        Sanctum::actingAs($owner);
        $assignRes = $this->postJson("/api/v1/messes/{$mess->id}/bazar-schedules", [
            'date' => $today,
            'assigned_residency_id' => $residentRes->id,
            'note' => 'Friday bazar',
        ]);
        $assignRes->assertStatus(201);

        // Resident now logs expense -> SUCCESS 201
        Sanctum::actingAs($resident);
        $authRes = $this->postJson("/api/v1/messes/{$mess->id}/expenses", [
            'date' => $today,
            'amount' => 500,
            'description' => 'Official bazar',
        ]);
        $authRes->assertStatus(201);
    }
}
