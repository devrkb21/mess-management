<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class FixedBill extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'title',
        'amount',
        'billing_month',
        'split_method',
    ];

    protected function casts(): array
    {
        return [
            'amount' => 'decimal:2',
        ];
    }

    // ---- Relationships ----

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }
}
