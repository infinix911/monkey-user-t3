/**
 * Inline render-blocking `/_nuxt/*.css` stylesheets into the SSR <head>.
 *
 * The app ships its styles as render-blocking `<link rel="stylesheet">` in
 * <head>: one large global Tailwind file (`/_nuxt/entry.<hash>.css`, ~179 KB raw
 * / ~23 KB brotli, from `css: ['@/assets/css/main.css']`) plus a few small
 * route/component chunks (index/HotGameCard/homepageLobbyAssets/GamePageLayout).
 * Nuxt's `features.inlineStyles` inlines per-component *scoped* styles but leaves
 * both the global `css:[]` entry stylesheet AND these chunk stylesheets as
 * external links.
 *
 * Because every layout/utility style lives in that CSS, the browser paints
 * NOTHING until those links download — and the first thing it then paints is the
 * pure-black body (`bg-black` + `theme-color:#000`). On a cold/slow load that is
 * a ~450 ms full-screen black flash before the lobby appears.
 *
 * This plugin moves every render-blocking `/_nuxt/*.css` link the SSR already
 * decided this page needs into an inline `<style>`, so the document is
 * self-styled: first paint happens as soon as the HTML is parsed, with no CSS
 * round trip. Each stylesheet body is fetched once via an internal `$fetch`
 * (files are content-hashed, so results are cached for the process lifetime).
 *
 * Trade-off: +~23 KB brotli per SSR document, and the CSS is no longer served as
 * separately long-cached files. Accepted to kill the cold-load black flash — see
 * PLAN analyze-the-production-build.
 *
 * CSP: nuxt-security stamps a per-request `nonce` onto every <head> tag,
 * including the stylesheet `<link>` we replace. We reuse that exact nonce on the
 * emitted `<style>` so `style-src 'nonce-…'` allows it. If the nonce can't be
 * found, or a fetch fails, we leave that link untouched and degrade to the
 * original render-blocking `<link>` — never break the render to save a flash.
 */

// Matches any built stylesheet <link …> tag anywhere in a head string,
// regardless of attribute order. Validated as a real stylesheet below.
const CSS_LINK_RE =
  /<link\b[^>]*\/_nuxt\/[A-Za-z0-9_.-]+\.css[^>]*>/gi;

// Per-process cache keyed by href: filenames are content-hashed, so once fetched
// a stylesheet is stable until the next deploy (new process).
const cssCache = new Map<string, string>();

async function loadCss(href: string): Promise<string | null> {
  const cached = cssCache.get(href);
  if (cached !== undefined) return cached;
  try {
    // Relative path → routed to this Nitro app's own public-asset handler.
    const css = await $fetch<string>(href, { responseType: "text" });
    if (typeof css === "string" && css.length > 0) {
      cssCache.set(href, css);
      return css;
    }
  } catch {
    // Asset unreachable — fall back to the render-blocking <link>.
  }
  return null;
}

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("render:html", async (html) => {
    if (!Array.isArray(html.head)) return;

    for (let i = 0; i < html.head.length; i++) {
      const chunk = html.head[i];
      if (typeof chunk !== "string" || !chunk.includes("/_nuxt/")) continue;

      const tags = chunk.match(CSS_LINK_RE);
      if (!tags) continue;

      let next = chunk;
      for (const tag of tags) {
        // Only replace real stylesheet links (skip preload/prefetch hints).
        if (!/rel\s*=\s*["']stylesheet["']/i.test(tag)) continue;

        const href = tag.match(/href\s*=\s*["']([^"']+)["']/i)?.[1];
        if (!href) continue;

        const css = await loadCss(href);
        if (!css) continue; // fetch failed — keep this <link> render-blocking.

        const nonce = tag.match(/nonce\s*=\s*["']([^"']+)["']/i)?.[1];
        const nonceAttr = nonce ? ` nonce="${nonce}"` : "";
        next = next.replace(tag, `<style${nonceAttr}>${css}</style>`);
      }
      html.head[i] = next;
    }
  });
});
