<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payments', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('monthly_bill_id');
            $table->decimal('amount', 10, 2);
            $table->enum('method', ['cash', 'bank', 'mobile_banking', 'other'])->default('cash');
            $table->string('note', 200)->nullable();
            $table->uuid('recorded_by');
            $table->date('paid_at');
            $table->timestamps();

            $table->foreign('monthly_bill_id')->references('id')->on('monthly_bills')->cascadeOnDelete();
            $table->foreign('recorded_by')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('payments');
    }
};
