/**
 * Server-side session hydration (`/auth/get-session`).
 *
 * Resolving the member during SSR is what keeps their data OFF the network tab.
 * With an empty auth store the server renders anonymous, then hydration flips
 * `isAuthenticated` false → true and every watcher keyed to it refires: the
 * session itself, `/games/lobbies` from both `useGameCategoryAvailability` and
 * `useLobbyPage` (the duplicate pair), `/notifications`, and the websocket. One
 * unresolved fetch was producing five browser requests.
 *
 * Replaces `plugins/session-hydrate.server.ts`, which did the same read but
 * (a) no-op'd in production on a stale premise — that was written for a
 * Cloudflare Worker origin which never received the API-domain cookie, whereas
 * the Nitro proxy now rewrites `bn.session` onto the frontend origin and
 * server-side `useApi` forwards it — and (b) ran as a plugin, i.e. BEFORE
 * app.vue had loaded the site config, so `useSiteCurrency()` fell back to its
 * default and could stamp the wrong currency onto the user.
 *
 * The mapped state is RETURNED, not just written to the store: app.vue applies
 * the returned value on the client too. Writing the Pinia store during SSR only
 * helps if that store's state survives the SSR→client handoff, whereas the
 * useAsyncData payload is transferred by definition — so the client is
 * guaranteed to come up authenticated and `session-verify.client.ts` never
 * issues its /auth/get-session.
 */

import { useApi } from "@/composables/useApi";
import { useSiteCurrency } from "@/composables/useSiteCurrency";
import {
  getSessionResponseSchema,
  mapVerifyUserToState,
  type UserState,
} from "@/interfaces/auth.interface";
import { useAuthStore } from "@/stores/auth";

/**
 * Loader — call from useAsyncData in app.vue. Server-only, idempotent.
 *
 * @returns The member's mapped state for the payload, or null when anonymous.
 */
export async function fetchSession(): Promise<UserState | null> {
  const authStore = useAuthStore();

  // The client never fetches here: useAsyncData replays the SSR payload, and
  // app.vue applies it to the store. A genuinely client-side verification (a
  // login, or SSR that could not resolve) belongs to session-verify.client.ts.
  if (!import.meta.server) return null;
  if (authStore.isAuthenticated) return authStore.user;

  // Anonymous requests must not pay for an upstream call — and their HTML is
  // what the anon page cache stores, so it has to stay session-independent.
  const cookie = useRequestHeaders(["cookie"]).cookie ?? "";
  if (!/\bbn\.session=/.test(cookie)) return null;

  // Resolved before the await: both read Nuxt context.
  const api = useApi();
  const currency = useSiteCurrency();

  try {
    // Same contract + mapper the store's own verifyUser() uses, so the SSR and
    // client paths can never disagree about the shape.
    const result = await api.validated(
      getSessionResponseSchema,
      "/auth/get-session",
    );
    // Null is the normal answer for an expired or invalid cookie.
    if (!result?.id) return null;

    const state = mapVerifyUserToState(result, currency);
    authStore.setUser(state);
    return state;
  } catch {
    // Render anonymous and let the client verify after mount.
    return null;
  }
}
