<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('inquiry_threads', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->uuid('applicant_id');
            $table->uuid('manager_id');
            $table->string('subject', 150)->nullable();
            $table->timestamps();

            $table->foreign('listing_id')->references('id')->on('listings')->cascadeOnDelete();
            $table->foreign('applicant_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('manager_id')->references('id')->on('users')->cascadeOnDelete();

            $table->unique(['listing_id', 'applicant_id']);
        });

        Schema::create('inquiry_messages', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('thread_id');
            $table->uuid('sender_id');
            $table->text('message');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->foreign('thread_id')->references('id')->on('inquiry_threads')->cascadeOnDelete();
            $table->foreign('sender_id')->references('id')->on('users')->cascadeOnDelete();

            $table->index(['thread_id', 'created_at']);
        });

        Schema::create('visit_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->uuid('user_id');
            $table->date('visit_date');
            $table->string('time_slot', 50); // e.g. "10:00 AM - 12:00 PM"
            $table->string('status', 20)->default('requested'); // requested, confirmed, rescheduled, cancelled, completed
            $table->text('notes')->nullable();
            $table->text('manager_notes')->nullable();
            $table->timestamps();

            $table->foreign('listing_id')->references('id')->on('listings')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->index(['listing_id', 'status']);
            $table->index(['user_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('visit_schedules');
        Schema::dropIfExists('inquiry_messages');
        Schema::dropIfExists('inquiry_threads');
    }
};
