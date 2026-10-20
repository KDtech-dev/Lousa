<?php

namespace Tests\Feature\Api;

use App\Enums\UserRole;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class AuthTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config(['sanctum.stateful' => ['localhost:5173', '127.0.0.1:5173']]);
    }

    public function test_teacher_can_log_in_and_receives_a_safe_profile(): void
    {
        $teacher = User::factory()->teacher()->create([
            'email' => 'teacher@example.test',
            'password' => Hash::make('correct horse battery staple'),
        ]);

        $response = $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/login', [
                'email' => $teacher->email,
                'password' => 'correct horse battery staple',
            ]);

        $response->assertOk()
            ->assertJsonPath('data.id', (string) $teacher->id)
            ->assertJsonPath('data.role', 'teacher')
            ->assertJsonMissingPath('data.password')
            ->assertJsonMissingPath('data.remember_token');

        $this->assertAuthenticatedAs($teacher, 'web');
    }

    public function test_invalid_credentials_are_rejected(): void
    {
        User::factory()->teacher()->create(['email' => 'teacher@example.test']);

        $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/login', [
                'email' => 'teacher@example.test',
                'password' => 'incorrect',
            ])
            ->assertUnprocessable()
            ->assertJsonPath('message', 'E-mail ou senha inválidos.');
    }

    public function test_profile_requires_authentication_and_exposes_the_authenticated_role(): void
    {
        $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->getJson('/api/user')
            ->assertUnauthorized();

        $this->assertGuest('web');

        $student = User::factory()->student()->create();

        $this->actingAs($student, 'web')
            ->withHeaders(['Origin' => 'http://localhost:5173'])
            ->getJson('/api/user')
            ->assertOk()
            ->assertJsonPath('data.id', (string) $student->id)
            ->assertJsonPath('data.role', 'student')
            ->assertJsonMissingPath('data.password');
    }

    public function test_teacher_resources_require_authentication(): void
    {
        $this->getJson('/api/classrooms')->assertUnauthorized();
        $this->getJson('/api/activities')->assertUnauthorized();
        $this->postJson('/api/activities', [])->assertUnauthorized();
    }

    public function test_logout_invalidates_the_authenticated_session(): void
    {
        $teacher = User::factory()->teacher()->create([
            'email' => 'teacher@example.test',
            'password' => Hash::make('correct horse battery staple'),
        ]);

        $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/login', [
                'email' => $teacher->email,
                'password' => 'correct horse battery staple',
            ])
            ->assertOk();

        $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/logout')
            ->assertNoContent();

        $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->getJson('/api/user')
            ->assertUnauthorized();

        $this->assertGuest('web');
    }

    public function test_login_is_rate_limited(): void
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->withHeaders(['Origin' => 'http://localhost:5173'])
                ->postJson('/api/login', [
                    'email' => 'missing@example.test',
                    'password' => 'incorrect',
                ])
                ->assertUnprocessable();
        }

        $this->withHeaders(['Origin' => 'http://localhost:5173'])
            ->postJson('/api/login', [
                'email' => 'missing@example.test',
                'password' => 'incorrect',
            ])
            ->assertStatus(429);
    }

    public function test_profile_does_not_allow_role_updates(): void
    {
        $student = User::factory()->student()->create();

        $this->actingAs($student, 'web')
            ->withHeaders(['Origin' => 'http://localhost:5173'])
            ->putJson('/api/user', ['role' => UserRole::Teacher->value])
            ->assertStatus(405);

        $this->assertSame(UserRole::Student, $student->fresh()->role);
    }
}
