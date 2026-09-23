<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('listings', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('mess_id');
            $table->uuid('room_id')->nullable();
            $table->uuid('bed_id')->nullable();
            $table->string('title', 200);
            $table->text('description')->nullable();
            $table->decimal('rent_amount', 10, 2);
            $table->decimal('security_deposit', 10, 2)->default(0);
            $table->date('available_from');
            $table->enum('gender_policy', ['male', 'female', 'mixed'])->default('male');
            $table->string('room_type', 50)->default('double'); // single, double, triple, 4-seat, etc.
            $table->json('amenities')->nullable(); // wifi, ac, attached_bath, balcony, etc.
            $table->json('rules')->nullable(); // smoking, gate_close_time, guest_policy, etc.
            $table->string('video_url')->nullable();
            $table->decimal('latitude', 10, 7)->nullable();
            $table->decimal('longitude', 10, 7)->nullable();
            $table->string('area_name', 100)->nullable();
            $table->boolean('is_active')->default(true)->index();
            $table->unsignedInteger('views_count')->default(0);
            $table->timestamps();

            $table->foreign('mess_id')->references('id')->on('messes')->cascadeOnDelete();
            $table->foreign('room_id')->references('id')->on('rooms')->nullOnDelete();
            $table->foreign('bed_id')->references('id')->on('beds')->nullOnDelete();

            $table->index(['mess_id', 'is_active']);
            $table->index(['area_name', 'rent_amount']);
        });

        Schema::create('listing_photos', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->string('photo_url');
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->foreign('listing_id')->references('id')->on('listings')->cascadeOnDelete();
            $table->index(['listing_id', 'sort_order']);
        });

        Schema::create('listing_favorites', function (Blueprint $table) {
            $table->uuid('id')->primary();
            $table->uuid('listing_id');
            $table->uuid('user_id');
            $table->timestamps();

            $table->foreign('listing_id')->references('id')->on('listings')->cascadeOnDelete();
            $table->foreign('user_id')->references('id')->on('users')->cascadeOnDelete();

            $table->unique(['user_id', 'listing_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('listing_favorites');
        Schema::dropIfExists('listing_photos');
        Schema::dropIfExists('listings');
    }
};
