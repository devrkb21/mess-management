<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->boolean('is_superadmin')->default(false)->after('password');
            $table->boolean('is_suspended')->default(false)->after('is_superadmin');
        });

        // Ensure status column in messes accommodates pending, active, suspended, rejected
        // Since SQLite/Postgres varchar or enum might be used, in create_messes_table it was string('status', 20)->default('active')
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['is_superadmin', 'is_suspended']);
        });
    }
};
