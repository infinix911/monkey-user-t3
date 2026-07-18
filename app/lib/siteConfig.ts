/**
 * Site Config Fetcher
 *
 * Fetches /api/site/config/userpage and stores the response in
 * useState('userPageConfig'). Called from app.vue via useAsyncData so the
 * page waits for the API before rendering.
 *
 * Two-layer cache:
 * - Server (Cloudflare Worker): module-scope memo keyed by hostname, 5 min TTL.
 *   Survives across requests within the same Worker isolate so repeated SSRs
 *   (e.g. after login-reload) don't re-hit the backend for shared site config.
 * - Client: localStorage warm-start so if a page renders before SSR payload
 *   resolves, the config is still there from the previous visit.
 */

import { useApi } from "@/composables/useApi";

export interface CustomSeoEntry {
  id: number;
  domainName: string;
  canonical: string;
  googleVerificationSite?: string | null;
  ampTag?: string | null;
  ampPageRedirect?: string | null;
  metaTitle?: string | null;
  metaKeyword?: string | null;
  metaDescription?: string | null;
  footer?: unknown | null;
}

type CacheEntry = { data: unknown; exp: number };
// 5 s — short enough that admin edits are visible by the time the editor
// alt-tabs back to the public site, long enough to absorb request bursts so
// each Worker isolate doesn't re-fetch on every render. See
// PLAN-PER-ISOLATE-SSR-CACHE.md §7 for the original 60 s choice.
const SERVER_CACHE_TTL_MS = 5 * 1000;
const CLIENT_CACHE_KEY = "themeConfig.v1";
const _serverCache = new Map<string, CacheEntry>();

/**
 * Recursively upgrades any http:// URLs to https:// in the config object.
 * Prevents mixed-content warnings and HTTPS Lighthouse failures caused by
 * the backend/CMS returning plain-HTTP CDN links.
 */
function enforceHttps(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj.startsWith("http://") ? obj.replace("http://", "https://") : obj;
  }
  if (Array.isArray(obj)) return obj.map(enforceHttps);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      out[key] = enforceHttps((obj as Record<string, unknown>)[key]);
    }
    return out;
  }
  return obj;
}

/**
 * Detects the `?themePreview=1` query flag on both server and client.
 * Used to load the staged `domain=preview` theme config and bypass all
 * caches so preview data never leaks into normal sessions.
 * Never throws during SSR (Nuxt async context may be unavailable).
 */
export function isThemePreview(): boolean {
  if (import.meta.server) {
    try {
      return useRequestURL().searchParams.get("themePreview") === "1";
    } catch {
      return false;
    }
  }
  if (typeof window !== "undefined") {
    return (
      new URLSearchParams(window.location.search).get("themePreview") === "1"
    );
  }
  return false;
}

function getHostname(): string {
  if (import.meta.server) {
    // Try useRequestURL first; if Nuxt's async context is unavailable,
    // fall back to pulling the Host header off the h3 event.
    try {
      return useRequestURL().hostname;
    } catch {
      // fall through
    }
    try {
      const event = useRequestEvent();
      const hostHeader =
        event?.node?.req?.headers?.host ||
        (event?.headers as Headers | undefined)?.get?.("host");
      if (hostHeader) return String(hostHeader).split(":")[0] ?? "_default";
    } catch {
      // fall through
    }
    return "_default";
  }
  if (typeof window !== "undefined") return window.location.hostname;
  return "_default";
}

/**
 * Pass-through merge: filters `custom_seo` rows by current hostname (so a
 * multi-tenant DB can't leak rows across domains) and stores the filtered
 * array on `cfg.seo.customSeoRows` for the per-page resolver
 * (`useCustomSeoMatch`) to consume at render time.
 *
 * Does NOT overlay any row onto `seo.social.*` / `seo.meta.*` /
 * `seo.verification.*` / `seo.customSeo.*`. Those paths reflect only what
 * `/api/site/config/userpage` returned — the per-page row layers on top
 * inside `useSeoHead` when the current URL matches a row's canonical.
 *
 * Dev convenience: on localhost/127.0.0.1 keep every row (so developers see
 * overrides without seeding a dev-specific row).
 */
function applyCustomSeo(
  cfg: unknown,
  rows: CustomSeoEntry[],
  hostArg: string,
): unknown {
  if (!cfg || typeof cfg !== "object") return cfg;

  const host = hostArg.toLowerCase();
  const isDevHost = host === "localhost" || host === "127.0.0.1";
  const filtered = isDevHost
    ? rows
    : rows.filter((r) => {
        const d = r.domainName?.toLowerCase();
        if (!d) return false;
        return d === host || host.endsWith("." + d);
      });

  const next = { ...(cfg as Record<string, unknown>) };
  const seo = { ...((next.seo as Record<string, unknown>) ?? {}) };
  seo.customSeoRows = filtered;
  next.seo = seo;

  return next;
}

