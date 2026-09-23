<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitSchedule extends Model
{
    use HasUuid;

    protected $fillable = [
        'listing_id',
        'user_id',
        'visit_date',
        'time_slot',
        'status',
        'notes',
        'manager_notes',
    ];

    protected $casts = [
        'visit_date' => 'date',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
