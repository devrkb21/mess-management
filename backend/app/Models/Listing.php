<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Listing extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'room_id',
        'bed_id',
        'title',
        'description',
        'rent_amount',
        'security_deposit',
        'available_from',
        'gender_policy',
        'room_type',
        'amenities',
        'rules',
        'video_url',
        'latitude',
        'longitude',
        'area_name',
        'is_active',
        'views_count',
    ];

    protected $casts = [
        'amenities' => 'array',
        'rules' => 'array',
        'is_active' => 'boolean',
        'available_from' => 'date',
        'rent_amount' => 'decimal:2',
        'security_deposit' => 'decimal:2',
        'latitude' => 'float',
        'longitude' => 'float',
        'views_count' => 'integer',
    ];

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function room(): BelongsTo
    {
        return $this->belongsTo(Room::class);
    }

    public function bed(): BelongsTo
    {
        return $this->belongsTo(Bed::class);
    }

    public function photos(): HasMany
    {
        return $this->hasMany(ListingPhoto::class)->orderBy('sort_order');
    }

    public function favorites(): HasMany
    {
        return $this->hasMany(ListingFavorite::class);
    }

    public function applications(): HasMany
    {
        return $this->hasMany(BookingApplication::class);
    }

    public function visits(): HasMany
    {
        return $this->hasMany(VisitSchedule::class);
    }

    public function inquiryThreads(): HasMany
    {
        return $this->hasMany(InquiryThread::class);
    }
}
