<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Review extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'reviewer_id',
        'reviewee_id',
        'residency_id',
        'leave_clearance_id',
        'type',
        'rating_overall',
        'rating_punctuality',
        'rating_cleanliness',
        'rating_compliance',
        'rating_food',
        'comment',
    ];

    protected $casts = [
        'rating_overall' => 'integer',
        'rating_punctuality' => 'integer',
        'rating_cleanliness' => 'integer',
        'rating_compliance' => 'integer',
        'rating_food' => 'integer',
    ];

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function reviewer(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewer_id');
    }

    public function reviewee(): BelongsTo
    {
        return $this->belongsTo(User::class, 'reviewee_id');
    }

    public function residency(): BelongsTo
    {
        return $this->belongsTo(Residency::class);
    }

    public function leaveClearance(): BelongsTo
    {
        return $this->belongsTo(LeaveClearance::class);
    }
}
