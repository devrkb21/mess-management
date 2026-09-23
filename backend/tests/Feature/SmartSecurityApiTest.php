<?php

namespace Tests\Feature;

use App\Models\DailyMealLog;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\TenancyAgreement;
use App\Models\User;
use App\Models\VisitorPass;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class SmartSecurityApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_smart_security_suite(): void
    {
        // 1. Setup Mess, Owner, and Resident
        $owner = User::create([
            'name' => 'Owner Anis',
            'email' => 'anis@example.com',
            'phone' => '01700000001',
            'password' => 'password123',
        ]);

        $mess = Mess::create([
            'owner_id' => $owner->id,
            'name' => 'Uttara Model Mess',
            'address' => 'Sector 4, Uttara, Dhaka',
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

        $residentUser = User::create([
            'name' => 'Resident Shuvo',
            'email' => 'shuvo@example.com',
            'phone' => '01700000002',
            'password' => 'password123',
        ]);

        $residency = Residency::create([
            'user_id' => $residentUser->id,
            'mess_id' => $mess->id,
            'role' => 'resident',
            'status' => 'active',
            'joined_at' => now()->toDateString(),
        ]);

        // 2. Meal QR Dining Hall Check-In (#36)
        Sanctum::actingAs($owner);
        $tokenRes = $this->getJson("/api/v1/messes/{$mess->id}/dining-token");
        $tokenRes->assertStatus(200);
        $slot = $tokenRes->json('meal_type');
        $this->assertNotEmpty($tokenRes->json('token'));

        // Turn meal ON for resident today
        DailyMealLog::create([
            'residency_id' => $residency->id,
            'date' => now()->toDateString(),
            'meal_type' => $slot,
            'is_on' => true,
        ]);

        // Resident checks in
        Sanctum::actingAs($residentUser);
        $checkInRes = $this->postJson("/api/v1/messes/{$mess->id}/meal-checkin", [
            'meal_type' => $slot,
        ]);
        $checkInRes->assertStatus(200);
        $this->assertTrue($checkInRes->json('verified'));

        // Double check-in attempt should be rejected
        $doubleCheckIn = $this->postJson("/api/v1/messes/{$mess->id}/meal-checkin", [
            'meal_type' => $slot,
        ]);
        $doubleCheckIn->assertStatus(422);
        $this->assertFalse($doubleCheckIn->json('verified'));

        // 3. Visitor & Parcel Pass (#37)
        $passRes = $this->postJson("/api/v1/messes/{$mess->id}/visitor-passes", [
            'guest_name' => 'Delivery Rider Tariq',
            'guest_phone' => '01911223344',
            'purpose' => 'delivery_parcel',
            'valid_hours' => 2,
        ]);
        $passRes->assertStatus(201);
        $passCode = $passRes->json('pass.pass_code');
        $this->assertNotEmpty($passCode);

        // Gatekeeper/Manager verifies pass code at the gate
        Sanctum::actingAs($owner);
        $verifyRes = $this->postJson("/api/v1/messes/{$mess->id}/visitor-passes/verify", [
            'pass_code' => $passCode,
        ]);
        $verifyRes->assertStatus(200);
        $this->assertTrue($verifyRes->json('verified'));

        // Verify notification delivered to resident
        $this->assertDatabaseHas('notifications', [
            'user_id' => $residentUser->id,
            'mess_id' => $mess->id,
            'type' => 'visitor_arrived',
        ]);

        // Second verification should fail
        $secondVerify = $this->postJson("/api/v1/messes/{$mess->id}/visitor-passes/verify", [
            'pass_code' => $passCode,
        ]);
        $secondVerify->assertStatus(422);

        // 4. Digital Tenancy Agreement (#38)
        Sanctum::actingAs($residentUser);
        $agreementRes = $this->getJson("/api/v1/residencies/{$residency->id}/agreement");
        $agreementRes->assertStatus(200);
        $this->assertEquals('pending_signature', $agreementRes->json('agreement.status'));

        // Resident signs agreement
        $signRes = $this->postJson("/api/v1/residencies/{$residency->id}/agreement/sign", [
            'signature_name' => 'Shuvo Rahman',
            'terms_accepted' => true,
        ]);
        $signRes->assertStatus(200);
        $this->assertEquals('signed', $signRes->json('agreement.status'));
        $this->assertEquals('Shuvo Rahman', $signRes->json('agreement.signature_name'));
        $this->assertNotNull($signRes->json('agreement.signed_at'));
    }
}
