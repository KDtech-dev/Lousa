<?php

namespace App\Http\Resources;

use App\Enums\QuestionType;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class QuestionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'type' => $this->type instanceof QuestionType ? $this->type->value : (string) $this->type,
            'prompt' => $this->prompt,
            'options' => $this->options ?? [],
            'correctAnswer' => $this->correct_answer,
            'points' => (float) $this->points,
        ];
    }
}
