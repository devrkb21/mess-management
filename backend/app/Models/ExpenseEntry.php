<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ExpenseEntry extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'date',
        'amount',
        'description',
        'receipt_photo_url',
        'entered_by',
    ];

    protected function casts(): array
    {
        return [
            'date' => 'date',
            'amount' => 'decimal:2',
        ];
    }

    // ---- Relationships ----

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function enteredByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'entered_by');
    }
}
