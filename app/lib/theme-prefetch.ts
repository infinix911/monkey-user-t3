/**
 * Early theme-config request, started by an inline <head> script in the static
 * index.html (nuxt.config `app.head.script`).
 *
 * Why: this is a static SPA. `fetchSiteConfig()` runs from app.vue's
 * onMounted, i.e. only after the whole JS bundle has downloaded and executed,
 * so on a cold visit (no localStorage warm start) the app painted the bundled
 * default theme and swapped to the CMS theme ~0.5s later — a visible flash.
 * Firing the request from the HTML makes it run in parallel with the bundle
 * download instead of after it, so it has normally landed before first paint.
 *
 * First paint is still never gated on the API: if the response is slower than
 * the bundle, the app renders its bundled fallback exactly as before and
 * `fetchSiteConfig()` applies the theme when it arrives.
 *
 * Imported by nuxt.config.ts — keep this module free of Nuxt runtime imports.
 */
import { getProductionApiBase } from "./api-base";

/** Window property holding the in-flight request promise. */
const GLOBAL_KEY = "__siteThemePrefetch";
/** Window property holding the parsed response once it has landed. */
const DATA_KEY = "__siteThemePrefetchData";

/**
 * Inline script for the static HTML. Resolves the API base the same way
 * `getApiBase()` does: on deployed hosts via the SAME `getProductionApiBase()`
 * (its source is embedded, so the two cannot drift); on localhost via
 * `localApiBase` — the build/dev-start value of NUXT_PUBLIC_API_BASE, which is
 * what `npm run dev` also hands the app. Skipped in `?themePreview=1` mode
 * (which loads the staged config instead) and on localhost without a base.
 *
 * @param localApiBase - API base used when served from localhost/127.0.0.1.
 * @returns {string} Self-contained script body.
 */
export function buildThemePrefetchScript(localApiBase?: string): string {
  return `(function(){try{
var h=location.hostname;
if(new URLSearchParams(location.search).get("themePreview")==="1")return;
var local=h==="localhost"||h==="127.0.0.1";
var base=local?${JSON.stringify((localApiBase ?? "").replace(/\/$/, ""))}:(${getProductionApiBase.toString()})(h);
if(!base)return;
var p=fetch(base+"/site/config/theme",{credentials:"include"}).then(function(r){if(!r.ok)throw new Error("HTTP "+r.status);return r.json();}).then(function(j){window.${DATA_KEY}=j;return j;});
p.catch(function(){});
window.${GLOBAL_KEY}=p;
}catch(e){}})();`;
}

type PrefetchWindow = Record<string, unknown>;

/**
 * Take the early response synchronously if it has ALREADY landed — used by
 * plugins/theme-prefetch.client.ts before the app mounts, so the very first
 * render uses the CMS theme. Consumes the request either way it succeeds.
 *
 * @returns {unknown} The parsed theme, or `undefined` if not landed yet.
 */
export function takeThemePrefetchData(): unknown {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as PrefetchWindow;
  if (!(DATA_KEY in w)) return undefined;
  const data = w[DATA_KEY];
  Reflect.deleteProperty(w, DATA_KEY);
  Reflect.deleteProperty(w, GLOBAL_KEY);
  return data;
}

/**
 * Take the early request, once. Later calls (retries, background refresh)
 * get `undefined` and make a normal request.
 *
 * @returns {Promise<unknown> | undefined} The parsed theme response promise.
 */
export function takeThemePrefetch(): Promise<unknown> | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as PrefetchWindow;
  const pending = w[GLOBAL_KEY] as Promise<unknown> | undefined;
  Reflect.deleteProperty(w, GLOBAL_KEY);
  Reflect.deleteProperty(w, DATA_KEY);
  return pending;
}
