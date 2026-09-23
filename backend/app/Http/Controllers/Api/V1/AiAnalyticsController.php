<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Mess;
use App\Services\AiNoticeService;
use App\Services\AnalyticsService;
use App\Services\ReceiptScannerService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class AiAnalyticsController extends Controller
{
    public function __construct(
        protected ReceiptScannerService $scannerService,
        protected AnalyticsService $analyticsService,
        protected AiNoticeService $aiNoticeService
    ) {}

    /**
     * AI Handwritten Receipt OCR & Line-Item Parser (#42)
     */
    public function scanReceipt(string $messId, Request $request): JsonResponse
    {
        $mess = Mess::findOrFail($messId);

        $validated = $request->validate([
            'image_url' => 'nullable|string',
            'raw_text' => 'nullable|string',
        ]);

        $result = $this->scannerService->parseReceipt(
            $validated['image_url'] ?? null,
            $validated['raw_text'] ?? null
        );

        return response()->json([
            'mess_id' => $mess->id,
            ...$result,
        ]);
    }

    /**
     * Financial & Waste Insights Engine (#43)
     */
    public function financialWaste(string $messId, Request $request): JsonResponse
    {
        $mess = Mess::findOrFail($messId);
        $month = $request->query('month');

        $insights = $this->analyticsService->getFinancialAndWasteInsights($mess, $month);

        return response()->json([
            'mess' => [
                'id' => $mess->id,
                'name' => $mess->name,
            ],
            ...$insights,
        ]);
    }

    /**
     * Bilingual AI Notice Writer (#44)
     */
    public function generateNotice(string $messId, Request $request): JsonResponse
    {
        $mess = Mess::findOrFail($messId);

        $validated = $request->validate([
            'prompt' => 'required|string|min:3|max:500',
            'tone' => 'nullable|string|in:formal,friendly,urgent',
            'category' => 'nullable|string|max:50',
        ]);

        $noticeDraft = $this->aiNoticeService->generateNotice(
            $validated['prompt'],
            $validated['tone'] ?? 'formal',
            $validated['category'] ?? 'general'
        );

        return response()->json([
            'mess_id' => $mess->id,
            'draft' => $noticeDraft,
        ]);
    }

    /**
     * Predictive Budgeting & Live Burn Rate (#45)
     */
    public function predictiveBudget(string $messId): JsonResponse
    {
        $mess = Mess::findOrFail($messId);
        $budget = $this->analyticsService->getPredictiveBudget($mess);

        return response()->json([
            'mess' => [
                'id' => $mess->id,
                'name' => $mess->name,
            ],
            ...$budget,
        ]);
    }

    /**
     * Occupancy & Vacancy Analytics Dashboard (#46)
     */
    public function occupancyAnalytics(string $messId): JsonResponse
    {
        $mess = Mess::findOrFail($messId);
        $analytics = $this->analyticsService->getOccupancyAnalytics($mess);

        return response()->json([
            'mess' => [
                'id' => $mess->id,
                'name' => $mess->name,
            ],
            ...$analytics,
        ]);
    }
}
