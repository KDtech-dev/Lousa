<?php

namespace Database\Factories;

use App\Enums\AssessmentStatus;
use App\Models\Assessment;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/** @extends Factory<Assessment> */
class AssessmentFactory extends Factory
{
    protected $model = Assessment::class;

    public function definition(): array
    {
        return [
            'teacher_id' => User::factory()->teacher(),
            'title' => fake()->sentence(4),
            'subject' => fake()->word(),
            'description' => fake()->optional()->paragraph(),
            'instructions' => fake()->optional()->sentence(),
            'status' => AssessmentStatus::Draft,
        ];
    }
}
