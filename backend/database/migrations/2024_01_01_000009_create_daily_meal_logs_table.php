<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('daily_meal_logs', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('residency_id');
            $table->date('date');
            $table->enum('meal_type', ['breakfast', 'lunch', 'dinner']);
            $table->boolean('is_on')->default(true);
            $table->boolean('is_guest_meal')->default(false);
            $table->integer('guest_count')->default(0);
            $table->timestamp('locked_at')->nullable();
            $table->timestamps();

            $table->foreign('residency_id')->references('id')->on('residencies')->cascadeOnDelete();
            $table->unique(['residency_id', 'date', 'meal_type']);
            $table->index(['residency_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('daily_meal_logs');
    }
};
