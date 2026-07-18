/**
 * Auth Middleware (Global)
 *
 * Runs on the client after hydration. The server-side protection is
 * handled earlier by server/middleware/guard.ts which blocks requests
 * without a bn.session cookie before they reach the renderer.
 *
 * Protected Routes:
 * - All game routes (/:game_type/GAME_[id])
 *
 * Security note: This middleware is UI-only protection. All protected
 * API endpoints MUST enforce authentication on the server side.
 */

// Exact protected path segments — use a Set for O(1) lookups
const PROTECTED_PATHS = new Set<string>([]);

// Stricter game route pattern: /[lowercase-slug]/GAME_[alphanumeric-id]
const GAME_ROUTE_PATTERN = /^\/[a-z][a-z0-9-]*\/GAME_[A-Za-z0-9_-]+$/;

export default defineNuxtRouteMiddleware(async (to) => {
  // Only run on client-side (SPA mode has no server-side rendering)
  if (import.meta.server) return;

  const authStore = useAuthStore();

  // Check if path is a protected static route (exact match or sub-path)
  const isProtectedStaticPath =
    PROTECTED_PATHS.has(to.path) ||
    [...PROTECTED_PATHS].some((p) => to.path.startsWith(p + "/"));

  // Check if it's a game route
  const isGameRoute = GAME_ROUTE_PATTERN.test(to.path);

  // Only proceed for routes that require authentication
  if (!isProtectedStaticPath && !isGameRoute) return;

  // If store is not yet hydrated (cold navigation), attempt a server-side
  // session check before making an auth decision. This prevents incorrectly
  // redirecting authenticated users who hit a protected URL directly.
  if (!authStore.isAuthenticated) {
    try {
      await authStore.verifyUser();
    } catch {
      // verifyUser throws on 401/network error — user is not authenticated
      return navigateTo("/");
    }
  }

  // After verification, if still not authenticated, redirect home
  if (!authStore.isAuthenticated) {
    return navigateTo("/");
  }
});
