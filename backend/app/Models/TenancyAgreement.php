<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class TenancyAgreement extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'residency_id',
        'monthly_rent',
        'security_deposit',
        'notice_period_days',
        'agreement_terms',
        'status',
        'signed_at',
        'signed_ip',
        'signature_name',
    ];

    protected $casts = [
        'monthly_rent' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'notice_period_days' => 'integer',
        'signed_at' => 'datetime',
    ];

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }

    public function isSigned(): bool
    {
        return $this->status === 'signed' && $this->signed_at !== null;
    }
}
