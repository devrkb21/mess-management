<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('residencies', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('user_id');
            $table->uuid('mess_id');
            $table->uuid('bed_id')->nullable();
            $table->enum('role', ['owner', 'manager', 'resident'])->default('resident');
            $table->enum('status', ['invited', 'active', 'on_leave', 'left'])->default('invited');
            $table->date('joined_at')->nullable();
            $table->date('left_at')->nullable();
            $table->decimal('security_deposit_amount', 10, 2)->default(0);
            $table->timestamps();

            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();
            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
            $table->foreign('bed_id')->references('id')->on('beds')->nullOnDelete();

            $table->index(['mess_id', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('residencies');
    }
};
