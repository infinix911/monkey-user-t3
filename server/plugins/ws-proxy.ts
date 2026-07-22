import { createProxyServer } from "httpxy";
import type { Server as HttpServer } from "node:http";
import type { Socket } from "node:net";
import { getWebsocketHostUrl } from "../utils/upstream-config";

/**
 * Same-origin WebSocket proxy. The browser connects to wss://<frontend-host>/ws
 * (built in app/lib/domain.ts → getWsApiUrl). This plugin captures the
 * underlying Node http server on first request and attaches an `upgrade`
 * listener that pipes /ws traffic to the backend WS server at
 * WEBSOCKET_HOST_URL.
 *
 * The backend URL is read only from the server process environment and never
 * reaches the client bundle.
 */
export default defineNitroPlugin((nitroApp) => {
  const target = getWebsocketHostUrl();

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
