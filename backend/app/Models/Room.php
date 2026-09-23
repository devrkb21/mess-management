<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Room extends Model
{
    use HasUuid;

    protected $fillable = [
        'floor_id',
        'name',
        'capacity',
    ];

    // ---- Relationships ----

    public function floor(): BelongsTo
    {
        return $this->belongsTo(Floor::class);
    }

    public function beds(): HasMany
    {
        return $this->hasMany(Bed::class);
    }

    // ---- Helpers ----

    /** Get the mess this room belongs to (through floor) */
    public function mess()
    {
        return $this->floor->mess;
    }
}
