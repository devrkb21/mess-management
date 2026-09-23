<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckSuperadmin
{
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (! $user || ! $user->is_superadmin) {
            return response()->json(['message' => 'Unauthorized. Superadmin access required.'], 403);
        }

        if ($user->is_suspended) {
            return response()->json(['message' => 'Account is suspended.'], 403);
        }

        return $next($request);
    }
}
