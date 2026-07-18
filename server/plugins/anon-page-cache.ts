/**
 * Anonymous full-page cache — store layer.
 *
 * Captures the rendered HTML on a cache MISS and writes it to the shared cache.
 * The serve-side middleware (server/middleware/anon-page-cache.ts) only stamps
 * `anonPageCacheKey` onto the context for eligible, anonymous, missed requests,
 * so this hook stores nothing for authenticated renders, redirects, or errors.
 *
 * `render:response` only fires for actual SSR HTML renders — requests served
 * from cache short-circuit in the middleware and never reach here, so there is
 * no re-store loop.
 */
export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:response", (response, { event }) => {
    const key = event.context.anonPageCacheKey as string | undefined;
    if (!key) return;
    if (response.statusCode && response.statusCode !== 200) return;

    const body = response.body;
    if (typeof body !== "string" || body.length === 0) return;

    // Best-effort, fire-and-forget — a cache write must never delay or break
    // the response to the visitor.
    void setCachedPage(key, body);
  });
});
