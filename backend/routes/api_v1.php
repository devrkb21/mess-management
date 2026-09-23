<?php

use App\Http\Controllers\Api\V1\Admin\SuperadminController;
use App\Http\Controllers\Api\V1\AiAnalyticsController;
use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BillController;
use App\Http\Controllers\Api\V1\BookingApplicationController;
use App\Http\Controllers\Api\V1\ComplaintController;
use App\Http\Controllers\Api\V1\DashboardController;
use App\Http\Controllers\Api\V1\ExpenseController;
use App\Http\Controllers\Api\V1\FloorRoomBedController;
use App\Http\Controllers\Api\V1\InquiryController;
use App\Http\Controllers\Api\V1\LeaveController;
use App\Http\Controllers\Api\V1\MarketplaceController;
use App\Http\Controllers\Api\V1\MealController;
use App\Http\Controllers\Api\V1\MessController;
use App\Http\Controllers\Api\V1\NoticeController;
use App\Http\Controllers\Api\V1\NotificationController;
use App\Http\Controllers\Api\V1\ResidentController;
use App\Http\Controllers\Api\V1\SecurityController;
use App\Http\Controllers\Api\V1\TrustCommunityController;
use App\Http\Controllers\Api\V1\VisitScheduleController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API v1 Routes — Mess Management Platform
|--------------------------------------------------------------------------
*/

// ── Auth (public) ────────────────────────────────────────────────────────
Route::prefix('auth')->group(function () {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);

    Route::middleware('auth:sanctum')->group(function () {
        Route::post('/logout', [AuthController::class, 'logout']);
    });
});

// ── Marketplace (public with optional auth) ──────────────────────────────
Route::get('/marketplace/listings', [MarketplaceController::class, 'index']);
Route::get('/marketplace/listings/{id}', [MarketplaceController::class, 'show']);
Route::get('/marketplace/listings/{id}/share-qr', [MarketplaceController::class, 'shareQr']);

// ── Public Trust & Reviews (#39, #40) ────────────────────────────────────
Route::get('/messes/{mess}/trust-score', [TrustCommunityController::class, 'getMessTrustScore']);
Route::get('/users/{user}/trust-score', [TrustCommunityController::class, 'getUserTrustScore']);

