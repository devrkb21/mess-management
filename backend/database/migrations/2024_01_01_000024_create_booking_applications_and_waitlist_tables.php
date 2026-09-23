<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('booking_applications', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->uuid('user_id');
            $table->date('desired_move_in_date');
            $table->string('status', 20)->default('pending'); // pending, accepted, rejected, withdrawn
            $table->text('applicant_note')->nullable();
            $table->string('nid_number', 50)->nullable();
            $table->string('profession', 100)->nullable();
            $table->string('blood_group', 5)->nullable();
            $table->string('emergency_contact_name', 120)->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->text('manager_remarks')->nullable();
            $table->uuid('assigned_bed_id')->nullable();
            $table->timestamps();

            $table->foreign('listing_id')->references('id')->on('listings')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('assigned_bed_id')->references('id')->on('beds')->nullOnDelete();

            $table->index(['listing_id', 'status']);
            $table->index(['user_id', 'status']);
        });

        Schema::create('waiting_lists', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('mess_id');
            $table->uuid('user_id');
            $table->string('preferred_room_type', 50)->nullable();
            $table->decimal('max_budget', 10, 2)->nullable();
            $table->text('note')->nullable();
            $table->timestamp('notified_at')->nullable();
            $table->timestamps();

            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->unique(['mess_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('waiting_lists');
        Schema::dropIfExists('booking_applications');
    }
};
