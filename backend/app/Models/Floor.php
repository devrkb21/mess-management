<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Floor extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'name',
        'sort_order',
    ];

    // ---- Relationships ----

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function rooms(): HasMany
    {
        return $this->hasMany(Room::class);
    }
}
