<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

abstract class AssessmentDataRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'title' => ['required', 'string', 'max:200'],
            'subject' => ['required', 'string', 'max:160'],
            'description' => ['nullable', 'string', 'max:10000'],
            'instructions' => ['nullable', 'string', 'max:10000'],
            'questions' => ['required', 'array', 'min:1', 'max:100'],
            'questions.*.id' => ['sometimes', 'nullable', 'string', 'max:100'],
            'questions.*.type' => ['required', 'string', 'in:single,boolean,open'],
            'questions.*.prompt' => ['required', 'string', 'max:10000'],
            // Open questions keep the frontend's empty-array shape; type-specific
            // rules below still require usable options for choice questions.
            'questions.*.options' => ['present', 'array', 'max:20'],
            'questions.*.options.*' => ['required', 'string', 'max:500'],
            'questions.*.correctAnswer' => ['present', 'nullable', 'string', 'max:1000'],
            'questions.*.points' => ['required', 'numeric', 'gt:0', 'lte:10000', 'decimal:0,2'],
            // The initial backend has no material records; do not accept dangling IDs.
            'materialIds' => ['sometimes', 'array', 'max:0'],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach ($this->input('questions', []) as $index => $question) {
                if (! is_array($question)) {
                    continue;
                }

                $type = $question['type'] ?? null;
                $options = $question['options'] ?? null;
                $answer = $question['correctAnswer'] ?? null;

                if (! is_array($options)) {
                    continue;
                }

                if ($type === 'single') {
                    $normalizedOptions = array_map(
                        static fn (mixed $option): string => is_string($option) ? mb_strtolower(trim($option)) : '',
                        $options,
                    );

                    if (count($options) < 2 || count(array_unique($normalizedOptions)) !== count($options)) {
                        $validator->errors()->add("questions.$index.options", 'Single-choice questions need at least two distinct options.');
                    }

                    if (! is_string($answer) || ! in_array($answer, $options, true)) {
                        $validator->errors()->add("questions.$index.correctAnswer", 'Choose one of the question options as the correct answer.');
                    }
                }

                if ($type === 'boolean') {
                    if ($options !== ['Verdadeiro', 'Falso']) {
                        $validator->errors()->add("questions.$index.options", 'Boolean questions must use the standard true/false options.');
                    }

                    if (! in_array($answer, ['Verdadeiro', 'Falso'], true)) {
                        $validator->errors()->add("questions.$index.correctAnswer", 'Choose Verdadeiro or Falso as the correct answer.');
                    }
                }

                if ($type === 'open' && ($options !== [] || $answer !== null)) {
                    $validator->errors()->add("questions.$index.options", 'Open questions cannot contain options or a correct answer.');
                }
            }
        }];
    }
}
