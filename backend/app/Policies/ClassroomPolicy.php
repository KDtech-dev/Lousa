<?php

namespace App\Policies;

use App\Models\Classroom;
use App\Models\User;
use Illuminate\Auth\Access\Response;

class ClassroomPolicy
{
    public function viewAny(User $user): bool
    {
        return $user->isTeacher();
    }

    public function create(User $user): bool
    {
        return $user->isTeacher();
    }

    public function view(User $user, Classroom $classroom): Response
    {
        return $this->owns($user, $classroom);
    }

    public function update(User $user, Classroom $classroom): Response
    {
        return $this->owns($user, $classroom);
    }

    public function manageStudents(User $user, Classroom $classroom): Response
    {
        return $this->owns($user, $classroom);
    }

    private function owns(User $user, Classroom $classroom): Response
    {
        return $user->isTeacher() && $classroom->teacher_id === $user->getKey()
            ? Response::allow()
            : Response::denyAsNotFound();
    }
}
