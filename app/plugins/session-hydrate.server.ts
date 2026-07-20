/**
 * Server-only session hydration.
 *
 * In development, calls /auth/get-session with the visitor's forwarded
 * bn.session cookie
 * so Pinia is populated before SSR render — no anonymous-to-authenticated
 * flash on first paint.
 *
 * In production, this plugin is a no-op. The frontend Worker origin and the
 * backend API origin are different domains, and the bn.session cookie is
 * scoped to the API domain, so the Worker never receives it and cannot
 * forward it to /auth/get-session. Client-side hydration takes over (see
 * session-verify.client.ts).
 */
import {
  getSessionResponseSchema,
  mapVerifyUserToState,
} from "@/interfaces/auth.interface";

export default defineNuxtPlugin(async () => {
  if (process.env.NODE_ENV === "production") return;

  const app = useAuthStore();
  const api = useApi();

  try {
    // Runtime-validated read (same contract + mapper the store uses).
    const result = await api.validated(
      getSessionResponseSchema,
      "/auth/get-session",
    );
    if (!result?.id) return;

    app.setUser(mapVerifyUserToState(result, useSiteCurrency()));
  } catch {
    // No valid session (or invalid shape) — anonymous render
  }
});
