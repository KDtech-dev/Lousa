<?php

namespace App\Http\Resources;

use App\Enums\EnrollmentStatus;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ClassroomEnrollmentResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'classroomId' => (string) $this->classroom_id,
            'student' => new UserResource($this->whenLoaded('student')),
            'status' => $this->status instanceof EnrollmentStatus ? $this->status->value : (string) $this->status,
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }
}
