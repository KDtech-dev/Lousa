<?php

namespace App\Http\Controllers\Api;

use App\Enums\EnrollmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\EnrollStudentRequest;
use App\Http\Resources\ClassroomEnrollmentResource;
use App\Http\Resources\UserResource;
use App\Models\Classroom;
use App\Models\ClassroomEnrollment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\DB;

class ClassroomEnrollmentController extends Controller
{
    public function index(Classroom $classroom): AnonymousResourceCollection
    {
        $this->authorize('manageStudents', $classroom);

        return UserResource::collection(
            $classroom->students()->orderBy('name')->get(['users.id', 'users.name', 'users.email', 'users.role']),
        );
    }

    public function store(EnrollStudentRequest $request, Classroom $classroom): JsonResponse
    {
        $this->authorize('manageStudents', $classroom);
        $studentId = (int) $request->validated('student_id');

        $enrollment = DB::transaction(function () use ($classroom, $studentId): ?ClassroomEnrollment {
            // Serializing writes for the same classroom makes the unique pair safe under concurrent requests.
            Classroom::query()->whereKey($classroom->getKey())->lockForUpdate()->firstOrFail();
            $existing = $classroom->enrollments()->where('student_id', $studentId)->lockForUpdate()->first();

            if ($existing?->status === EnrollmentStatus::Active) {
                return null;
            }

            if ($existing) {
                $existing->status = EnrollmentStatus::Active;
                $existing->save();

                return $existing;
            }

            return $classroom->enrollments()->create([
                'student_id' => $studentId,
                'status' => EnrollmentStatus::Active,
            ]);
        });

        if (! $enrollment) {
            return response()->json(['message' => 'This student is already enrolled in this classroom.'], 409);
        }

        return (new ClassroomEnrollmentResource($enrollment->load('student')))
            ->response()
            ->setStatusCode(201);
    }

    public function destroy(Classroom $classroom, string $enrollment): Response
    {
        $this->authorize('manageStudents', $classroom);

        $record = $classroom->enrollments()->whereKey($enrollment)->firstOrFail();
        $record->status = EnrollmentStatus::Removed;
        $record->save();

        return response()->noContent();
    }
}
