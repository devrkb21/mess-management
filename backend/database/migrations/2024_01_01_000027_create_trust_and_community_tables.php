<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // 1. Two-Way Exit Reviews (#39)
        Schema::create('reviews', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('mess_id');
            $table->uuid('reviewer_id');
            $table->uuid('reviewee_id')->nullable(); // null if reviewing the mess itself
            $table->uuid('residency_id')->nullable();
            $table->uuid('leave_clearance_id')->nullable();
            $table->enum('type', ['manager_to_resident', 'resident_to_mess'])->default('resident_to_mess');
            
            // Ratings (1-5)
            $table->unsignedTinyInteger('rating_overall')->default(5);
            $table->unsignedTinyInteger('rating_punctuality')->nullable(); // bills / rent
            $table->unsignedTinyInteger('rating_cleanliness')->nullable();
            $table->unsignedTinyInteger('rating_compliance')->nullable();  // discipline / rules
            $table->unsignedTinyInteger('rating_food')->nullable();        // mess food quality
            
            $table->text('comment')->nullable();
            $table->timestamps();

            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
            $table->foreign('reviewer_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('reviewee_id')->references('id')->on('users')->nullOnDelete();
            $table->foreign('residency_id')->references('id')->on('residencies')->nullOnDelete();
            $table->foreign('leave_clearance_id')->references('id')->on('leave_clearances')->nullOnDelete();

            $table->index(['mess_id', 'type']);
            $table->index('reviewee_id');
            $table->index('reviewer_id');
        });

        // 2. Lifestyle Profiles (#41)
        Schema::create('lifestyle_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id')->unique();
            $table->enum('sleep_schedule', ['early_bird', 'night_owl', 'flexible'])->default('flexible');
            $table->enum('study_work_habits', ['silent', 'moderate', 'lively'])->default('moderate');
            $table->enum('cleanliness_level', ['strict', 'moderate', 'relaxed'])->default('moderate');
            $table->enum('smoking_policy', ['non_smoker', 'smoker_outside', 'no_preference'])->default('non_smoker');
            $table->enum('guest_frequency', ['rare', 'occasional', 'frequent'])->default('occasional');
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lifestyle_profiles');
        Schema::dropIfExists('reviews');
    }
};
