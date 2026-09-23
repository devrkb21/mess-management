<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('bazar_schedules', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('mess_id');
            $table->date('date');
            $table->uuid('assigned_residency_id');
            $table->string('note')->nullable();
            $table->string('status', 20)->default('scheduled'); // scheduled, completed, missed
            $table->uuid('created_by')->nullable();
            $table->timestamps();

            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
            $table->foreign('assigned_residency_id')->references('id')->on('residencies')->cascadeOnDelete();
            $table->foreign('created_by')->references('id')->on('users')->nullOnDelete();

            $table->unique(['mess_id', 'date', 'assigned_residency_id']);
            $table->index(['mess_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('bazar_schedules');
    }
};
