<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class MonthlyBill extends Model
{
    use HasUuid;

    protected $fillable = [
        'residency_id',
        'billing_month',
        'meal_cost_total',
        'fixed_bill_share_total',
        'previous_due',
        'total_payable',
        'status',
        'pdf_url',
        'generated_at',
    ];

    protected function casts(): array
    {
        return [
            'meal_cost_total' => 'decimal:2',
            'fixed_bill_share_total' => 'decimal:2',
            'previous_due' => 'decimal:2',
            'total_payable' => 'decimal:2',
            'generated_at' => 'datetime',
        ];
    }

    // ---- Relationships ----

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }

    public function payments(): HasMany
    {
        return $this->hasMany(Payment::class);
    }

    // ---- Helpers ----

    public function totalPaid(): float
    {
        return (float) $this->payments()->sum('amount');
    }

    public function remainingDue(): float
    {
        return (float) $this->total_payable - $this->totalPaid();
    }

    public function isPaid(): bool
    {
        return $this->remainingDue() <= 0;
    }
}
