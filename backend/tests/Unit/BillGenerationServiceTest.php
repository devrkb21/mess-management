<?php

namespace Tests\Unit;

use App\Models\DailyMealLog;
use App\Models\ExpenseEntry;
use App\Models\FixedBill;
use App\Models\Mess;
use App\Models\MonthlyBill;
use App\Models\Residency;
use App\Models\User;
use App\Services\BillGenerationService;
use App\Services\MealService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillGenerationServiceTest extends TestCase
{
    use RefreshDatabase;

    protected BillGenerationService $billService;
    protected MealService $mealService;
    protected User $owner;
    protected Mess $mess;
    protected Residency $residency1;
    protected Residency $residency2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->mealService = new MealService();
        $this->billService = new BillGenerationService($this->mealService);

        $this->owner = User::create([
            'name' => 'Mess Owner',
            'email' => 'owner@example.com',
            'phone' => '01711000001',
            'password' => 'password123',
        ]);

        $this->mess = Mess::create([
            'owner_id' => $this->owner->id,
            'name' => 'Mirpur Student Mess',
            'address' => 'Mirpur-10, Dhaka',
            'city' => 'Dhaka',
            'gender_policy' => 'male',
            'meal_cutoff_breakfast' => '07:00',
            'meal_cutoff_lunch' => '11:00',
            'meal_cutoff_dinner' => '18:00',
            'bill_split_default' => 'equal',
        ]);

        $user1 = User::create([
            'name' => 'Resident 1',
            'email' => 'res1@example.com',
            'phone' => '01711000002',
            'password' => 'password123',
        ]);

        $user2 = User::create([
            'name' => 'Resident 2',
            'email' => 'res2@example.com',
            'phone' => '01711000003',
            'password' => 'password123',
        ]);

        $this->residency1 = Residency::create([
            'user_id' => $user1->id,
            'mess_id' => $this->mess->id,
            'role' => 'resident',
            'status' => 'active',
            'joined_at' => '2026-09-01',
        ]);

        $this->residency2 = Residency::create([
            'user_id' => $user2->id,
            'mess_id' => $this->mess->id,
            'role' => 'resident',
            'status' => 'active',
            'joined_at' => '2026-09-01',
        ]);
    }

    public function test_equal_split_of_fixed_bills(): void
    {
        // 2 active residents
        FixedBill::create([
            'mess_id' => $this->mess->id,
            'title' => 'WiFi Internet',
            'amount' => 1000.00,
            'billing_month' => '2026-09',
            'split_method' => 'equal',
        ]);

        FixedBill::create([
            'mess_id' => $this->mess->id,
            'title' => 'Cook / Buya Salary',
            'amount' => 3000.00,
            'billing_month' => '2026-09',
            'split_method' => 'equal',
        ]);

        $share1 = $this->billService->calculateFixedBillShare($this->residency1, $this->mess, '2026-09');
        $share2 = $this->billService->calculateFixedBillShare($this->residency2, $this->mess, '2026-09');

        // Total 4000 / 2 = 2000 each
        $this->assertEquals(2000.00, $share1);
        $this->assertEquals(2000.00, $share2);
    }

    public function test_previous_due_carry_forward(): void
    {
        // Create an August bill that was partially unpaid
        MonthlyBill::create([
            'residency_id' => $this->residency1->id,
            'billing_month' => '2026-08',
            'meal_cost_total' => 2000.00,
            'fixed_bill_share_total' => 1500.00,
            'previous_due' => 0.00,
            'total_payable' => 3500.00,
            'status' => 'partially_paid',
            'generated_at' => now(),
        ]);

        $due = $this->billService->getPreviousDue($this->residency1, '2026-09');

        $this->assertEquals(3500.00, $due);
    }

    public function test_complete_bill_generation(): void
    {
        // Add meals for R1
        $date = '2026-09-05';
        DailyMealLog::create([
            'residency_id' => $this->residency1->id,
            'date' => $date,
            'meal_type' => 'lunch',
            'is_on' => true,
        ]);
        DailyMealLog::create([
            'residency_id' => $this->residency2->id,
            'date' => $date,
            'meal_type' => 'lunch',
            'is_on' => true,
        ]);
        ExpenseEntry::create([
            'mess_id' => $this->mess->id,
            'date' => $date,
            'amount' => 200.00, // 100 per meal
            'description' => 'Meat & Rice',
            'entered_by' => $this->owner->id,
        ]);

        // Fixed bills
        FixedBill::create([
            'mess_id' => $this->mess->id,
            'title' => 'House Rent Share',
            'amount' => 10000.00, // 5000 each
            'billing_month' => '2026-09',
            'split_method' => 'equal',
        ]);

        $bill1 = $this->billService->generateBillForResident($this->residency1, '2026-09');

        $this->assertEquals(100.00, (float) $bill1->meal_cost_total);
        $this->assertEquals(5000.00, (float) $bill1->fixed_bill_share_total);
        $this->assertEquals(5100.00, (float) $bill1->total_payable);
        $this->assertEquals('issued', $bill1->status);
    }
}
