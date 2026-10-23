<?php

namespace App\Models;

use App\Enums\QuestionType;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Question extends Model
{
    protected $fillable = ['type', 'prompt', 'options', 'correct_answer', 'points', 'position'];

    protected function casts(): array
    {
        return [
            'type' => QuestionType::class,
            'options' => 'array',
            'points' => 'float',
        ];
    }

    public function assessment(): BelongsTo
    {
        return $this->belongsTo(Assessment::class);
    }
}
