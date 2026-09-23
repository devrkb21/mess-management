<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasOne;

class Bed extends Model
{
    use HasUuid;

    protected $fillable = [
        'room_id',
        'label',
        'status',
    ];

    protected static function booted(): void
    {
        static::updated(function (Bed $bed) {
            if ($bed->isDirty('status') && $bed->status === 'occupied') {
                Listing::where('bed_id', $bed->id)->update(['is_active' => false]);
            }
        });
    }

    // ---- Relationships ----

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    /** The current occupant (active residency) */
    public function currentResidency(): HasOne
    {
        return $this->hasOne(Residency::class)->where('status', 'active');
    }

    // ---- Helpers ----

    public function isVacant(): bool
    {
        return $this->status === 'empty';
    }

    public function markOccupied(): void
    {
        $this->update(['status' => 'occupied']);
    }

    public function markEmpty(): void
    {
        $this->update(['status' => 'empty']);
    }
}
