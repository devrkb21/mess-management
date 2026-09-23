<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Residency extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id',
        'mess_id',
        'bed_id',
        'role',
        'status',
        'joined_at',
        'left_at',
        'security_deposit_amount',
    ];

    protected function casts(): array
    {
        return [
            'joined_at' => 'date',
            'left_at' => 'date',
            'security_deposit_amount' => 'decimal:2',
        ];
    }

    // ---- Relationships ----

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }

    public function profile(): HasOne
    {
        return $this->hasOne(ResidentProfile::class);
    }

    public function dailyMealLogs(): HasMany
    {
        return $this->hasMany(DailyMealLog::class);
    }

    public function vacationRequests(): HasMany
    {
        return $this->hasMany(VacationRequest::class);
    }

    public function monthlyBills(): HasMany
    {
        return $this->hasMany(MonthlyBill::class);
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class);
    }

    public function leaveClearance(): HasOne
    {
        return $this->hasOne(LeaveClearance::class);
    }

    public function bazarSchedules(): HasMany
    {
        return $this->hasMany(BazarSchedule::class, 'assigned_residency_id');
    }

    // ---- Scopes ----

    public function scopeActive($query)
    {
        return $query->where('status', 'active');
    }

    public function scopeOfRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    // ---- Helpers ----

    public function isOwner(): bool
    {
        return $this->role === 'owner';
    }

    public function isManager(): bool
    {
        return in_array($this->role, ['owner', 'manager']);
    }

    public function isActive(): bool
    {
        return $this->status === 'active';
    }
}
