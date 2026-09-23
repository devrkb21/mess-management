<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class LifestyleProfile extends Model
{
    use HasUuid;

    protected $fillable = [
        'user_id',
        'sleep_schedule',
        'study_work_habits',
        'cleanliness_level',
        'smoking_policy',
        'guest_frequency',
    ];

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
