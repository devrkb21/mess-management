<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('complaints', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('residency_id');
            $table->uuid('mess_id');
            $table->string('subject', 150);
            $table->text('description');
            $table->enum('status', ['open', 'in_progress', 'resolved', 'closed'])->default('open');
            $table->text('resolved_note')->nullable();
            $table->timestamps();

            $table->foreign('residency_id')->references('id')->on('residencies')->cascadeOnDelete();
            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('complaints');
    }
};
