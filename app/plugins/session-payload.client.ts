/**
 * Restore the SSR-resolved member into Pinia BEFORE the app hydrates.
 *
 * `fetchSession` (app.vue → composables/useSession.ts) resolves the member
 * during SSR and returns their state, so it travels in the useAsyncData
 * payload. Applying it inside app.vue's setup was too late: that setup has
 * already awaited by then, and the children are hydrating against server HTML
 * that was rendered as authenticated while the client store was still empty —
 * which showed up as
 *
 *   Hydration node mismatch: rendered on server <div> / expected Symbol(v-cmt)
 *   at <NotificationDropdown> at <BottomNav>
 *
 * i.e. an authenticated-only branch present in the HTML but absent on the
 * client. Plugins run before the Vue app mounts, so setting the store here
 * means the first client render already agrees with the server's.
 *
 * It also keeps `session-verify.client.ts` quiet: that plugin only calls
 * /auth/get-session when the store came up logged-out, which is the request
 * (and the /notifications + /games/lobbies watchers behind it) this whole
 * change exists to remove.
 */
import type { UserState } from "@/interfaces/auth.interface";
import { useAuthStore } from "@/stores/auth";

export default defineNuxtPlugin((nuxtApp) => {
  const state = nuxtApp.payload.data?.session as UserState | null | undefined;
  // Anonymous SSR returns null, and a session that failed to resolve has no id.
  if (!state?.id) return;

  const authStore = useAuthStore();
  if (!authStore.isAuthenticated) authStore.setUser(state);
});
