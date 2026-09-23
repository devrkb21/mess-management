<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Complaint extends Model
{
    use HasUuid;

    protected $fillable = [
        'residency_id',
        'mess_id',
        'subject',
        'description',
        'status',
        'resolved_note',
    ];

    // ---- Relationships ----

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    // ---- Scopes ----

    public function scopeOpen($query)
    {
        return $query->whereIn('status', ['open', 'in_progress']);
    }
}
