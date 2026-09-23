<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Mess;
use App\Models\MonthlyBill;
use App\Models\Payment;
use App\Models\Residency;
use App\Services\BillGenerationService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class BillController extends Controller
{
    public function __construct(
        protected BillGenerationService $billService,
    ) {}

    /**
     * POST /api/v1/messes/{mess}/generate-bills — Trigger monthly bill generation
     */
    public function generate(Request $request, string $mess): JsonResponse
    {
        $messModel = Mess::findOrFail($mess);

        $validated = $request->validate([
            'billing_month' => ['required', 'regex:/^\d{4}-\d{2}$/'],
        ]);

        $bills = $this->billService->generateMonthlyBills(
            $messModel,
            $validated['billing_month'],
        );

        $bills->each(fn ($b) => $b->load('residency.user:id,name'));

        return response()->json([
            'message' => 'Bills generated for ' . $validated['billing_month'] . '.',
            'bills_count' => $bills->count(),
            'bills' => $bills,
        ]);
    }

    /**
     * GET /api/v1/residencies/{residency}/bills — Bill history
     */
    public function index(Request $request, string $residency): JsonResponse
    {
        $residencyModel = Residency::findOrFail($residency);

        $bills = MonthlyBill::where('residency_id', $residencyModel->id)
            ->with('payments')
            ->orderBy('billing_month', 'desc')
            ->get()
            ->map(function ($bill) {
                $bill->total_paid = $bill->totalPaid();
                $bill->remaining_due = $bill->remainingDue();
                return $bill;
            });

        return response()->json(['bills' => $bills]);
    }

    /**
     * GET /api/v1/messes/{mess}/bills?month=YYYY-MM
     * List all resident bills for a given month in this mess.
     */
    public function messBills(Request $request, string $mess): JsonResponse
    {
        $month = $request->query('month', now()->format('Y-m'));

        $bills = MonthlyBill::whereHas('residency', function ($query) use ($mess) {
            $query->where('mess_id', $mess);
        })
            ->where('billing_month', $month)
            ->with([
                'residency.user:id,name,phone,email',
                'residency.bed:id,label',
                'payments',
            ])
            ->get()
            ->map(function ($bill) {
                $bill->total_paid = $bill->totalPaid();
                $bill->remaining_due = $bill->remainingDue();
                return $bill;
            });

        $totalPayable = $bills->sum('total_payable');
        $totalCollected = $bills->sum('total_paid');
        $totalDues = $bills->sum('remaining_due');

        return response()->json([
            'month' => $month,
            'summary' => [
                'total_billed' => round($totalPayable, 2),
                'total_collected' => round($totalCollected, 2),
                'total_remaining_dues' => round($totalDues, 2),
                'total_residents' => $bills->count(),
            ],
            'bills' => $bills,
        ]);
    }

    /**
     * GET /api/v1/bills/{bill} — Detailed single invoice for print/view
     */
    public function show(string $bill): JsonResponse
    {
        $billModel = MonthlyBill::with([
            'residency.user:id,name,email,phone',
            'residency.bed:id,label',
            'residency.mess:id,name,address,city,owner_id',
            'payments.recordedByUser:id,name',
        ])->findOrFail($bill);

        $billModel->total_paid = $billModel->totalPaid();
        $billModel->remaining_due = $billModel->remainingDue();

        $fixedBills = \App\Models\FixedBill::where('mess_id', $billModel->residency->mess_id)
            ->where('billing_month', $billModel->billing_month)
            ->get();

        $startDate = \Carbon\Carbon::parse($billModel->billing_month . '-01');
        $endDate = $startDate->copy()->endOfMonth();

        $mealLogs = \App\Models\DailyMealLog::where('residency_id', $billModel->residency_id)
            ->where('is_on', true)
            ->whereBetween('date', [$startDate, $endDate])
            ->get();

        $totalMealsEaten = $mealLogs->sum(fn ($l) => $l->totalMealCount());

        return response()->json([
            'bill' => $billModel,
            'fixed_bills' => $fixedBills,
            'total_meals_eaten' => $totalMealsEaten,
        ]);
    }

    /**
     * GET /api/v1/bills/{bill}/pdf — Download invoice PDF
     * Returns full invoice payload for print rendering.
     */
    public function downloadPdf(string $bill): JsonResponse
    {
        return $this->show($bill);
    }

    /**
     * POST /api/v1/bills/{bill}/payments — Record a payment
     */
    public function recordPayment(Request $request, string $bill): JsonResponse
    {
        $billModel = MonthlyBill::findOrFail($bill);

        $validated = $request->validate([
            'amount' => ['required', 'numeric', 'min:0.01'],
            'method' => ['required', 'in:cash,bank,mobile_banking,other'],
            'note' => ['sometimes', 'nullable', 'string', 'max:200'],
            'paid_at' => ['required', 'date'],
        ]);

        $payment = Payment::create([
            'monthly_bill_id' => $billModel->id,
            ...$validated,
            'recorded_by' => $request->user()->id,
        ]);

        // Update bill status
        if ($billModel->isPaid()) {
            $billModel->update(['status' => 'paid']);
        } else {
            $billModel->update(['status' => 'partially_paid']);
        }

        // Refresh to get updated status
        $billModel->refresh();

        return response()->json([
            'message' => 'Payment recorded.',
            'payment' => $payment,
            'bill_status' => $billModel->status,
            'remaining_due' => $billModel->remainingDue(),
        ], 201);
    }
}
