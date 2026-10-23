<?php

namespace App\Services;

use App\Enums\AssessmentStatus;
use App\Models\Assessment;
use App\Models\Question;
use App\Models\User;
use Illuminate\Support\Facades\DB;

class AssessmentService
{
    public function createDraft(User $teacher, array $data): Assessment
    {
        return DB::transaction(function () use ($teacher, $data): Assessment {
            $assessment = new Assessment;
            $assessment->teacher()->associate($teacher);
            $assessment->status = AssessmentStatus::Draft;
            $assessment->fill($this->assessmentAttributes($data));
            $assessment->save();

            return $this->syncQuestions($assessment, $data['questions']);
        });
    }

    public function updateDraft(Assessment $assessment, array $data): Assessment
    {
        return DB::transaction(function () use ($assessment, $data): Assessment {
            $assessment->fill($this->assessmentAttributes($data));
            $assessment->save();

            return $this->syncQuestions($assessment, $data['questions']);
        });
    }

    private function assessmentAttributes(array $data): array
    {
        return [
            'title' => $data['title'],
            'subject' => $data['subject'],
            'description' => $data['description'] ?? null,
            'instructions' => $data['instructions'] ?? null,
        ];
    }

    private function syncQuestions(Assessment $assessment, array $questions): Assessment
    {
        $retainedIds = [];

        // Move old positions out of the active range so valid reordering never hits the unique index.
        Question::query()
            ->where('assessment_id', $assessment->getKey())
            ->increment('position', 1000);

        foreach (array_values($questions) as $index => $data) {
            $question = null;
            $clientId = $data['id'] ?? null;

            // Only match IDs already owned by this assessment; client IDs never become database IDs.
            if (is_string($clientId) && ctype_digit($clientId)) {
                $candidateId = (int) $clientId;
                if (! in_array($candidateId, $retainedIds, true)) {
                    $question = $assessment->questions()->whereKey($candidateId)->first();
                }
            }

            $attributes = [
                'type' => $data['type'],
                'prompt' => $data['prompt'],
                'options' => $data['options'],
                'correct_answer' => $data['correctAnswer'],
                'points' => $data['points'],
                'position' => $index + 1,
            ];

            if ($question) {
                $question->fill($attributes);
                $question->save();
            } else {
                $question = $assessment->questions()->create($attributes);
            }

            $retainedIds[] = $question->getKey();
        }

        Question::query()
            ->where('assessment_id', $assessment->getKey())
            ->whereNotIn('id', $retainedIds)
            ->delete();

        return $assessment->refresh()->load('questions');
    }
}
