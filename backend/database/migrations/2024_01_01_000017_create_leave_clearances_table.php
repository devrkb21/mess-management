<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('leave_clearances', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('residency_id');
            $table->date('notice_date');
            $table->date('planned_leave_date');
            $table->decimal('final_dues', 10, 2)->default(0);
            $table->decimal('deposit_refunded', 10, 2)->default(0);
            $table->string('clearance_pdf_url')->nullable();
            $table->enum('status', ['pending', 'cleared'])->default('pending');
            $table->timestamps();

            $table->foreign('residency_id')->references('id')->on('residencies')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('leave_clearances');
    }
};
