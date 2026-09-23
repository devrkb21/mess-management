<?php

namespace App\Models;

use App\Traits\HasUuid;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;

class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, HasUuid, Notifiable;

    protected $fillable = [
        'name',
        'email',
        'phone',
        'password',
        'avatar_url',
        'is_superadmin',
        'is_suspended',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'phone_verified_at' => 'datetime',
            'password' => 'hashed',
            'is_superadmin' => 'boolean',
            'is_suspended' => 'boolean',
        ];
    }

    // ---- Relationships ----

    /** Messes this user owns */
    public function ownedMesses(): HasMany
    {
        return $this->hasMany(Mess::class, 'owner_id');
    }

    /** All residencies (memberships) across messes */
    public function residencies(): HasMany
    {
        return $this->hasMany(Residency::class);
    }

    /** Invites created by this user */
    public function createdInvites(): HasMany
    {
        return $this->hasMany(Invite::class, 'created_by');
    }

    /** Expense entries logged by this user */
    public function expenseEntries(): HasMany
    {
        return $this->hasMany(ExpenseEntry::class, 'entered_by');
    }

    /** Payments recorded by this user (as manager) */
    public function recordedPayments(): HasMany
    {
        return $this->hasMany(Payment::class, 'recorded_by');
    }

    /** Notices posted by this user */
    public function postedNotices(): HasMany
    {
        return $this->hasMany(Notice::class, 'posted_by');
    }

    /** Notifications received */
    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(ListingFavorite::class);
    }

    public function bookingApplications(): HasMany
    {
        return $this->hasMany(BookingApplication::class);
    }

    public function visitSchedules(): HasMany
    {
        return $this->hasMany(VisitSchedule::class);
    }

    public function waitingLists(): HasMany
    {
        return $this->hasMany(WaitingList::class);
    }

    public function lifestyleProfile(): \Illuminate\Database\Eloquent\Relations\HasOne
    {
        return $this->hasOne(LifestyleProfile::class);
    }

    public function reviewsReceived(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewee_id');
    }

    public function reviewsGiven(): HasMany
    {
        return $this->hasMany(Review::class, 'reviewer_id');
    }

    // ---- Helpers ----

    /** Get active residencies */
    public function activeResidencies()
    {
        return $this->residencies()->where('status', 'active');
    }
}
