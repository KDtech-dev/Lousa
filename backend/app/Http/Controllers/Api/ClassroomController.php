<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreClassroomRequest;
use App\Http\Requests\Api\UpdateClassroomRequest;
use App\Http\Resources\ClassroomResource;
use App\Models\Classroom;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class ClassroomController extends Controller
{
    public function index(Request $request): AnonymousResourceCollection
    {
        $this->authorize('viewAny', Classroom::class);

        return ClassroomResource::collection(
            $request->user()->teachingClassrooms()->orderBy('name')->get(),
        );
    }

    public function store(StoreClassroomRequest $request): JsonResponse
    {
        $this->authorize('create', Classroom::class);

        $classroom = $request->user()->teachingClassrooms()->create($request->validated());

        return (new ClassroomResource($classroom))->response()->setStatusCode(201);
    }

    public function show(Classroom $classroom): ClassroomResource
    {
        $this->authorize('view', $classroom);

        return new ClassroomResource($classroom->load('students:id,name,email,role'));
    }

    public function update(UpdateClassroomRequest $request, Classroom $classroom): ClassroomResource
    {
        $this->authorize('update', $classroom);
        $classroom->update($request->validated());

        return new ClassroomResource($classroom->refresh());
    }
}
