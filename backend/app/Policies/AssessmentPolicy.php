<?php

namespace App\Policies;

use App\Enums\AssessmentStatus;
use App\Models\Assessment;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class AssessmentPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isTeacher();
    }

    public function create(User $user): bool
    {
        return $user->isTeacher();
    }

    public function view(User $user, Assessment $assessment): Response
    {
        return $this->owns($user, $assessment);
    }

    public function update(User $user, Assessment $assessment): Response
    {
        $ownership = $this->owns($user, $assessment);

        if (! $ownership->allowed()) {
            return $ownership;
        }

        return $assessment->status === AssessmentStatus::Draft
            ? Response::allow()
            : Response::deny('Only draft activities may be edited.');
    }

    public function archive(User $user, Assessment $assessment): Response
    {
        return $this->owns($user, $assessment);
    }

    private function owns(User $user, Assessment $assessment): Response
    {
        return $user->isTeacher() && $assessment->teacher_id === $user->getKey()
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
