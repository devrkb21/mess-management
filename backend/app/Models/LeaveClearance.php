<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LeaveClearance extends Model
{
    use HasUuid;

    protected $fillable = [
        'residency_id',
        'notice_date',
        'planned_leave_date',
        'final_dues',
        'deposit_refunded',
        'clearance_pdf_url',
        'status',
    ];

    protected function casts(): array
    {
        return [
            'notice_date' => 'date',
            'planned_leave_date' => 'date',
            'final_dues' => 'decimal:2',
            'deposit_refunded' => 'decimal:2',
        ];
    }

    // ---- Relationships ----

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }

    // ---- Helpers ----

    public function isCleared(): bool
    {
        return $this->status === 'cleared';
    }
}
