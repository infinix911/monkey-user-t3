/**
 * Per-request SSR/SPA switch.
 *
 * SSR is only needed for SEO, which is irrelevant once a visitor is logged in.
 * Logged-in requests also bypass every cache (the anon page cache + edge cache
 * apply only to anonymous traffic), so they were the uncacheable SSR render load
 * saturating the single Node render core under load — the cause of 502s.
 *
 * Strategy: for authenticated requests (server-read `bn.session` cookie) set
 * `event.context.nuxt.noSSR = true`. The Nuxt renderer reads exactly this flag
 * (`ssrContext.noSSR = event.context.nuxt?.noSSR`) to skip `renderToString` and
 * serve the SPA shell (app/spa-loading-template.html) instead — the client then
 * mounts and fetches its own data.
 *
 *   - Authenticated → noSSR (SPA, no server render).
 *   - Anonymous      → flag never set → normal SSR → SEO HTML preserved.
 *
 * The decision is driven purely by a server-read cookie, never by anything the
 * client can send, so a crawler can never force itself out of SSR.
 *
 * Runs before the renderer like the other server middleware. Order relative to
 * anon-page-cache.ts is irrelevant: that middleware is already a no-op whenever a
 * bn.session cookie is present.
 *
 * DEFAULT IS NOW OFF. SPA mode is what pushed the banner, SEO/site-config and
 * custom-script fetches into the browser for logged-in users: with no server
 * render there is no server fetch, so the client had to make those calls and
 * they showed up in the Network tab. Keeping SSR for authenticated requests
 * means `useAsyncData` resolves them on the server and hydrates from the
 * payload, so the browser makes none of them.
 *
 * The trade this reintroduces is the one described above: authenticated
 * renders are uncacheable, so each one costs the render core. Set
 * `NUXT_AUTH_SPA=true` to restore the old shed-load behaviour if that becomes
 * the binding constraint again.
 */
const AUTH_SPA_ENABLED = process.env.NUXT_AUTH_SPA === "true";

export default defineEventHandler((event) => {
  if (!AUTH_SPA_ENABLED) return; // authenticated requests keep SSR

  // Cheap gate: only document (HTML) GETs render — skip APIs/assets entirely.
  if ((event.method || "GET").toUpperCase() !== "GET") return;
  const accept = getHeader(event, "accept") || "";
  if (!accept.includes("text/html")) return;

  const cookie = getHeader(event, "cookie") || "";
  if (!/\bbn\.session=/.test(cookie)) return; // anonymous → keep SSR

  // Authenticated → render as SPA (no server-side Vue render).
  const ctx = event.context as { nuxt?: { noSSR?: boolean } };
  ctx.nuxt = { ...ctx.nuxt, noSSR: true };
});