// ── Protected routes ─────────────────────────────────────────────────────
Route::middleware('auth:sanctum')->group(function () {

    // Current user
    Route::get('/me', [AuthController::class, 'me']);

    // Create mess (any authenticated user)
    Route::post('/messes', [MessController::class, 'store']);

    // ── Mess-specific routes ─────────────────────────────────────────────
    Route::prefix('messes/{mess}')->group(function () {

        // Any member can view
        Route::middleware('mess.role')->group(function () {
            Route::get('/', [MessController::class, 'show']);
            Route::get('/dashboard', [DashboardController::class, 'index']);
            Route::get('/meal-rate/today', [MealController::class, 'todayRate']);
            Route::get('/meals', [MealController::class, 'messDailyMeals']);
            Route::get('/notices', [NoticeController::class, 'index']);
            Route::get('/expenses', [ExpenseController::class, 'listExpenses']);
            Route::post('/expenses', [ExpenseController::class, 'storeExpense']); // Manager OR assigned duty resident
            Route::get('/bazar-schedules', [ExpenseController::class, 'getBazarSchedules']);
            Route::get('/settlements', [ExpenseController::class, 'getSettlements']);

            // Smart Security (Member actions) (#36, #37)
            Route::get('/dining-token', [SecurityController::class, 'getDiningToken']);
            Route::post('/meal-checkin', [SecurityController::class, 'checkInMeal']);
            Route::post('/visitor-passes', [SecurityController::class, 'createVisitorPass']);
        });

        // Owner/Manager only
        Route::middleware('mess.role:owner,manager')->group(function () {
            Route::patch('/', [MessController::class, 'update']);

            // Structure
            Route::post('/floors', [FloorRoomBedController::class, 'storeFloor']);
            Route::get('/beds', [FloorRoomBedController::class, 'listBeds']);

            // Residents
            Route::post('/invites', [ResidentController::class, 'createInvite']);
            Route::get('/residents', [ResidentController::class, 'index']);

            // Bazar duty assignment
            Route::post('/bazar-schedules', [ExpenseController::class, 'assignBazarSchedule']);

            // Fixed expenses
            Route::post('/fixed-bills', [ExpenseController::class, 'storeFixedBill']);

            // Billing
            Route::get('/bills', [BillController::class, 'messBills']);
            Route::post('/generate-bills', [BillController::class, 'generate']);

            // Leave clearances review
            Route::get('/leaves', [LeaveController::class, 'listMessLeaves']);

            // Notices
            Route::post('/notices', [NoticeController::class, 'store']);

            // Complaints
            Route::get('/complaints', [ComplaintController::class, 'index']);

            // Vacations list
            Route::get('/vacations', [MealController::class, 'listVacations']);

            // Marketplace management for mess
            Route::post('/listings', [MarketplaceController::class, 'store']);
            Route::get('/listings', [MarketplaceController::class, 'messListings']);
            Route::get('/applications', [BookingApplicationController::class, 'messApplications']);
            Route::get('/visits', [VisitScheduleController::class, 'messVisits']);
            Route::get('/waiting-list', [BookingApplicationController::class, 'messWaitingList']);

            // Smart Security (Manager & Gatekeeper actions) (#36, #37, #38)
            Route::get('/meal-checkins', [SecurityController::class, 'getMealCheckInRoster']);
            Route::get('/visitor-passes', [SecurityController::class, 'messVisitorPasses']);
            Route::post('/visitor-passes/verify', [SecurityController::class, 'verifyVisitorPass']);
            Route::get('/agreements', [SecurityController::class, 'messAgreements']);

            // Layer 9: AI & Advanced Analytics (#42 to #46)
            Route::post('/ai/scan-receipt', [AiAnalyticsController::class, 'scanReceipt']);
            Route::get('/analytics/financial-waste', [AiAnalyticsController::class, 'financialWaste']);
            Route::post('/ai/generate-notice', [AiAnalyticsController::class, 'generateNotice']);
            Route::get('/analytics/predictive-budget', [AiAnalyticsController::class, 'predictiveBudget']);
            Route::get('/analytics/occupancy', [AiAnalyticsController::class, 'occupancyAnalytics']);
        });

        // Join waiting list (any auth user)
        Route::post('/waiting-list', [BookingApplicationController::class, 'joinWaitingList']);
    });

    // ── Floor/Room/Bed routes ─────────────────────────────────────────────
    Route::post('/floors/{floor}/rooms', [FloorRoomBedController::class, 'storeRoom']);
    Route::post('/rooms/{room}/beds', [FloorRoomBedController::class, 'storeBed']);

    // ── Invite routes ────────────────────────────────────────────────────
    Route::get('/invites/{code}', [ResidentController::class, 'showInvite']);
    Route::post('/invites/{code}/accept', [ResidentController::class, 'acceptInvite']);
    Route::post('/invites/{code}/approve', [ResidentController::class, 'approveInvite']);

    // ── Residency-level routes ───────────────────────────────────────────
    Route::get('/residencies/{residency}', [ResidentController::class, 'show']);
    Route::post('/residencies/{residency}/approve', [ResidentController::class, 'approveResidency']);
    Route::post('/residencies/{residency}/meals', [MealController::class, 'toggle']);
    Route::get('/residencies/{residency}/meals', [MealController::class, 'history']);
    Route::post('/residencies/{residency}/vacation', [MealController::class, 'submitVacation']);
    Route::post('/residencies/{residency}/complaints', [ComplaintController::class, 'store']);
    Route::post('/residencies/{residency}/leave', [LeaveController::class, 'submitLeave']);
    Route::get('/residencies/{residency}/bills', [BillController::class, 'index']);

    // ── Vacation approval ────────────────────────────────────────────────
    Route::patch('/vacation/{vacation}/approve', [MealController::class, 'approveVacation']);

    // ── Bazar schedule delete ────────────────────────────────────────────
    Route::delete('/bazar-schedules/{schedule}', [ExpenseController::class, 'deleteBazarSchedule']);

    // ── Complaint update ─────────────────────────────────────────────────
    Route::patch('/complaints/{complaint}', [ComplaintController::class, 'update']);

    // ── Bill PDF, show & payments ─────────────────────────────────────────
    Route::get('/bills/{bill}', [BillController::class, 'show']);
    Route::get('/bills/{bill}/pdf', [BillController::class, 'downloadPdf']);
    Route::post('/bills/{bill}/payments', [BillController::class, 'recordPayment']);

    // ── Leave clearance ──────────────────────────────────────────────────
    Route::post('/leave/{leave}/clear', [LeaveController::class, 'finalizeClearance']);

    // ── Notifications ────────────────────────────────────────────────────
    Route::get('/notifications', [NotificationController::class, 'index']);
    Route::patch('/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    // ── Marketplace Authenticated Actions ─────────────────────────────────
    Route::post('/marketplace/listings/{id}/favorite', [MarketplaceController::class, 'toggleFavorite']);
    Route::get('/marketplace/favorites', [MarketplaceController::class, 'favorites']);
    Route::patch('/marketplace/listings/{id}', [MarketplaceController::class, 'update']);
    Route::delete('/marketplace/listings/{id}', [MarketplaceController::class, 'destroy']);

    // ── Applications ─────────────────────────────────────────────────────
    Route::post('/marketplace/listings/{id}/apply', [BookingApplicationController::class, 'apply']);
    Route::get('/booking-applications/my', [BookingApplicationController::class, 'myApplications']);
    Route::post('/booking-applications/{id}/decision', [BookingApplicationController::class, 'decide']);

    // ── Inquiries & Chat ─────────────────────────────────────────────────
    Route::get('/inquiries', [InquiryController::class, 'threads']);
    Route::get('/inquiries/{id}', [InquiryController::class, 'showThread']);
    Route::post('/marketplace/listings/{id}/inquire', [InquiryController::class, 'startOrSendMessage']);
    Route::post('/inquiries/{id}/messages', [InquiryController::class, 'reply']);

    // ── Physical Visits ──────────────────────────────────────────────────
    Route::post('/marketplace/listings/{id}/visits', [VisitScheduleController::class, 'schedule']);
    Route::get('/visits/my', [VisitScheduleController::class, 'myVisits']);
    Route::patch('/visits/{id}/status', [VisitScheduleController::class, 'updateStatus']);

    // ── Smart Security: Passes & Agreements (#37, #38) ───────────────────
    Route::get('/visitor-passes/my', [SecurityController::class, 'myVisitorPasses']);
    Route::get('/residencies/{residency}/agreement', [SecurityController::class, 'getAgreement']);
    Route::post('/residencies/{residency}/agreement/sign', [SecurityController::class, 'signAgreement']);

    // ── Trust & Community: Reviews, Lifestyle & Matching (#39, #40, #41) ──
    Route::post('/reviews', [TrustCommunityController::class, 'submitReview']);
    Route::get('/lifestyle/profile', [TrustCommunityController::class, 'getLifestyleProfile']);
    Route::post('/lifestyle/profile', [TrustCommunityController::class, 'saveLifestyleProfile']);
    Route::get('/messes/{mess}/compatibility', [TrustCommunityController::class, 'getMessCompatibility']);

    // ── Platform Superadmin (SaaS Control) ───────────────────────────────
    Route::prefix('admin')->middleware('superadmin')->group(function () {
        Route::get('/stats', [SuperadminController::class, 'stats']);
        Route::get('/messes', [SuperadminController::class, 'messes']);
        Route::patch('/messes/{mess}/status', [SuperadminController::class, 'updateMessStatus']);
        Route::get('/users', [SuperadminController::class, 'users']);
        Route::patch('/users/{user}/suspend', [SuperadminController::class, 'updateUserStatus']);
        Route::post('/impersonate/{mess}', [SuperadminController::class, 'impersonateMess']);
    });
});