export const fetchSiteConfig = async () => {
  const apiData = useState<unknown>("userPageConfig", () => null);
  const configError = useState<string | null>("siteConfigError", () => null);

  // Already populated (payload hydration or previous call) — skip refetch
  if (apiData.value) return apiData.value;

  const host = getHostname();
  // Preview mode (`?themePreview=1`): load the staged `domain=preview` config
  // and bypass every cache layer so staged data never poisons normal sessions.
  const isPreview = isThemePreview();

  // Server: per-isolate module cache, keyed by hostname.
  // Skipped in dev so code/DB changes are picked up immediately without
  // waiting for the 5 min TTL or a dev-server restart.
  if (import.meta.server && !import.meta.dev && !isPreview) {
    const entry = _serverCache.get(host);
    if (entry && Date.now() < entry.exp) {
      apiData.value = entry.data;
      configError.value = null;
      return apiData.value;
    }
  }

  // Client: warm-start from localStorage so the page renders with the last
  // known config before the network request resolves (prevents PageLoader
  // flash on reloads like login → window.location.reload()).
  // Skipped in dev so stale pre-merge data doesn't override fresh SSR output.
  if (import.meta.client && !import.meta.dev && !isPreview) {
    try {
      const cached = localStorage.getItem(CLIENT_CACHE_KEY);
      if (cached) {
        apiData.value = JSON.parse(cached);
        configError.value = null;
        // Fall through to refresh in the background
      }
    } catch {
      // Ignore quota/parse errors
    }
  }

  // SSR runs inside a Cloudflare Worker with tight wall-time/subrequest
  // budgets — keep retries cheap there. Client gets the full retry budget.
  const MAX_RETRIES = import.meta.server ? 1 : 3;
  const RETRY_DELAY = 1500;
  const REQUEST_TIMEOUT = import.meta.server ? 3000 : 10000;
  const api = useApi();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      // Fire /theme and /custom-seo in parallel so total wall time is
      // max(a, b) instead of a + b. The merge still runs only after both
      // resolve; a /custom-seo failure is swallowed and falls through to
      // the raw theme config.
      const [userpageRes, customSeoRes] = await Promise.allSettled([
        api<unknown>(
          isPreview
            ? "/site/config/theme?domain=preview"
            : "/site/config/theme",
          { timeout: REQUEST_TIMEOUT },
        ),
        api<CustomSeoEntry[] | { data: CustomSeoEntry[] }>(
          "/site/custom-seo",
          { timeout: 3000 },
        ),
      ]);
      if (userpageRes.status !== "fulfilled") throw userpageRes.reason;
      const cleaned = enforceHttps(userpageRes.value);
      const rows: CustomSeoEntry[] =
        customSeoRes.status === "fulfilled"
          ? Array.isArray(customSeoRes.value)
            ? customSeoRes.value
            : (customSeoRes.value?.data ?? [])
          : [];
      const merged = applyCustomSeo(cleaned, rows, host);
      apiData.value = merged;
      configError.value = null;

      if (import.meta.server && !isPreview) {
        _serverCache.set(host, {
          data: merged,
          exp: Date.now() + SERVER_CACHE_TTL_MS,
        });
      }
      if (import.meta.client && !isPreview) {
        try {
          localStorage.setItem(CLIENT_CACHE_KEY, JSON.stringify(merged));
        } catch {
          // Ignore quota errors
        }
      }

      return apiData.value;
    } catch (err) {
      console.error(
        `[siteConfig] Fetch attempt ${attempt}/${MAX_RETRIES} failed:`,
        err,
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * attempt),
        );
      }
    }
  }

  // All retries failed. If we had a client cache hit, keep serving it.
  if (apiData.value) return apiData.value;

  // Soft fallback: render with the compiled brand defaults so the site is
  // usable even when the CMS payload is unavailable. Banners/SEO degrade
  // gracefully instead of nuking the whole layout.
  try {
    const { useSiteConfig } = await import("@/composables/useSiteConfig");
    apiData.value = useSiteConfig();
    configError.value = null;
  } catch {
    configError.value =
      "Failed to load site configuration. Please refresh the page.";
  }

  // SSR: signal upstream failure with a non-2xx status so Cloudflare's `swr`
  // layer does NOT cache this HTML at the edge. Without this, one transient
  // backend hiccup poisons the cache for every visitor for up to 5 minutes.
  // The rendered body is still the soft-fallback layout, just served as 503.
  if (import.meta.server) {
    try {
      const event = useRequestEvent();
      if (event) setResponseStatus(event, 503);
    } catch {
      // No request event — ignore.
    }
  }

  return apiData.value;
};
