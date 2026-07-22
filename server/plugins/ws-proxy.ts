import { createProxyServer } from "httpxy";
import type { Server as HttpServer } from "node:http";
import type { Socket } from "node:net";
import { getWebsocketHostUrl } from "../utils/upstream-config";
import {
  normalizeIpAddress,
  resolveCanonicalAuthority,
} from "../../shared/utils/request-security";

/**
 * Same-origin WebSocket proxy. The browser connects to wss://<frontend-host>/ws
 * (built in app/lib/domain.ts → getWsApiUrl). This plugin captures the
 * underlying Node http server on first request and attaches an `upgrade`
 * listener that pipes /ws traffic to the backend WS server at
 * NUXT_WS_API_URL.
 *
 * The backend URL is read only from the server process environment and never
 * reaches the client bundle.
 */
export default defineNitroPlugin((nitroApp) => {
  const target = getWebsocketHostUrl();
  const runtimeConfig = useRuntimeConfig();
  const configuredHosts = [
    String(runtimeConfig.allowedHosts ?? ""),
    String(runtimeConfig.public.siteUrl ?? ""),
  ].filter(Boolean);

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
      const pathname = req.url
        ? new URL(req.url, "http://internal.invalid").pathname
        : "";
      if (pathname === "/ws") {
        const authority = resolveCanonicalAuthority(
          req.headers.host,
          configuredHosts,
          process.env.NODE_ENV === "production",
        );
        const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
        const expectedOrigin = authority ? `${protocol}://${authority.authority}` : "";
        if (!authority || req.headers.origin !== expectedOrigin) {
          socket.destroy();
          return;
        }

        const clientIp =
          normalizeIpAddress(
            Array.isArray(req.headers["cf-connecting-ip"])
              ? req.headers["cf-connecting-ip"][0]
              : req.headers["cf-connecting-ip"],
          ) ?? normalizeIpAddress(req.socket.remoteAddress);
        delete req.headers.forwarded;
        delete req.headers["x-forwarded-host"];
        delete req.headers["x-forwarded-proto"];
        delete req.headers["x-forwarded-for"];
        delete req.headers["cf-connecting-ip"];
        req.headers["x-forwarded-host"] = authority.authority;
        req.headers["x-forwarded-proto"] = protocol;
        if (clientIp) {
          req.headers["x-forwarded-for"] = clientIp;
          req.headers["cf-connecting-ip"] = clientIp;
        }

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
