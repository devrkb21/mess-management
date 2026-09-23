<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class VisitorPass extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'residency_id',
        'pass_code',
        'guest_name',
        'guest_phone',
        'purpose',
        'valid_from',
        'valid_until',
        'is_used',
        'used_at',
        'verified_by',
    ];

    protected $casts = [
        'is_used' => 'boolean',
        'valid_from' => 'datetime',
        'valid_until' => 'datetime',
        'used_at' => 'datetime',
    ];

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }

    public function verifiedBy(): BelongsTo
    {
        return $this->belongsTo(User::class, 'verified_by');
    }

    public function isExpired(): bool
    {
        return now()->isAfter($this->valid_until);
    }

    public function isValid(): bool
    {
        return !$this->is_used && !$this->isExpired() && now()->isAfter($this->valid_from);
    }
}
