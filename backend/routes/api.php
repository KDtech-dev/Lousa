<?php

use App\Http\Controllers\Api\AssessmentController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\ClassroomController;
use App\Http\Controllers\Api\ClassroomEnrollmentController;
use Illuminate\Support\Facades\Route;

Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:login');

Route::middleware('auth:sanctum')->group(function (): void {
    Route::get('/user', [AuthController::class, 'user']);
    Route::post('/logout', [AuthController::class, 'logout']);

    Route::apiResource('classrooms', ClassroomController::class)
        ->only(['index', 'store', 'show', 'update']);

    Route::get('/classrooms/{classroom}/students', [ClassroomEnrollmentController::class, 'index']);
    Route::post('/classrooms/{classroom}/enrollments', [ClassroomEnrollmentController::class, 'store']);
    Route::delete('/classrooms/{classroom}/enrollments/{enrollment}', [ClassroomEnrollmentController::class, 'destroy']);

    Route::get('/activities', [AssessmentController::class, 'index']);
    Route::post('/activities', [AssessmentController::class, 'store']);
    Route::get('/activities/{assessment}', [AssessmentController::class, 'show']);
    Route::put('/activities/{assessment}', [AssessmentController::class, 'update']);
    Route::patch('/activities/{assessment}/archive', [AssessmentController::class, 'archive']);
});
