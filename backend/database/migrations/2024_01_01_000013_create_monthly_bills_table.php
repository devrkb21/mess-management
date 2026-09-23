<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('monthly_bills', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('residency_id');
            $table->string('billing_month', 7); // YYYY-MM
            $table->decimal('meal_cost_total', 10, 2)->default(0);
            $table->decimal('fixed_bill_share_total', 10, 2)->default(0);
            $table->decimal('previous_due', 10, 2)->default(0);
            $table->decimal('total_payable', 10, 2)->default(0);
            $table->enum('status', ['draft', 'issued', 'paid', 'partially_paid', 'overdue'])->default('draft');
            $table->string('pdf_url')->nullable();
            $table->timestamp('generated_at')->nullable();
            $table->timestamps();

            $table->foreign('residency_id')->references('id')->on('residencies')->cascadeOnDelete();
            $table->unique(['residency_id', 'billing_month']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('monthly_bills');
    }
};
