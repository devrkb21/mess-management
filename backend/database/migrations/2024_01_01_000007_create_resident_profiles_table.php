<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('resident_profiles', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('residency_id');
            $table->string('nid_number', 30)->nullable();
            $table->string('nid_photo_url')->nullable();
            $table->string('profession_or_institution', 150)->nullable();
            $table->string('blood_group', 5)->nullable();
            $table->string('emergency_contact_name', 100)->nullable();
            $table->string('emergency_contact_phone', 20)->nullable();
            $table->timestamps();

            $table->foreign('residency_id')->references('id')->on('residencies')->cascadeOnDelete();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('resident_profiles');
    }
};
