/**
 * Cache-control headers for SSR HTML responses.
 *
 * Authenticated requests (a `bn.session` cookie present): the SSR output likely
 * contains per-user data (wallet, notifications, etc.) baked into the HTML.
 * Mark the response `private, no-store` so no upstream cache (a CDN/edge, or a
 * reverse proxy like the Traefik fronting this node-server deployment) ever
 * stores it.
 *
 * Anonymous requests on a cacheable route: when NUXT_ENABLE_EDGE_CACHE=true,
 * emit `CDN-Cache-Control` with a positive TTL so Cloudflare can serve the
 * logged-out HTML from the edge (offloading anon + crawler traffic from the
 * origin), while the browser `Cache-Control` stays conservative
 * (`max-age=0, must-revalidate`). Cloudflare honors CDN-Cache-Control for edge
 * TTL independently of Cache-Control. The same logged-out HTML is shared across
 * visitors; route eligibility is shared with the in-process anonymous page
 * cache via isAnonCacheableRequest (server/utils/anonPageCache.ts), so anything
 * carrying `bn.session` is excluded here and never edge-cacheable. At the edge,
 * a matching "bypass cache on cookie: bn.session" rule is the second guard so
 * authenticated requests never hit or populate the edge cache.
 *
 * This is NOT a proxy. It only adjusts response headers.
 */
import {
  isAnonCacheableRequest,
  isEdgeCacheEnabled,
  edgeMaxAgeS,
  edgeSwrS,
} from "../utils/anonPageCache";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("beforeResponse", (event) => {
    // Proxied API responses (server/routes/api/[...path].ts) stream via
    // proxyRequest and have already flushed headers by the time this hook
    // fires — mutating headers here throws ERR_HTTP_HEADERS_SENT. They also
    // carry their own cache-control from the backend. Only SSR HTML page
    // renders need this guard.
    if (event.node.res.headersSent) return;
    if (event.path.startsWith("/api/")) return;

    const cookie = getHeader(event, "cookie") || "";
    if (/\bbn\.session=/.test(cookie)) {
      setResponseHeader(event, "cache-control", "private, no-store");
      return;
    }

    // Anonymous + cacheable route → let Cloudflare cache at the edge while
    // browsers revalidate. Covers both a fresh render (cache MISS) and an
    // in-process cache HIT, so the very first edge fill is cacheable too.
    if (isEdgeCacheEnabled() && isAnonCacheableRequest(event)) {
      setResponseHeader(
        event,
        "cache-control",
        "public, max-age=0, must-revalidate",
      );
      setResponseHeader(
        event,
        "cdn-cache-control",
        `public, max-age=${edgeMaxAgeS()}, stale-while-revalidate=${edgeSwrS()}`,
      );
    }
  });
});
