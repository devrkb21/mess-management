<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('floors', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('mess_id');
            $table->string('name', 50);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('floors');
    }
};
