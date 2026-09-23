<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Add meal check-in columns to daily_meal_logs (#36)
        Schema::table('daily_meal_logs', function (Blueprint $table) {
            $table->timestamp('checked_in_at')->nullable()->after('is_on');
            $table->string('checked_in_by', 50)->nullable()->after('checked_in_at'); // self_qr, manager
        });

        // 2. Visitor & Parcel Passes (#37)
        Schema::create('visitor_passes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('mess_id');
            $table->uuid('residency_id');
            $table->string('pass_code', 10)->unique();
            $table->string('guest_name', 120);
            $table->string('guest_phone', 20)->nullable();
            $table->string('purpose', 50)->default('visitor'); // visitor, delivery_parcel, maintenance
            $table->timestamp('valid_from');
            $table->timestamp('valid_until');
            $table->boolean('is_used')->default(false)->index();
            $table->timestamp('used_at')->nullable();
            $table->uuid('verified_by')->nullable();
            $table->timestamps();

            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
            $table->foreign('residency_id')->references('id')->on('residencies')->cascadeOnDelete();
            $table->foreign('verified_by')->references('id')->on('users')->nullOnDelete();

            $table->index(['mess_id', 'is_used']);
            $table->index(['residency_id', 'valid_until']);
        });

        // 3. Tenancy Agreements & Digital Contracts (#38)
        Schema::create('tenancy_agreements', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('mess_id');
            $table->uuid('residency_id');
            $table->decimal('monthly_rent', 10, 2);
            $table->decimal('security_deposit', 10, 2)->default(0);
            $table->integer('notice_period_days')->default(30);
            $table->text('agreement_terms')->nullable();
            $table->string('status', 30)->default('pending_signature'); // draft, pending_signature, signed, terminated
            $table->timestamp('signed_at')->nullable();
            $table->string('signed_ip', 45)->nullable();
            $table->string('signature_name', 120)->nullable();
            $table->timestamps();

            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
            $table->foreign('residency_id')->references('id')->on('residencies')->cascadeOnDelete();

            $table->unique(['mess_id', 'residency_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('tenancy_agreements');
        Schema::dropIfExists('visitor_passes');

        Schema::table('daily_meal_logs', function (Blueprint $table) {
            $table->dropColumn(['checked_in_at', 'checked_in_by']);
        });
    }
};
