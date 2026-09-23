<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class WaitingList extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'user_id',
        'preferred_room_type',
        'max_budget',
        'note',
        'notified_at',
    ];

    protected $casts = [
        'max_budget' => 'decimal:2',
        'notified_at' => 'datetime',
    ];

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
