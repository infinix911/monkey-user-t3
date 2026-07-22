/**
 * Anonymous full-page SSR cache (server-only).
 *
 * Caches rendered HTML for logged-OUT visitors and reuses it, so the bulk of
 * anonymous + crawler traffic skips the Vue SSR render entirely — the largest
 * CPU sink under load on the VPS. This realises the intent documented in
 * server/plugins/cache-bypass-authenticated.ts (which was never wired up).
 *
 * Safety model (one brand+domain per container):
 *   - Only requests WITHOUT a `bn.session` cookie are ever cached or served
 *     from cache. Authenticated requests always bypass (never read, never
 *     write), so per-user HTML can never be stored or leak to another visitor.
 *   - Keyed by host + path + an allowlisted, normalized query string
 *     (see CACHE_KEY_QUERY_ALLOWLIST) so multi-path/paginated content stays
 *     distinct while random cache-busting params can't fragment the cache.
 *
 * Storage: shared Redis when REDIS_HOST is set (survives restarts, shared
 * across replicas); otherwise an in-process Map fallback so the feature still
 * works on a single instance. Both are best-effort — any error falls back to a
 * normal render.
 *
 * Gated entirely behind NUXT_ENABLE_ANON_PAGE_CACHE=true. When off, every
 * helper here is a no-op (pageCacheKey returns null).
 */
import type { H3Event } from "h3";
import { getCanonicalAuthority } from "./request-security";
import type { Redis } from "ioredis";

const KEY_PREFIX = "nuxt:anonpage:";

/** Paths we never cache: APIs, build assets, files, game-launch (CSR). */
const EXCLUDED_PREFIXES = [
  "/api",
  "/_nuxt",
  "/_ipx",
  "/__nuxt",
  "/_scripts",
];
const GAME_ROUTE_PATTERN = /^\/[a-z][a-z0-9-]*\/GAME_[A-Za-z0-9_-]+$/;
const FILE_EXT_PATTERN = /\.[a-z0-9]+$/i;

// Query params that legitimately change anonymous SSR output on a cacheable
// route. Only `page` qualifies (lobbies listing pagination); every other read of
// route.query lives on an already-excluded route (GAME_*). All other
// params — tracking params and bot cache-busters like `?aisPuD4ik6=…` — are
// dropped so they can never fragment the cache. Override via env if a new param
// ever affects an anonymous render.
const CACHE_KEY_QUERY_ALLOWLIST = (
  process.env.NUXT_ANON_PAGE_CACHE_QUERY_ALLOWLIST || "page"
)
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);

/** Deterministic, allowlist-only query string for the cache key. */
function normalizedSearch(url: URL): string {
  const out = new URLSearchParams();
  for (const key of CACHE_KEY_QUERY_ALLOWLIST) {
    // first value only — `?page=1&page=2` can't fan the cache out.
    const value = url.searchParams.get(key);
    if (value != null) out.set(key, value);
  }
  const s = out.toString();
  return s ? `?${s}` : "";
}

function isEnabled(): boolean {
  return process.env.NUXT_ENABLE_ANON_PAGE_CACHE === "true";
}

function ttlMs(): number {
  return Number(process.env.NUXT_ANON_PAGE_CACHE_TTL_MS || 60_000);
}

// ── edge (Cloudflare) cache config ─────────────────────────────────────────
/** Whether to emit CDN-Cache-Control on eligible anonymous HTML so an upstream
 * CDN (Cloudflare) can cache it at the edge. Independent of the in-process
 * anonymous page cache above — either can run without the other. */
export function isEdgeCacheEnabled(): boolean {
  return process.env.NUXT_ENABLE_EDGE_CACHE === "true";
}

/** Edge max-age in seconds (default 300 = 5min). */
export function edgeMaxAgeS(): number {
  return Number(process.env.NUXT_EDGE_CACHE_MAXAGE_S || 300);
}

/** Edge stale-while-revalidate window in seconds (default 3600 = 1h). */
export function edgeSwrS(): number {
  return Number(process.env.NUXT_EDGE_CACHE_SWR_S || 3600);
}

// ── storage ──────────────────────────────────────────────────────────────
const _memCache = new Map<string, { html: string; exp: number }>();

let _redisPromise: Promise<Redis | null> | undefined;
function getRedis(): Promise<Redis | null> {
  if (_redisPromise) return _redisPromise;
  _redisPromise = (async () => {
    const host = process.env.REDIS_HOST;
    if (!host) return null;
    try {
      const { default: RedisClient } = await import("ioredis");
      const client = new RedisClient({
        host,
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
      });
      client.on("error", () => {});
      return client;
    } catch {
      return null;
    }
  })();
  return _redisPromise;
}

// ── eligibility + key ──────────────────────────────────────────────────────
/**
 * Whether this request targets cacheable anonymous HTML: GET, accepts text/html,
 * no `bn.session` cookie, and not an asset/API/game/excluded path. This is
 * the route-level eligibility shared by BOTH the in-process page cache and the
 * Cloudflare edge-cache headers — it deliberately does NOT check any feature
 * flag, so each consumer gates on its own flag.
 */
export function isAnonCacheableRequest(event: H3Event): boolean {
  if ((event.method || "GET").toUpperCase() !== "GET") return false;

  // Authenticated → never cache (would risk per-user HTML leaking).
  const cookie = getHeader(event, "cookie") || "";
  if (/\bbn\.session=/.test(cookie)) return false;

  // Only document (HTML) requests.
  const accept = getHeader(event, "accept") || "";
  if (!accept.includes("text/html")) return false;

  const path = getRequestURL(event).pathname;

  if (EXCLUDED_PREFIXES.some((p) => path === p || path.startsWith(p + "/")))
    return false;
  if (FILE_EXT_PATTERN.test(path)) return false; // robots.txt, *.js, *.png, …
  if (GAME_ROUTE_PATTERN.test(path)) return false;

  return true;
}

/**
 * Returns the cache key for this request, or null when the request must not be
 * cached (feature off, authenticated, non-GET, asset/API/excluded path, or a
 * non-HTML request).
 */
export function pageCacheKey(event: H3Event): string | null {
  if (!isEnabled()) return null;
  if (!isAnonCacheableRequest(event)) return null;

  const url = getRequestURL(event);
  const host = getCanonicalAuthority(event);
  if (!host) return null;
  return `${KEY_PREFIX}${host}${url.pathname}${normalizedSearch(url)}`;
}

/** Returns cached HTML for the key, or null on miss/error. */
export async function getCachedPage(key: string): Promise<string | null> {
  const redis = await getRedis();
  if (redis) {
    try {
      return await redis.get(key);
    } catch {
      // fall through to mem
    }
  }
  const entry = _memCache.get(key);
  if (entry && Date.now() < entry.exp) return entry.html;
  return null;
}

/** Stores HTML for the key (best-effort, never throws). */
export async function setCachedPage(key: string, html: string): Promise<void> {
  const redis = await getRedis();
  if (redis) {
    try {
      await redis.set(key, html, "PX", ttlMs());
      return;
    } catch {
      // fall through to mem
    }
  }
  _memCache.set(key, { html, exp: Date.now() + ttlMs() });
}
