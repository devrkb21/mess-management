<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\DailyMealLog;
use App\Models\Mess;
use App\Models\Notification;
use App\Models\Residency;
use App\Models\TenancyAgreement;
use App\Models\VisitorPass;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Str;

class SecurityController extends Controller
{
    /**
     * Determine the current meal slot based on hour of day
     */
    private function getCurrentMealSlot(): string
    {
        $hour = (int) now()->format('H');
        if ($hour < 11) {
            return 'breakfast';
        } elseif ($hour < 17) {
            return 'lunch';
        } else {
            return 'dinner';
        }
    }

    // ── 1. QR Dining Meal Check-In (#36) ──────────────────────────────────

    /**
     * GET /api/v1/messes/{mess}/dining-token
     * Generates rotating dining hall QR token & live meal status
     */
    public function getDiningToken(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $slot = $request->query('meal_type', $this->getCurrentMealSlot());
        $today = now()->toDateString();

        // Secure daily token
        $rawToken = "DINING:{$messModel->id}:{$today}:{$slot}:" . env('APP_KEY');
        $token = hash('sha256', $rawToken);

        // Stats for current slot
        $totalOn = DailyMealLog::whereHas('residency', fn ($q) => $q->where('mess_id', $messModel->id)->where('status', 'active'))
            ->whereDate('date', $today)
            ->where('meal_type', $slot)
            ->where('is_on', true)
            ->count();

        $checkedInCount = DailyMealLog::whereHas('residency', fn ($q) => $q->where('mess_id', $messModel->id)->where('status', 'active'))
            ->whereDate('date', $today)
            ->where('meal_type', $slot)
            ->whereNotNull('checked_in_at')
            ->count();

        return response()->json([
            'mess_id' => $messModel->id,
            'mess_name' => $messModel->name,
            'date' => $today,
            'meal_type' => $slot,
            'token' => $token,
            'qr_payload' => "MESS_DINING:{$messModel->id}:{$slot}:{$token}",
            'total_active_meals' => $totalOn,
            'checked_in_count' => $checkedInCount,
            'pending_count' => max(0, $totalOn - $checkedInCount),
        ]);
    }

