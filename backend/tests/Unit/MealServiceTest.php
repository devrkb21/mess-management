<?php

namespace Tests\Unit;

use App\Models\DailyMealLog;
use App\Models\ExpenseEntry;
use App\Models\Mess;
use App\Models\Residency;
use App\Models\User;
use App\Models\VacationRequest;
use App\Services\MealService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class MealServiceTest extends TestCase
{
    use RefreshDatabase;

    protected MealService $mealService;
    protected User $owner;
    protected Mess $mess;
    protected Residency $residency1;
    protected Residency $residency2;

    protected function setUp(): void
    {
        parent::setUp();
        $this->mealService = new MealService();

        $this->owner = User::create([
            'name' => 'Mess Owner',
            'email' => 'owner@example.com',
            'phone' => '01711000001',
            'password' => 'password123',
        ]);

        $this->mess = Mess::create([
            'owner_id' => $this->owner->id,
            'name' => 'Dhaka Central Mess',
            'address' => 'Farmgate, Dhaka',
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

    public function test_total_meals_count_calculation_including_guest_meals(): void
    {
        $date = '2026-09-10';

        // Resident 1 eats breakfast (1) + lunch (1 + 2 guests = 3)
        DailyMealLog::create([
            'residency_id' => $this->residency1->id,
            'date' => $date,
            'meal_type' => 'breakfast',
            'is_on' => true,
        ]);
        DailyMealLog::create([
            'residency_id' => $this->residency1->id,
            'date' => $date,
            'meal_type' => 'lunch',
            'is_on' => true,
            'is_guest_meal' => true,
            'guest_count' => 2,
        ]);

        // Resident 2 eats dinner (1)
        DailyMealLog::create([
            'residency_id' => $this->residency2->id,
            'date' => $date,
            'meal_type' => 'dinner',
            'is_on' => true,
        ]);

        $totalMeals = $this->mealService->getTotalMealsForDate($this->mess, $date);

        // 1 + 3 + 1 = 5 meals
        $this->assertEquals(5, $totalMeals);
    }

    public function test_daily_meal_rate_calculation(): void
    {
        $date = '2026-09-10';

        // 4 total meals
        DailyMealLog::create([
            'residency_id' => $this->residency1->id,
            'date' => $date,
            'meal_type' => 'lunch',
            'is_on' => true,
        ]);
        DailyMealLog::create([
            'residency_id' => $this->residency1->id,
            'date' => $date,
            'meal_type' => 'dinner',
            'is_on' => true,
        ]);
        DailyMealLog::create([
            'residency_id' => $this->residency2->id,
            'date' => $date,
            'meal_type' => 'lunch',
            'is_on' => true,
        ]);
        DailyMealLog::create([
            'residency_id' => $this->residency2->id,
            'date' => $date,
            'meal_type' => 'dinner',
            'is_on' => true,
        ]);

        // Market grocery cost = 300 BDT
        ExpenseEntry::create([
            'mess_id' => $this->mess->id,
            'date' => $date,
            'amount' => 300.00,
            'description' => 'Fish, Vegetables, Spices',
            'entered_by' => $this->owner->id,
        ]);

        $rate = $this->mealService->calculateDailyMealRate($this->mess, $date);

        // 300 / 4 = 75.00 BDT per meal
        $this->assertEquals(75.00, $rate);
    }

    public function test_resident_monthly_meal_cost(): void
    {
        $date = '2026-09-15';

        // R1: 2 meals, R2: 1 meal => 3 meals total
        DailyMealLog::create([
            'residency_id' => $this->residency1->id,
            'date' => $date,
            'meal_type' => 'lunch',
            'is_on' => true,
        ]);
        DailyMealLog::create([
            'residency_id' => $this->residency1->id,
            'date' => $date,
            'meal_type' => 'dinner',
            'is_on' => true,
        ]);
        DailyMealLog::create([
            'residency_id' => $this->residency2->id,
            'date' => $date,
            'meal_type' => 'lunch',
            'is_on' => true,
        ]);

        // Grocery: 150 BDT => 150 / 3 = 50 BDT / meal
        ExpenseEntry::create([
            'mess_id' => $this->mess->id,
            'date' => $date,
            'amount' => 150.00,
            'description' => 'Chicken and Rice',
            'entered_by' => $this->owner->id,
        ]);

        $r1Cost = $this->mealService->calculateResidentMealCostForMonth($this->residency1, '2026-09');
        $r2Cost = $this->mealService->calculateResidentMealCostForMonth($this->residency2, '2026-09');

        // R1: 2 meals * 50 = 100
        $this->assertEquals(100.00, $r1Cost);
        // R2: 1 meal * 50 = 50
        $this->assertEquals(50.00, $r2Cost);
    }

    public function test_vacation_blocks_meal_toggling(): void
    {
        VacationRequest::create([
            'residency_id' => $this->residency1->id,
            'start_date' => '2026-10-01',
            'end_date' => '2026-10-05',
            'reason' => 'Going home for vacation',
            'status' => 'approved',
        ]);

        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('You are on vacation for this date');

        $this->mealService->toggleMeal($this->residency1, '2026-10-02', 'lunch', true);
    }
}
