<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BazarSchedule extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'date',
        'assigned_residency_id',
        'note',
        'status',
        'created_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
        ];
    }

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function assignedResidency(): BelongsTo
    {
        return $this->belongsTo(Residency::class, 'assigned_residency_id');
    }

    public function createdByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
