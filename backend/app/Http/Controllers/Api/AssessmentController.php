<?php

namespace App\Http\Controllers\Api;

use App\Enums\AssessmentStatus;
use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreAssessmentRequest;
use App\Http\Requests\Api\UpdateAssessmentRequest;
use App\Http\Resources\AssessmentResource;
use App\Models\Assessment;
use App\Services\AssessmentService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class AssessmentController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Assessment::class);

        return AssessmentResource::collection(
            $request->user()->assessments()->with('questions')->latest('updated_at')->get(),
        );
    }

    public function store(StoreAssessmentRequest $request, AssessmentService $service): JsonResponse
    {
        $this->authorize('create', Assessment::class);

        return (new AssessmentResource($service->createDraft($request->user(), $request->validated())))
            ->response()
            ->setStatusCode(201);
    }

    public function show(Assessment $assessment): AssessmentResource
    {
        $this->authorize('view', $assessment);

        return new AssessmentResource($assessment->load('questions'));
    }

    public function update(
        UpdateAssessmentRequest $request,
        Assessment $assessment,
        AssessmentService $service,
    ): AssessmentResource {
        $this->authorize('update', $assessment);

        return new AssessmentResource($service->updateDraft($assessment, $request->validated()));
    }

    public function archive(Assessment $assessment): AssessmentResource
    {
        $this->authorize('archive', $assessment);
        $assessment->status = AssessmentStatus::Archived;
        $assessment->save();

        return new AssessmentResource($assessment->load('questions'));
    }
}
