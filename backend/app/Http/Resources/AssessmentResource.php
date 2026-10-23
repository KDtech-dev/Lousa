<?php

namespace App\Http\Resources;

use App\Enums\AssessmentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AssessmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'title' => $this->title,
            'subject' => $this->subject,
            'description' => $this->description ?? '',
            'instructions' => $this->instructions ?? '',
            'questions' => QuestionResource::collection($this->whenLoaded('questions')),
            'materialIds' => [],
            'archived' => $this->status === AssessmentStatus::Archived,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
