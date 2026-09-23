<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DailyMealLog extends Model
{
    use HasUuid;

    protected $fillable = [
        'residency_id',
        'date',
        'meal_type',
        'is_on',
        'is_guest_meal',
        'guest_count',
        'locked_at',
        'checked_in_at',
        'checked_in_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'is_on' => 'boolean',
            'is_guest_meal' => 'boolean',
            'guest_count' => 'integer',
            'locked_at' => 'datetime',
            'checked_in_at' => 'datetime',
        ];
    }

    // ---- Relationships ----

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }

    // ---- Helpers ----

    public function isLocked(): bool
    {
        return $this->locked_at !== null;
    }

    /**
     * Total meal count for this log entry (1 for self + guest_count).
     * Returns 0 if meal is OFF.
     */
    public function totalMealCount(): int
    {
        if (!$this->is_on) {
            return 0;
        }

        return 1 + $this->guest_count;
    }
}
