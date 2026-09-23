<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VacationRequest extends Model
{
    use HasUuid;

    protected $fillable = [
        'residency_id',
        'start_date',
        'end_date',
        'reason',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'start_date' => 'date',
            'end_date' => 'date',
        ];
    }

    // ---- Relationships ----

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }

    // ---- Helpers ----

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    /** Check if a given date falls within this vacation period */
    public function coversDate($date): bool
    {
        return $this->isApproved()
            && $this->start_date->lte($date)
            && $this->end_date->gte($date);
    }
}
