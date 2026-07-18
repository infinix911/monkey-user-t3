/**
 * Anonymous full-page cache — serve layer.
 *
 * Runs before the renderer (and before guard.ts, alphabetically). On a cache
 * HIT it returns the stored HTML, short-circuiting the request so the Vue SSR
 * render never runs. On a MISS it stamps the key onto the event context so the
 * companion plugin (server/plugins/anon-page-cache.ts) can store the rendered
 * HTML in `render:response`.
 *
 * `pageCacheKey` returns null for anything that must not be cached (feature
 * disabled, authenticated session cookie, non-GET, assets/APIs, game
 * routes), so this middleware is a cheap no-op for those requests.
 */
export default defineEventHandler(async (event) => {
  const key = pageCacheKey(event);
  if (!key) return;

  const cached = await getCachedPage(key);
  if (cached !== null) {
    setResponseHeader(event, "content-type", "text/html; charset=utf-8");
    setResponseHeader(event, "x-anon-cache", "HIT");
    setResponseHeader(
      event,
      "cache-control",
      "public, max-age=0, must-revalidate",
    );
    return cached;
  }

  // Miss → let the renderer run; signal the plugin to store the result.
  event.context.anonPageCacheKey = key;
  setResponseHeader(event, "x-anon-cache", "MISS");
});
