import type { H3Event } from "h3";

/**
 * Server-side currency resolver — counterpart to `useSiteCurrency()`.
 *
 * Nitro middleware (e.g. `server/middleware/guard.ts`) and Nitro routes
 * (e.g. `server/routes/sitemap.xml.ts`) run before Vue setup, so they can't
 * read the `useState('userPageConfig')` that the app populates during render.
 * This helper fetches the userpage config directly from the backend, with a
 * per-isolate cache keyed by hostname so repeat hits within a Worker isolate
 * are free.
 *
 * The backend already memo-caches /api/site/config/userpage in Redis with a
 * 120 s TTL, so the first fetch per isolate is cheap (sub-100 ms) and
 * subsequent fetches in the same isolate skip the network entirely.
 */
export type SiteCurrency = "IDR" | "THB" | "USD" | "KRW";

const FALLBACK: SiteCurrency = "KRW";
const VALID = new Set<SiteCurrency>(["IDR", "THB", "USD", "KRW"]);
const CACHE_TTL_MS = 60 * 1000;

type CacheEntry = { currency: SiteCurrency; exp: number };
const cache = new Map<string, CacheEntry>();

function normalize(raw: unknown): SiteCurrency {
  const code = String(raw ?? "").toUpperCase() as SiteCurrency;
  return VALID.has(code) ? code : FALLBACK;
}

export async function getSiteCurrency(event: H3Event): Promise<SiteCurrency> {
  const host = (getRequestURL(event).hostname || "_default").toLowerCase();
  const hit = cache.get(host);
  if (hit && Date.now() < hit.exp) return hit.currency;

  const config = useRuntimeConfig(event) as unknown as {
    apiBaseInternal?: string;
    public: { apiBase?: string };
  };
  const base =
    config.apiBaseInternal || config.public.apiBase || "http://localhost:4000/api";

  try {
    const res = await $fetch<{ data?: { currency?: unknown } }>(
      "/site/config/userpage",
      { baseURL: base, retry: 0, timeout: 3000 },
    );
    const currency = normalize(res?.data?.currency);
    cache.set(host, { currency, exp: Date.now() + CACHE_TTL_MS });
    return currency;
  } catch {
    // Soft fail — fall back to the default so middleware never blocks a
    // request because of a transient backend hiccup. Cache the fallback
    // briefly so we don't hammer the backend during an outage.
    cache.set(host, { currency: FALLBACK, exp: Date.now() + 10_000 });
    return FALLBACK;
  }
}
