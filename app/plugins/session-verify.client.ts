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

  const waitForBootstrap = () => {
    const ready = useState<boolean>("siteConfigBootstrapReady", () => false);
    if (ready.value) return Promise.resolve();
    return new Promise<void>((resolve) => {
      const stop = watch(ready, (isReady) => {
        if (isReady) {
          stop();
          resolve();
        }
      });
    });
  };

  onNuxtReady(async () => {
    // Currency is supplied by tenant config. Wait only for its bounded
    // foreground attempt; fallback config releases this immediately on errors.
    await waitForBootstrap();
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
      void useNotifications().fetchNotifications();
    }

    /*
      A hidden tab has no socket — it is disconnected below for bfcache — so it
      cannot hear the `kickout` event, and its session check is stopped with it.
      Coming back is therefore the first chance to notice a session that ended
      while the tab was away: confirm it before reconnecting, so a kicked member
      lands on a logged-out page instead of a signed-in one that only corrects
      itself on the next poll.
    */
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") {
        ws.disconnect();
      } else if (
        document.visibilityState === "visible" &&
        authStore.isAuthenticated
      ) {
        void ws.confirmSession().then((valid) => {
          if (valid) ws.connect();
        });
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
        // Restored from bfcache: the same stale-session risk as a tab regaining
        // visibility, and the page may have been frozen for far longer.
        void ws.confirmSession().then((valid) => {
          if (valid) ws.connect();
        });
      }
    });
  });
});
