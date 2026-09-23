<?php

namespace App\Services;

use App\Models\ExpenseEntry;
use App\Models\Mess;
use App\Models\Payment;
use App\Models\Residency;
use Carbon\Carbon;

class DebtSettlementService
{
    public function __construct(
        protected MealService $mealService,
        protected BillGenerationService $billGenerationService,
    ) {}

    /**
     * Calculate minimum cash flow settlements among mess members for a given month.
     *
     * @return array{
     *   billing_month: string,
     *   total_expenses: float,
     *   total_meals: int,
     *   balances: array<int, array>,
     *   transfers: array<int, array>,
     *   is_settled: bool
     * }
     */
    public function calculateSettlements(Mess $mess, string $billingMonth): array
    {
        $startDate = Carbon::parse($billingMonth . '-01');
        $endDate = $startDate->copy()->endOfMonth();

        $activeResidencies = Residency::where('mess_id', $mess->id)
            ->whereIn('status', ['active', 'on_leave'])
            ->with(['user:id,name,phone'])
            ->get();

        $balances = [];
        $debtors = [];
        $creditors = [];

        $totalMessExpense = (float) ExpenseEntry::where('mess_id', $mess->id)
            ->whereBetween('date', [$startDate, $endDate])
            ->sum('amount');

        $totalMessMeals = 0;

        foreach ($activeResidencies as $residency) {
            $user = $residency->user;
            if (! $user) {
                continue;
            }

            // 1. Amount paid by resident this month (bazar expense entries entered by them + direct payments)
            $bazarPaid = (float) ExpenseEntry::where('mess_id', $mess->id)
                ->whereBetween('date', [$startDate, $endDate])
                ->where('entered_by', $user->id)
                ->sum('amount');

            $billPaid = (float) Payment::whereHas('monthlyBill', function ($query) use ($residency, $billingMonth) {
                $query->where('residency_id', $residency->id)
                    ->where('billing_month', $billingMonth);
            })->sum('amount');

            $totalPaid = round($bazarPaid + $billPaid, 2);

            // 2. Amount owed by resident this month (meal cost + fixed bill share)
            $mealCost = (float) $this->mealService->calculateResidentMealCostForMonth($residency, $billingMonth);
            $fixedShare = (float) $this->billGenerationService->calculateFixedBillShare($residency, $mess, $billingMonth);
            $totalOwed = round($mealCost + $fixedShare, 2);

            // 3. Count meals eaten
            $logs = $this->mealService->getResidentMealHistory($residency, $billingMonth);
            $residentMeals = (int) $logs->where('is_on', true)->sum(fn ($l) => $l->totalMealCount());
            $totalMessMeals += $residentMeals;

            // 4. Net balance: positive = paid more (creditor), negative = owes mess (debtor)
            $net = round($totalPaid - $totalOwed, 2);

            $entry = [
                'residency_id' => $residency->id,
                'user_id' => $user->id,
                'user_name' => $user->name,
                'user_phone' => $user->phone,
                'total_paid' => $totalPaid,
                'bazar_paid' => $bazarPaid,
                'bill_paid' => $billPaid,
                'total_owed' => $totalOwed,
                'meal_cost' => $mealCost,
                'fixed_share' => $fixedShare,
                'meals_count' => $residentMeals,
                'net_balance' => $net,
                'status' => $net > 0.01 ? 'creditor' : ($net < -0.01 ? 'debtor' : 'settled'),
            ];

            $balances[] = $entry;

            if ($net < -0.01) {
                $debtors[] = [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'phone' => $user->phone,
                    'amount' => abs($net),
                ];
            } elseif ($net > 0.01) {
                $creditors[] = [
                    'user_id' => $user->id,
                    'name' => $user->name,
                    'phone' => $user->phone,
                    'amount' => $net,
                ];
            }
        }

        // 5. Greedy Minimum Cash-Flow algorithm (Splitwise logic)
        $transfers = [];

        while (! empty($debtors) && ! empty($creditors)) {
            // Sort to match largest debtor with largest creditor
            usort($debtors, fn ($a, $b) => $b['amount'] <=> $a['amount']);
            usort($creditors, fn ($a, $b) => $b['amount'] <=> $a['amount']);

            $debtor = &$debtors[0];
            $creditor = &$creditors[0];

            $amount = min($debtor['amount'], $creditor['amount']);
            $amount = round($amount, 2);

            if ($amount > 0.01) {
                $transfers[] = [
                    'from_user_id' => $debtor['user_id'],
                    'from_user_name' => $debtor['name'],
                    'from_user_phone' => $debtor['phone'],
                    'to_user_id' => $creditor['user_id'],
                    'to_user_name' => $creditor['name'],
                    'to_user_phone' => $creditor['phone'],
                    'amount' => $amount,
                ];
            }

            $debtor['amount'] = round($debtor['amount'] - $amount, 2);
            $creditor['amount'] = round($creditor['amount'] - $amount, 2);

            if ($debtor['amount'] <= 0.01) {
                array_shift($debtors);
            }
            if ($creditor['amount'] <= 0.01) {
                array_shift($creditors);
            }
        }

        return [
            'billing_month' => $billingMonth,
            'total_expenses' => $totalMessExpense,
            'total_meals' => $totalMessMeals,
            'balances' => $balances,
            'transfers' => $transfers,
            'is_settled' => empty($transfers),
        ];
    }
}
