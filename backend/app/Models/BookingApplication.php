<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class BookingApplication extends Model
{
    use HasUuid;

    protected $fillable = [
        'listing_id',
        'user_id',
        'desired_move_in_date',
        'status',
        'applicant_note',
        'nid_number',
        'profession',
        'blood_group',
        'emergency_contact_name',
        'emergency_contact_phone',
        'manager_remarks',
        'assigned_bed_id',
    ];

    protected $casts = [
        'desired_move_in_date' => 'date',
    ];

    public function listing(): BelongsTo
    {
        return $this->belongsTo(Listing::class);
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    public function assignedBed(): BelongsTo
    {
        return $this->belongsTo(Bed::class, 'assigned_bed_id');
    }
}
