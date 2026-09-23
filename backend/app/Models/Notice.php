<?php

namespace App\Models;

use App\Traits\HasUuid;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Notice extends Model
{
    use HasUuid;

    protected $fillable = [
        'mess_id',
        'title',
        'body',
        'posted_by',
        'pinned',
    ];

    protected function casts(): array
    {
        return [
            'pinned' => 'boolean',
        ];
    }

    // ---- Relationships ----

    public function mess(): BelongsTo
    {
        return $this->belongsTo(Mess::class);
    }

    public function postedByUser(): BelongsTo
    {
        return $this->belongsTo(User::class, 'posted_by');
    }

    // ---- Scopes ----

    public function scopePinned($query)
    {
        return $query->where('pinned', true);
    }
}
