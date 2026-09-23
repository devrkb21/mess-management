<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class ResidentProfile extends Model
{
    use HasUuid;

    protected $fillable = [
        'residency_id',
        'nid_number',
        'nid_photo_url',
        'profession_or_institution',
        'blood_group',
        'emergency_contact_name',
        'emergency_contact_phone',
    ];

    // ---- Relationships ----

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }
}
