<?php

namespace App\Http\Middleware;

use App\Models\Residency;
use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class CheckMessRole
{
    /**
     * Usage in routes: middleware('mess.role:owner,manager')
     * Checks that the authenticated user has an active residency in the mess
     * with one of the specified roles.
     *
     * Expects the route to have a {mess} or {messId} parameter.
     */
    public function handle(Request $request, Closure $next, string ...$roles): Response
    {
        $messId = $request->route('mess') ?? $request->route('messId');

        if (! $messId) {
            return response()->json(['message' => 'Mess ID is required.'], 400);
        }

        $user = $request->user();

        $residency = Residency::where('user_id', $user->id)
            ->where('mess_id', $messId)
            ->whereIn('status', ['active', 'on_leave'])
            ->first();

        if (! $residency) {
            return response()->json(['message' => 'You are not a member of this mess.'], 403);
        }

        if (! empty($roles) && ! in_array($residency->role, $roles)) {
            return response()->json(['message' => 'You do not have permission for this action.'], 403);
        }

        // Attach the residency to the request for downstream use
        $request->merge(['current_residency' => $residency]);

        return $next($request);
    }
}
