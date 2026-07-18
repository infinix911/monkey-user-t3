import { createProxyServer } from "httpxy";
import type { Server as HttpServer } from "node:http";
import type { Socket } from "node:net";

/**
 * Same-origin WebSocket proxy. The browser connects to wss://<frontend-host>/ws
 * (built in app/lib/domain.ts → getWsApiUrl). This plugin captures the
 * underlying Node http server on first request and attaches an `upgrade`
 * listener that pipes /ws traffic to the backend WS server at NUXT_WS_API_URL.
 *
 * The backend URL is server-only (runtimeConfig.wsApiUrl) and never reaches
 * the client bundle.
 */
export default defineNitroPlugin((nitroApp) => {
  const cfg = useRuntimeConfig();
  const target = cfg.wsApiUrl as string | undefined;

  if (!target) {
    // Skip silently in environments without a WS backend configured (e.g.
    // build-time prerender). The Node server simply will not upgrade /ws.
    return;
  }

  const proxy = createProxyServer({
    target,
    ws: true,
    changeOrigin: true,
  });

  proxy.on("error", (err) => {
    // h3 strips console.* in production builds; keep raw stderr write so
    // proxy faults still surface in container logs.
    process.stderr.write(`[ws-proxy] ${(err as Error).message}\n`);
  });

  type TaggedServer = HttpServer & { __wsProxyAttached?: boolean };

  nitroApp.hooks.hook("request", (event) => {
    type SocketWithServer = NonNullable<typeof event.node.req.socket> & { server?: TaggedServer };
    const server = (event.node.req.socket as SocketWithServer | null)?.server;
    if (!server || server.__wsProxyAttached) return;
    server.__wsProxyAttached = true;

    server.on("upgrade", (req, socket, head) => {
      if (req.url && req.url.startsWith("/ws")) {
        // httpxy's ws() takes (req, socket, opts, head) and returns a promise;
        // swallow rejections here so a failed upgrade never becomes an
        // unhandled rejection (faults still surface via the "error" handler).
        // The upgrade event types `socket` as Duplex; at runtime it is a
        // net.Socket, which httpxy's ws() expects.
        proxy.ws(req, socket as Socket, {}, head).catch(() => {});
      }
    });
  });
});
