/**
 * Prefetch the site notice during SSR so the browser never requests it.
 *
 * Only the CONTENT is fetched here. Whether the notice is *shown* stays a
 * client decision, because it depends on `sessionStorage.noticeAgreed`, which
 * does not exist on the server: deciding visibility during SSR would render the
 * modal into HTML for a member who had already dismissed it, and the client
 * would then remove it — a hydration mismatch.
 *
 * So the flow is unchanged from the member's point of view — the modal still
 * appears after hydration, via uiStore.fetchNotice() — except that
 * `fetchNotice` finds the payload already in place and makes no HTTP call.
 */

import { useApi } from "@/composables/useApi";
import { useAuthStore } from "@/stores/auth";

/** SSR-transferred raw notice payload; `useState` travels in the payload. */
export const useNoticePrefetch = () =>
  useState<unknown>("notice-prefetch", () => null);

/** Loader — call from useAsyncData in app.vue, after the session resolves. */
export async function fetchNoticeSsr(): Promise<boolean> {
  if (!import.meta.server) return false;

  // The notice is only ever shown to members (session-verify.client.ts gates
  // it), so an anonymous render must not fetch it — that would also put
  // member-facing content into a cacheable anonymous page.
  const authStore = useAuthStore();
  if (!authStore.isAuthenticated) return false;

  const prefetched = useNoticePrefetch();
  if (prefetched.value !== null) return true;

  const api = useApi();
  try {
    prefetched.value = await api("/site/notice");
    return true;
  } catch {
    // Non-critical: fetchNotice() falls back to its own request on the client.
    return false;
  }
}
