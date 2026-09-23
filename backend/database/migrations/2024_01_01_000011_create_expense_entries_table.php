<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('expense_entries', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('mess_id');
            $table->date('date');
            $table->decimal('amount', 10, 2);
            $table->string('description', 200);
            $table->string('receipt_photo_url')->nullable();
            $table->uuid('entered_by');
            $table->timestamps();

            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
            $table->foreign('entered_by')->references('id')->on('users')->cascadeOnDelete();
            $table->index(['mess_id', 'date']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('expense_entries');
    }
};
