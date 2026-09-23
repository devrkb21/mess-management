<?php

namespace Database\Seeders;

use App\Models\Bed;
use App\Models\Complaint;
use App\Models\DailyMealLog;
use App\Models\ExpenseEntry;
use App\Models\FixedBill;
use App\Models\Floor;
use App\Models\Invite;
use App\Models\Mess;
use App\Models\Notice;
use App\Models\Residency;
use App\Models\ResidentProfile;
use App\Models\Room;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        $today = Carbon::today()->toDateString();
        $currentMonth = Carbon::today()->format('Y-m');

        // 1. Create Mess Owner / Manager
        $owner = User::create([
            'name' => 'Rafiqul Islam (Manager)',
            'email' => 'owner@mess.com',
            'phone' => '01711000001',
            'password' => 'password123',
        ]);

        // 2. Create Mess
        $mess = Mess::create([
            'owner_id' => $owner->id,
            'name' => 'Green View Students & Bachelor Mess',
            'address' => 'House 42, Road 7, Sector 4, Uttara',
            'city' => 'Dhaka',
            'gender_policy' => 'male',
            'meal_cutoff_breakfast' => '08:00',
            'meal_cutoff_lunch' => '12:00',
            'meal_cutoff_dinner' => '19:00',
            'bill_split_default' => 'equal',
            'status' => 'active',
        ]);

        // Owner Residency
        Residency::create([
            'user_id' => $owner->id,
            'mess_id' => $mess->id,
            'role' => 'owner',
            'status' => 'active',
            'joined_at' => '2026-01-01',
        ]);

        // 3. Floors & Rooms & Beds
        $floor2 = Floor::create(['mess_id' => $mess->id, 'name' => '2nd Floor', 'sort_order' => 2]);
        $floor3 = Floor::create(['mess_id' => $mess->id, 'name' => '3rd Floor', 'sort_order' => 3]);

        $room201 = Room::create(['floor_id' => $floor2->id, 'name' => 'Room 201', 'capacity' => 3]);
        $room202 = Room::create(['floor_id' => $floor2->id, 'name' => 'Room 202', 'capacity' => 2]);
        $room301 = Room::create(['floor_id' => $floor3->id, 'name' => 'Room 301', 'capacity' => 2]);

        $bed201A = Bed::create(['room_id' => $room201->id, 'label' => 'Bed 201-A', 'status' => 'occupied']);
        $bed201B = Bed::create(['room_id' => $room201->id, 'label' => 'Bed 201-B', 'status' => 'occupied']);
        $bed201C = Bed::create(['room_id' => $room201->id, 'label' => 'Bed 201-C', 'status' => 'empty']);

        $bed202A = Bed::create(['room_id' => $room202->id, 'label' => 'Bed 202-A', 'status' => 'occupied']);
        $bed202B = Bed::create(['room_id' => $room202->id, 'label' => 'Bed 202-B', 'status' => 'empty']);

        $bed301A = Bed::create(['room_id' => $room301->id, 'label' => 'Bed 301-A', 'status' => 'occupied']);
        $bed301B = Bed::create(['room_id' => $room301->id, 'label' => 'Bed 301-B', 'status' => 'empty']);

        // 4. Create Residents
        $residentsData = [
            [
                'name' => 'Mahmud Hasan',
                'email' => 'mahmud@mess.com',
                'phone' => '01811000002',
                'bed' => $bed201A,
                'profession' => 'Software Engineer at AppTech',
                'blood' => 'B+',
                'deposit' => 3000,
            ],
            [
                'name' => 'Tanvir Ahmed',
                'email' => 'tanvir@mess.com',
                'phone' => '01811000003',
                'bed' => $bed201B,
                'profession' => 'CSE Student, Dhaka University',
                'blood' => 'A+',
                'deposit' => 3000,
            ],
            [
                'name' => 'Sadman Sakib',
                'email' => 'sakib@mess.com',
                'phone' => '01811000004',
                'bed' => $bed202A,
                'profession' => 'Senior Officer, City Bank',
                'blood' => 'O+',
                'deposit' => 3000,
            ],
            [
                'name' => 'Siam Hossain',
                'email' => 'siam@mess.com',
                'phone' => '01811000005',
                'bed' => $bed301A,
                'profession' => 'EEE Student, BUET',
                'blood' => 'AB+',
                'deposit' => 3000,
            ],
        ];

        $residencies = [];

        foreach ($residentsData as $r) {
            $user = User::create([
                'name' => $r['name'],
                'email' => $r['email'],
                'phone' => $r['phone'],
                'password' => 'password123',
            ]);

            $residency = Residency::create([
                'user_id' => $user->id,
                'mess_id' => $mess->id,
                'bed_id' => $r['bed']->id,
                'role' => 'resident',
                'status' => 'active',
                'joined_at' => '2026-08-01',
                'security_deposit_amount' => $r['deposit'],
            ]);

            ResidentProfile::create([
                'residency_id' => $residency->id,
                'nid_number' => '1998' . rand(10000000, 99999999),
                'profession_or_institution' => $r['profession'],
                'blood_group' => $r['blood'],
                'emergency_contact_name' => 'Guardian of ' . $r['name'],
                'emergency_contact_phone' => '017' . rand(10000000, 99999999),
            ]);

            $residencies[] = $residency;
        }

        // 5. Daily Meal Logs for today & yesterday
        $dates = [
            Carbon::yesterday()->toDateString(),
            $today,
        ];

        foreach ($dates as $date) {
            foreach ($residencies as $idx => $residency) {
                DailyMealLog::create([
                    'residency_id' => $residency->id,
                    'date' => $date,
                    'meal_type' => 'breakfast',
                    'is_on' => ($idx % 2 === 0), // alternate
                ]);

                DailyMealLog::create([
                    'residency_id' => $residency->id,
                    'date' => $date,
                    'meal_type' => 'lunch',
                    'is_on' => true,
                    'is_guest_meal' => ($idx === 0),
                    'guest_count' => ($idx === 0 ? 1 : 0),
                ]);

                DailyMealLog::create([
                    'residency_id' => $residency->id,
                    'date' => $date,
                    'meal_type' => 'dinner',
                    'is_on' => true,
                ]);
            }
        }

        // 6. Market/Bazar Expense Entries
        ExpenseEntry::create([
            'mess_id' => $mess->id,
            'date' => Carbon::yesterday()->toDateString(),
            'amount' => 540.00,
            'description' => 'Rui Fish (1.5 kg), Rice, Potatoes, Green Chillies',
            'entered_by' => $owner->id,
        ]);

        ExpenseEntry::create([
            'mess_id' => $mess->id,
            'date' => $today,
            'amount' => 680.00,
            'description' => 'Broiler Chicken (2 kg), Onion, Cooking Oil, Lentils (Dal)',
            'entered_by' => $owner->id,
        ]);

        // 7. Fixed Shared Bills
        FixedBill::create([
            'mess_id' => $mess->id,
            'title' => 'WiFi Internet (50 Mbps)',
            'amount' => 1200.00,
            'billing_month' => $currentMonth,
            'split_method' => 'equal',
        ]);

        FixedBill::create([
            'mess_id' => $mess->id,
            'title' => 'Cook / Buya Salary',
            'amount' => 4000.00,
            'billing_month' => $currentMonth,
            'split_method' => 'equal',
        ]);

        FixedBill::create([
            'mess_id' => $mess->id,
            'title' => 'Apartment Monthly Rent Share',
            'amount' => 16000.00,
            'billing_month' => $currentMonth,
            'split_method' => 'equal',
        ]);

        // 8. Notices
        Notice::create([
            'mess_id' => $mess->id,
            'title' => 'Friday Special Khichuri & Beef',
            'body' => 'Everyone please keep your lunch meal ON for Friday. We will have Beef Bhuna and Khichuri for lunch.',
            'posted_by' => $owner->id,
            'pinned' => true,
        ]);

        Notice::create([
            'mess_id' => $mess->id,
            'title' => 'WiFi & Buya Bill collection',
            'body' => 'Please pay your monthly bill share by the 10th of this month to avoid internet interruption.',
            'posted_by' => $owner->id,
            'pinned' => false,
        ]);

        // 9. Complaints
        Complaint::create([
            'residency_id' => $residencies[0]->id,
            'mess_id' => $mess->id,
            'subject' => '2nd floor corridor tube light fused',
            'description' => 'The corridor light between room 201 and 202 is not turning on since yesterday evening.',
            'status' => 'in_progress',
            'resolved_note' => 'Electrician scheduled to visit tomorrow morning.',
        ]);

        // 10. Sample Active Invite Code
        Invite::create([
            'mess_id' => $mess->id,
            'bed_id' => $bed201C->id,
            'code' => 'MESS2026',
            'status' => 'pending',
            'expires_at' => Carbon::now()->addDays(7),
            'created_by' => $owner->id,
        ]);

        // 11. Sample Bazar Schedule Duty (Today: Mahmud Hasan, Tomorrow: Tanvir Ahmed)
        \App\Models\BazarSchedule::create([
            'mess_id' => $mess->id,
            'date' => $today,
            'assigned_residency_id' => $residencies[0]->id, // Mahmud Hasan
            'note' => 'Buy Chicken, Eggs, and Vegetables for dinner',
            'status' => 'scheduled',
            'created_by' => $owner->id,
        ]);

        \App\Models\BazarSchedule::create([
            'mess_id' => $mess->id,
            'date' => Carbon::tomorrow()->toDateString(),
            'assigned_residency_id' => $residencies[1]->id, // Tanvir Ahmed
            'note' => 'Friday beef and polao rice bazar',
            'status' => 'scheduled',
            'created_by' => $owner->id,
        ]);

        // 12. Sample Vacation Request (Sadman Sakib applies for vacation)
        \App\Models\VacationRequest::create([
            'residency_id' => $residencies[2]->id, // Sadman Sakib
            'start_date' => Carbon::today()->addDays(2)->toDateString(),
            'end_date' => Carbon::today()->addDays(6)->toDateString(),
            'reason' => 'Going home to Chittagong for family event',
            'status' => 'pending',
        ]);

        // 13. Create Platform Superadmin (SaaS Owner)
        User::create([
            'name' => 'Platform Superadmin',
            'email' => 'admin@messplatform.com',
            'phone' => '01700000000',
            'password' => 'superadmin123',
            'is_superadmin' => true,
        ]);
    }
}
