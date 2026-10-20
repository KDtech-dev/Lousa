<?php

namespace Tests\Feature\Api;

use App\Enums\EnrollmentStatus;
use App\Enums\UserRole;
use App\Models\Classroom;
use App\Models\ClassroomEnrollment;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

class ClassroomTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_can_create_and_list_only_their_classrooms(): void
    {
        $teacher = User::factory()->teacher()->create();
        $otherTeacher = User::factory()->teacher()->create();
        Classroom::factory()->create(['teacher_id' => $otherTeacher->id, 'name' => 'Other class']);

        $response = $this->actingAs($teacher, 'web')->postJson('/api/classrooms', [
            'name' => 'Biology 8A',
            'description' => 'Morning class',
            'teacher_id' => $otherTeacher->id,
        ]);

        $response->assertCreated()
            ->assertJsonPath('data.name', 'Biology 8A')
            ->assertJsonMissingPath('data.teacher_id');

        $this->assertDatabaseHas('classrooms', [
            'name' => 'Biology 8A',
            'teacher_id' => $teacher->id,
        ]);

        $classroomId = $response->json('data.id');
        $this->actingAs($teacher, 'web')
            ->putJson("/api/classrooms/{$classroomId}", [
                'name' => 'Biology 8B',
                'description' => 'Afternoon class',
                'teacher_id' => $otherTeacher->id,
            ])
            ->assertOk()
            ->assertJsonPath('data.name', 'Biology 8B');

        $this->actingAs($teacher, 'web')
            ->getJson('/api/classrooms')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.name', 'Biology 8B');
    }

    public function test_student_cannot_create_or_manage_classrooms(): void
    {
        $student = User::factory()->student()->create();
        $classroom = Classroom::factory()->create();

        $this->actingAs($student, 'web')
            ->postJson('/api/classrooms', ['name' => 'Not allowed'])
            ->assertForbidden();

        $this->actingAs($student, 'web')
            ->getJson("/api/classrooms/{$classroom->id}")
            ->assertNotFound();
    }

    public function test_teacher_cannot_read_or_update_another_teachers_classroom(): void
    {
        $classroom = Classroom::factory()->create();
        $otherTeacher = User::factory()->teacher()->create();

        $this->actingAs($otherTeacher, 'web')
            ->getJson("/api/classrooms/{$classroom->id}")
            ->assertNotFound();

        $this->actingAs($otherTeacher, 'web')
            ->putJson("/api/classrooms/{$classroom->id}", ['name' => 'Hijacked'])
            ->assertNotFound();

        $this->assertDatabaseHas('classrooms', ['id' => $classroom->id, 'name' => $classroom->name]);
    }

    public function test_teacher_can_enroll_and_remove_a_student_and_duplicate_enrollment_is_rejected(): void
    {
        $teacher = User::factory()->teacher()->create();
        $classroom = Classroom::factory()->create(['teacher_id' => $teacher->id]);
        $student = User::factory()->student()->create();

        $this->actingAs($teacher, 'web')
            ->postJson("/api/classrooms/{$classroom->id}/enrollments", ['student_id' => $student->id])
            ->assertCreated()
            ->assertJsonPath('data.student.id', (string) $student->id);

        $this->actingAs($teacher, 'web')
            ->postJson("/api/classrooms/{$classroom->id}/enrollments", ['student_id' => $student->id])
            ->assertStatus(409);

        $enrollment = ClassroomEnrollment::query()->firstOrFail();

        $this->actingAs($teacher, 'web')
            ->deleteJson("/api/classrooms/{$classroom->id}/enrollments/{$enrollment->id}")
            ->assertNoContent();

        $this->assertSame(EnrollmentStatus::Removed, $enrollment->fresh()->status);
        $this->actingAs($teacher, 'web')
            ->getJson("/api/classrooms/{$classroom->id}/students")
            ->assertOk()
            ->assertJsonCount(0, 'data');
    }

    public function test_only_users_with_student_role_can_be_enrolled(): void
    {
        $teacher = User::factory()->teacher()->create();
        $classroom = Classroom::factory()->create(['teacher_id' => $teacher->id]);
        $anotherTeacher = User::factory()->teacher()->create();

        $this->actingAs($teacher, 'web')
            ->postJson("/api/classrooms/{$classroom->id}/enrollments", ['student_id' => $anotherTeacher->id])
            ->assertUnprocessable();

        $this->assertDatabaseCount('classroom_enrollments', 0);
    }

    public function test_another_teacher_cannot_manage_class_enrollments(): void
    {
        $classroom = Classroom::factory()->create();
        $student = User::factory()->student()->create();
        $otherTeacher = User::factory()->teacher()->create();

        $this->actingAs($otherTeacher, 'web')
            ->postJson("/api/classrooms/{$classroom->id}/enrollments", ['student_id' => $student->id])
            ->assertNotFound();

        $this->assertDatabaseCount('classroom_enrollments', 0);
    }

    public function test_migrations_and_classroom_relationships_are_available(): void
    {
        $this->assertTrue(Schema::hasTable('classrooms'));
        $this->assertTrue(Schema::hasTable('classroom_enrollments'));

        $classroom = Classroom::factory()->create();
        $student = User::factory()->student()->create();
        $classroom->students()->attach($student->id, [
            'status' => EnrollmentStatus::Active->value,
        ]);

        $this->assertCount(1, $classroom->fresh()->students);
        $this->assertSame(UserRole::Teacher, $classroom->teacher->role);
    }
}
