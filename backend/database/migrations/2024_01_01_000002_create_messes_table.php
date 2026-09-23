<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('messes', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('owner_id');
            $table->string('name', 150);
            $table->text('address');
            $table->string('city', 80);
            $table->enum('gender_policy', ['male', 'female', 'mixed'])->default('male');
            $table->time('meal_cutoff_breakfast')->default('07:00');
            $table->time('meal_cutoff_lunch')->default('11:00');
            $table->time('meal_cutoff_dinner')->default('18:00');
            $table->enum('bill_split_default', ['equal', 'prorated'])->default('equal');
            $table->string('status', 20)->default('active');
            $table->timestamps();

            $table->foreign('owner_id')->references('id')->on('users')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('messes');
    }
};
