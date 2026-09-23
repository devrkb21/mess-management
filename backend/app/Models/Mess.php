<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasManyThrough;

class Mess extends Model
{
    use HasUuid;

    protected $fillable = [
        'owner_id',
        'name',
        'address',
        'city',
        'gender_policy',
        'meal_cutoff_breakfast',
        'meal_cutoff_lunch',
        'meal_cutoff_dinner',
        'bill_split_default',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'meal_cutoff_breakfast' => 'string',
            'meal_cutoff_lunch' => 'string',
            'meal_cutoff_dinner' => 'string',
        ];
    }

    // ---- Relationships ----

    public function owner(): BelongsTo
    {
        return $this->belongsTo(User::class, 'owner_id');
    }

    public function floors(): HasMany
    {
        return $this->hasMany(Floor::class)->orderBy('sort_order');
    }

    public function residencies(): HasMany
    {
        return $this->hasMany(Residency::class);
    }

    public function invites(): HasMany
    {
        return $this->hasMany(Invite::class);
    }

    public function expenseEntries(): HasMany
    {
        return $this->hasMany(ExpenseEntry::class);
    }

    public function fixedBills(): HasMany
    {
        return $this->hasMany(FixedBill::class);
    }

    public function notices(): HasMany
    {
        return $this->hasMany(Notice::class);
    }

    public function complaints(): HasMany
    {
        return $this->hasMany(Complaint::class);
    }

    public function notifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    public function bazarSchedules(): HasMany
    {
        return $this->hasMany(BazarSchedule::class);
    }

    public function listings(): HasMany
    {
        return $this->hasMany(Listing::class);
    }

    public function waitingLists(): HasMany
    {
        return $this->hasMany(WaitingList::class);
    }

    public function reviews(): HasMany
    {
        return $this->hasMany(Review::class);
    }

    // ---- Scopes / Helpers ----

    /** Get only active residencies */
    public function activeResidencies()
    {
        return $this->residencies()->where('status', 'active');
    }

    /** Get all rooms through floors */
    public function rooms(): HasManyThrough
    {
        return $this->hasManyThrough(Room::class, Floor::class);
    }
}
