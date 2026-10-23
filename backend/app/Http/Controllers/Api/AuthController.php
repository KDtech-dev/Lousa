<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\LoginRequest;
use App\Http\Resources\UserResource;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\Auth;

class AuthController extends Controller
{
    public function login(LoginRequest $request): UserResource|JsonResponse
    {
        $credentials = $request->validated();

        if (! Auth::guard('web')->attempt($credentials, false)) {
            return response()->json(['message' => 'E-mail ou senha inválidos.'], 422);
        }

        $request->session()->regenerate();

        return new UserResource($request->user('web'));
    }

    public function user(Request $request): UserResource
    {
        return new UserResource($request->user());
    }

    public function logout(Request $request): Response
    {
        Auth::guard('web')->logout();
        $request->session()->invalidate();
        $request->session()->regenerateToken();
        // Sanctum's request guard caches the resolved user. Clear all guards so
        // the invalidated session cannot remain authenticated in long-lived apps.
        Auth::forgetGuards();

        return response()->noContent();
    }
}
