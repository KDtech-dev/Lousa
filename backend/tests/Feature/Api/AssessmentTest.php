<?php

namespace Tests\Feature\Api;

use App\Enums\AssessmentStatus;
use App\Enums\UserRole;
use App\Models\Assessment;
use App\Models\Question;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AssessmentTest extends TestCase
{
    use RefreshDatabase;

    public function test_teacher_can_create_list_edit_and_archive_a_draft(): void
    {
        $teacher = User::factory()->teacher()->create();

        $payload = $this->assessmentPayload();
        $created = $this->actingAs($teacher, 'web')
            ->postJson('/api/activities', $payload)
            ->assertCreated()
            ->assertJsonPath('data.title', $payload['title'])
            ->assertJsonPath('data.archived', false)
            ->assertJsonPath('data.questions.0.type', 'single')
            ->assertJsonPath('data.questions.0.correctAnswer', 'A');

        $activityId = $created->json('data.id');
        $this->assertIsString($activityId);
        $this->assertDatabaseHas('assessments', [
            'id' => $activityId,
            'teacher_id' => $teacher->id,
            'status' => AssessmentStatus::Draft->value,
        ]);

        $updatedPayload = $payload;
        $updatedPayload['title'] = 'Updated title';
        $updatedPayload['questions'][0]['id'] = $created->json('data.questions.0.id');
        $updatedPayload['questions'][0]['prompt'] = 'Updated prompt';

        $this->actingAs($teacher, 'web')
            ->putJson("/api/activities/{$activityId}", $updatedPayload)
            ->assertOk()
            ->assertJsonPath('data.title', 'Updated title')
            ->assertJsonPath('data.questions.0.prompt', 'Updated prompt');

        $this->actingAs($teacher, 'web')
            ->getJson('/api/activities')
            ->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.id', $activityId);

        $this->actingAs($teacher, 'web')
            ->patchJson("/api/activities/{$activityId}/archive")
            ->assertOk()
            ->assertJsonPath('data.archived', true);
    }

    public function test_student_cannot_create_an_activity(): void
    {
        $student = User::factory()->student()->create();
        $existing = Assessment::factory()->create();

        $this->actingAs($student, 'web')
            ->postJson('/api/activities', $this->assessmentPayload())
            ->assertForbidden();

        $this->actingAs($student, 'web')
            ->getJson("/api/activities/{$existing->id}")
            ->assertNotFound();
    }

    public function test_frontend_boolean_and_open_question_shapes_are_accepted(): void
    {
        $teacher = User::factory()->teacher()->create();
        $payload = $this->assessmentPayload();
        $payload['questions'] = [
            [
                'id' => 'boolean-id',
                'type' => 'boolean',
                'prompt' => 'Water freezes at zero degrees Celsius.',
                'options' => ['Verdadeiro', 'Falso'],
                'correctAnswer' => 'Verdadeiro',
                'points' => 1,
            ],
            [
                'id' => 'open-id',
                'type' => 'open',
                'prompt' => 'Explain your reasoning.',
                'options' => [],
                'correctAnswer' => null,
                'points' => 2.5,
            ],
        ];

        $this->actingAs($teacher, 'web')
            ->postJson('/api/activities', $payload)
            ->assertCreated()
            ->assertJsonCount(2, 'data.questions')
            ->assertJsonPath('data.questions.0.type', 'boolean')
            ->assertJsonPath('data.questions.1.type', 'open')
            ->assertJsonPath('data.questions.1.correctAnswer', null);
    }

    public function test_teacher_cannot_read_or_edit_another_teachers_activity(): void
    {
        $owner = User::factory()->teacher()->create();
        $otherTeacher = User::factory()->teacher()->create();
        $assessment = Assessment::factory()->create(['teacher_id' => $owner->id]);
        $assessment->questions()->create([
            'position' => 1,
            'type' => 'open',
            'prompt' => 'Explain the concept.',
            'options' => [],
            'correct_answer' => null,
            'points' => 1,
        ]);

        $this->actingAs($otherTeacher, 'web')
            ->getJson("/api/activities/{$assessment->id}")
            ->assertNotFound();

        $this->actingAs($otherTeacher, 'web')
            ->putJson("/api/activities/{$assessment->id}", $this->assessmentPayload())
            ->assertNotFound();
    }

    public function test_client_cannot_set_owner_role_or_archived_state_when_creating(): void
    {
        $teacher = User::factory()->teacher()->create();
        $anotherTeacher = User::factory()->teacher()->create();
        $payload = $this->assessmentPayload() + [
            'teacher_id' => $anotherTeacher->id,
            'role' => UserRole::Student->value,
            'status' => AssessmentStatus::Archived->value,
            'archived' => true,
        ];

        $response = $this->actingAs($teacher, 'web')
            ->postJson('/api/activities', $payload)
            ->assertCreated()
            ->assertJsonPath('data.archived', false);

        $this->assertDatabaseHas('assessments', [
            'id' => $response->json('data.id'),
            'teacher_id' => $teacher->id,
            'status' => AssessmentStatus::Draft->value,
        ]);
    }

    public function test_invalid_question_content_and_missing_activity_fields_are_rejected(): void
    {
        $teacher = User::factory()->teacher()->create();
        $payload = $this->assessmentPayload();
        $payload['questions'][0]['correctAnswer'] = 'Unknown';

        $this->actingAs($teacher, 'web')
            ->postJson('/api/activities', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('questions.0.correctAnswer');

        $this->actingAs($teacher, 'web')
            ->postJson('/api/activities', ['questions' => []])
            ->assertUnprocessable()
            ->assertJsonValidationErrors(['title', 'subject', 'questions']);
    }

    public function test_unknown_activity_id_returns_not_found(): void
    {
        $teacher = User::factory()->teacher()->create();

        $this->actingAs($teacher, 'web')
            ->getJson('/api/activities/999999')
            ->assertNotFound();
    }

    public function test_user_email_is_unique_and_passwords_are_hashed(): void
    {
        $user = User::factory()->teacher()->create(['email' => 'unique@example.test']);
        $this->assertTrue(Hash::check('password', $user->password));

        try {
            User::factory()->student()->create(['email' => 'unique@example.test']);
            $this->fail('A duplicate e-mail should violate the database unique constraint.');
        } catch (QueryException) {
            $this->assertDatabaseCount('users', 1);
        }
    }

    private function assessmentPayload(): array
    {
        return [
            'id' => 'frontend-generated-id',
            'title' => 'Cell structure',
            'subject' => 'Biology',
            'description' => 'Draft activity',
            'instructions' => 'Choose one option.',
            'questions' => [[
                'id' => 'frontend-question-id',
                'type' => 'single',
                'prompt' => 'Which option is correct?',
                'options' => ['A', 'B'],
                'correctAnswer' => 'A',
                'points' => 2,
            ]],
            'materialIds' => [],
            'archived' => false,
            'createdAt' => now()->toISOString(),
            'updatedAt' => now()->toISOString(),
        ];
    }
}
