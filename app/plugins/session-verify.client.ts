/**
 * Client-only session bootstrap.
 *
 * In production, SSR hydration is skipped (cookie scoped to API domain is not
 * forwarded by the Worker), so this plugin verifies the session by calling
 * /auth/get-session after mount. In development, SSR already populated the store, so
 * we only verify if Pinia came up logged-out.
 *
 * Once authenticated, connects the WebSocket and fetches notices. Also pauses
 * WS on tab hide for bfcache friendliness.
 */
import { useWebSocketStore } from "@/stores/websocket";

export default defineNuxtPlugin(() => {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  const ws = useWebSocketStore();

  onNuxtReady(async () => {
    if (!authStore.isAuthenticated) {
      try {
        await authStore.verifyUser();
      } catch {
        // No valid session — stay anonymous
      }
    }

    if (authStore.isAuthenticated) {
      ws.connect();
      uiStore.fetchNotice();
    }

    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        ws.disconnect();
      } else if (
        document.visibilityState === "visible" &&
        authStore.isAuthenticated
      ) {
        ws.connect();
      }
    });

    // bfcache friendliness: Chrome refuses to put a page in the back/forward
    // cache if it has an open WebSocket. Disconnect on `pagehide` (the
    // bfcache-aware sibling of `unload`) so navigating away leaves the page
    // restorable. Reconnect on `pageshow` only when restored from bfcache
    // (event.persisted=true) — fresh navigations re-run this plugin so the
    // initial connect path handles them.
    window.addEventListener("pagehide", () => {
      ws.disconnect();
    });
    window.addEventListener("pageshow", (event) => {
      if (event.persisted && authStore.isAuthenticated) {
        ws.connect();
      }
    });
  });
});