    /**
     * POST /api/v1/messes/{mess}/meal-checkin
     * Resident scans dining QR to verify and check in for their meal
     */
    public function checkInMeal(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $user = $request->user();

        $validated = $request->validate([
            'meal_type' => ['sometimes', 'in:breakfast,lunch,dinner'],
            'residency_id' => ['sometimes', 'uuid', 'exists:residencies,id'],
        ]);

        $slot = $validated['meal_type'] ?? $this->getCurrentMealSlot();
        $today = now()->toDateString();

        // Find residency (either specified by manager or current user's residency in this mess)
        $residency = null;
        if (!empty($validated['residency_id'])) {
            $residency = Residency::with('user', 'bed')->findOrFail($validated['residency_id']);
        } else {
            $residency = Residency::with('user', 'bed')
                ->where('user_id', $user->id)
                ->where('mess_id', $messModel->id)
                ->where('status', 'active')
                ->first();
        }

        if (!$residency) {
            return response()->json(['message' => 'No active residency found in this mess.'], 404);
        }

        // Check today's meal log for this slot
        $mealLog = DailyMealLog::where('residency_id', $residency->id)
            ->whereDate('date', $today)
            ->where('meal_type', $slot)
            ->first();

        if (!$mealLog || !$mealLog->is_on) {
            return response()->json([
                'verified' => false,
                'message' => "❌ Meal is OFF for {$slot} today. Check-in denied.",
                'resident' => [
                    'name' => $residency->user->name,
                    'bed' => $residency->bed?->label,
                ],
                'meal_type' => $slot,
            ], 422);
        }

        if ($mealLog->checked_in_at !== null) {
            return response()->json([
                'verified' => false,
                'message' => "⚠️ Meal was already redeemed at {$mealLog->checked_in_at->format('h:i A')}. Double check-in prevented.",
                'resident' => [
                    'name' => $residency->user->name,
                    'bed' => $residency->bed?->label,
                ],
                'checked_in_at' => $mealLog->checked_in_at,
            ], 422);
        }

        // Record check-in
        $mealLog->update([
            'checked_in_at' => now(),
            'checked_in_by' => $user->id === $residency->user_id ? 'self_qr' : 'manager',
        ]);

        return response()->json([
            'verified' => true,
            'message' => "✅ Meal Check-in Verified! Enjoy your {$slot}.",
            'resident' => [
                'id' => $residency->user->id,
                'name' => $residency->user->name,
                'avatar_url' => $residency->user->avatar_url,
                'bed' => $residency->bed?->label,
            ],
            'meal_type' => $slot,
            'checked_in_at' => $mealLog->checked_in_at,
            'guest_count' => $mealLog->guest_count,
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/meal-checkins — Manager live dining hall log
     */
    public function getMealCheckInRoster(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $slot = $request->query('meal_type', $this->getCurrentMealSlot());
        $date = $request->query('date', now()->toDateString());

        $logs = DailyMealLog::with(['residency.user:id,name,phone,avatar_url', 'residency.bed:id,label'])
            ->whereHas('residency', fn ($q) => $q->where('mess_id', $messModel->id)->where('status', 'active'))
            ->whereDate('date', $date)
            ->where('meal_type', $slot)
            ->where('is_on', true)
            ->orderBy('checked_in_at', 'desc')
            ->get();

        return response()->json([
            'date' => $date,
            'meal_type' => $slot,
            'roster' => $logs,
        ]);
    }

    // ── 2. Visitor & Parcel Passes (#37) ──────────────────────────────────

    /**
     * POST /api/v1/messes/{mess}/visitor-passes — Resident creates temporary pass
     */
    public function createVisitorPass(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $user = $request->user();

        $residency = Residency::where('user_id', $user->id)
            ->where('mess_id', $messModel->id)
            ->where('status', 'active')
            ->firstOrFail();

        $validated = $request->validate([
            'guest_name' => ['required', 'string', 'max:120'],
            'guest_phone' => ['sometimes', 'nullable', 'string', 'max:20'],
            'purpose' => ['required', 'in:visitor,delivery_parcel,maintenance,other'],
            'valid_hours' => ['sometimes', 'integer', 'min:1', 'max:72'],
        ]);

        $validHours = $validated['valid_hours'] ?? 4;
        $passCode = strtoupper(Str::random(6));

        $pass = VisitorPass::create([
            'mess_id' => $messModel->id,
            'residency_id' => $residency->id,
            'pass_code' => $passCode,
            'guest_name' => $validated['guest_name'],
            'guest_phone' => $validated['guest_phone'] ?? null,
            'purpose' => $validated['purpose'],
            'valid_from' => now(),
            'valid_until' => now()->addHours($validHours),
            'is_used' => false,
        ]);

        return response()->json([
            'message' => 'Visitor pass generated successfully.',
            'pass' => $pass,
            'qr_data' => "GATE_PASS:{$pass->pass_code}",
        ], 201);
    }

    /**
     * GET /api/v1/visitor-passes/my — Resident's passes
     */
    public function myVisitorPasses(Request $request): JsonResponse
    {
        $user = $request->user();

        $passes = VisitorPass::with(['mess:id,name', 'residency.bed:id,label'])
            ->whereHas('residency', fn ($q) => $q->where('user_id', $user->id))
            ->latest()
            ->paginate(15);

        return response()->json($passes);
    }

    /**
     * POST /api/v1/messes/{mess}/visitor-passes/verify — Gatekeeper verifies pass
     */
    public function verifyVisitorPass(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);
        $verifier = $request->user();

        $validated = $request->validate([
            'pass_code' => ['required', 'string'],
        ]);

        $pass = VisitorPass::with(['residency.user', 'residency.bed'])
            ->where('mess_id', $messModel->id)
            ->where('pass_code', strtoupper(trim($validated['pass_code'])))
            ->first();

        if (!$pass) {
            return response()->json(['message' => 'Invalid pass code.'], 404);
        }

        if ($pass->is_used) {
            return response()->json([
                'verified' => false,
                'message' => "Pass has already been used at {$pass->used_at?->format('h:i A on d M')}.",
                'pass' => $pass,
            ], 422);
        }

        if ($pass->isExpired()) {
            return response()->json([
                'verified' => false,
                'message' => "Pass has expired on {$pass->valid_until->format('h:i A on d M')}.",
                'pass' => $pass,
            ], 422);
        }

        // Mark used
        $pass->update([
            'is_used' => true,
            'used_at' => now(),
            'verified_by' => $verifier->id,
        ]);

        // Real-time alert to resident
        Notification::create([
            'user_id' => $pass->residency->user_id,
            'mess_id' => $messModel->id,
            'type' => 'visitor_arrived',
            'title' => 'Gate Alert: Entry Verified 🚪',
            'body' => "Your {$pass->purpose} \"{$pass->guest_name}\" has been verified and entered the building.",
            'created_at' => now(),
        ]);

        return response()->json([
            'verified' => true,
            'message' => "Entry approved for {$pass->guest_name}.",
            'pass' => $pass,
            'host' => [
                'name' => $pass->residency->user->name,
                'phone' => $pass->residency->user->phone,
                'bed' => $pass->residency->bed?->label,
            ],
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/visitor-passes — Manager / Gatekeeper pass roster
     */
    public function messVisitorPasses(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $passes = VisitorPass::with(['residency.user:id,name,phone', 'residency.bed:id,label', 'verifiedBy:id,name'])
            ->where('mess_id', $messModel->id)
            ->latest()
            ->paginate(20);

        return response()->json($passes);
    }

    // ── 3. Tenancy Agreements & Contracts (#38) ───────────────────────────

    /**
     * GET /api/v1/residencies/{residency}/agreement
     */
    public function getAgreement(Request $request, string $residencyId): JsonResponse
    {
        $residency = Residency::with(['mess.owner', 'user', 'bed.room'])->findOrFail($residencyId);

        // Find or create default agreement
        $agreement = TenancyAgreement::firstOrCreate(
            [
                'mess_id' => $residency->mess_id,
                'residency_id' => $residency->id,
            ],
            [
                'monthly_rent' => 4500,
                'security_deposit' => 3000,
                'notice_period_days' => 30,
                'agreement_terms' => "1. RENT & MEAL PAYMENTS: The resident agrees to pay monthly rent before the 5th of every month. Grocery / meal costs must be settled as calculated by the digital meal rate system.\n2. NOTICE PERIOD: Resident must submit a 30-day advance leave notice on the platform before vacating the bed.\n3. CONDUCT & QUIET HOURS: No smoking or disruptive noise inside rooms between 11:00 PM and 07:00 AM.\n4. FACILITIES & REPAIR: The resident will maintain room cleanliness and will be liable for damages caused to property.\n5. REFUND POLICY: Security deposit will be refunded within 3 days of clearance after adjusting all unpaid utility bills and damage charges.",
                'status' => 'pending_signature',
            ]
        );

        return response()->json([
            'agreement' => $agreement,
            'residency' => $residency,
        ]);
    }

    /**
     * POST /api/v1/residencies/{residency}/agreement/sign — Resident digitally signs contract
     */
    public function signAgreement(Request $request, string $residencyId): JsonResponse
    {
        $residency = Residency::findOrFail($residencyId);
        $user = $request->user();

        if ($user->id !== $residency->user_id && !$user->is_superadmin) {
            return response()->json(['message' => 'Only the resident can sign this tenancy agreement.'], 403);
        }

        $validated = $request->validate([
            'signature_name' => ['required', 'string', 'max:120'],
            'terms_accepted' => ['required', 'accepted'],
        ]);

        $agreement = TenancyAgreement::where('residency_id', $residency->id)->firstOrFail();

        $agreement->update([
            'status' => 'signed',
            'signed_at' => now(),
            'signed_ip' => $request->ip(),
            'signature_name' => $validated['signature_name'],
        ]);

        // Notify mess owner
        Notification::create([
            'user_id' => $residency->mess->owner_id,
            'mess_id' => $residency->mess_id,
            'type' => 'agreement_signed',
            'title' => 'Digital Agreement Signed 📝',
            'body' => "{$user->name} has digitally acknowledged and signed the Mess Tenancy Agreement.",
            'created_at' => now(),
        ]);

        return response()->json([
            'message' => 'Agreement signed successfully! You can download or print your contract copy.',
            'agreement' => $agreement->fresh(),
        ]);
    }

    /**
     * GET /api/v1/messes/{mess}/agreements — Manager roster of contracts
     */
    public function messAgreements(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $agreements = TenancyAgreement::with(['residency.user:id,name,phone,email', 'residency.bed:id,label'])
            ->where('mess_id', $messModel->id)
            ->latest()
            ->get();

        return response()->json($agreements);
    }
}
