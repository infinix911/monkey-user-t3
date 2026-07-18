/**
 * Shared SSR cache for public, user-independent fetches.
 *
 * Runtime reality: this app is deployed with the Nitro `node-server` preset as
 * a single long-lived Node process behind Traefik on a VPS (NOT Cloudflare
 * Worker isolates — the old comment was wrong). That means:
 *
 *   - When REDIS_HOST is set, entries are cached in Redis (shared across
 *     restarts and any future scaled replicas, and co-located with the backend
 *     cache). Keys are namespaced `nuxt:ssr:` and given a TTL so they expire on
 *     their own.
 *   - When Redis is absent or unreachable, we fall back to an in-process Map.
 *     On node-server this Map persists for the lifetime of the process, so it
 *     is still an effective per-instance cache (it just doesn't survive a
 *     restart or share across replicas).
 *
 * Only caches on the server. On the client this is a pass-through (the browser
 * has its own caches, and module-scope state in the client bundle would risk
 * leaking between users).
 *
 * Caller picks the key (usually `${endpoint}:${hostname}`) and is responsible
 * for namespacing per host so multi-tenant subdomains don't share data.
 *
 * IMPORTANT: only call this with fetchers that are independent of any user
 * context — e.g. raw $fetch without cookie forwarding. Otherwise one user's
 * response could be cached and served to another. Values must be
 * JSON-serializable (they are stringified for Redis).
 */

interface CacheEntry {
  data: unknown;
  exp: number;
}

/** Per-process fallback cache, used when Redis is not configured/available. */
const _memCache = new Map<string, CacheEntry>();

/** Prefix for every key we write, so frontend SSR keys never collide with the
 * backend's own cache keys in the shared Redis instance. */
const KEY_PREFIX = "nuxt:ssr:";

// Minimal shape of the ioredis client we use. Kept local so this file never
// statically imports ioredis (which must stay out of the client bundle).
interface RedisLike {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, mode: "PX", ttlMs: number): Promise<unknown>;
}

// Lazily-created, server-only Redis singleton. `undefined` = not yet attempted,
// `null` = intentionally disabled (no REDIS_HOST) or failed to construct.
let _redisPromise: Promise<RedisLike | null> | undefined;

function getRedis(): Promise<RedisLike | null> {
  if (_redisPromise) return _redisPromise;

  _redisPromise = (async () => {
    if (!import.meta.server) return null;
    const host = process.env.REDIS_HOST;
    if (!host) return null;

    try {
      // Dynamic import keeps ioredis out of the client bundle — this branch is
      // dead-code-eliminated on the client (import.meta.server === false).
      const { default: Redis } = await import("ioredis");
      const client = new Redis({
        host,
        port: Number(process.env.REDIS_PORT || 6379),
        password: process.env.REDIS_PASSWORD || undefined,
        db: Number(process.env.REDIS_DB || 0),
        // Fail fast instead of blocking SSR when Redis is down.
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
        lazyConnect: false,
      });
      // Swallow connection errors so a Redis blip never crashes the SSR process;
      // callers fall back to the fetcher/mem cache on any failure.
      client.on("error", () => {});
      return client as unknown as RedisLike;
    } catch {
      return null;
    }
  })();

  return _redisPromise;
}

export async function withServerCache<T>(
  key: string,
  ttlMs: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  if (!import.meta.server) return fetcher();

  const redis = await getRedis();
  if (redis) {
    const redisKey = KEY_PREFIX + key;
    try {
      const hit = await redis.get(redisKey);
      if (hit !== null) return JSON.parse(hit) as T;

      const data = await fetcher();
      // Best-effort write; never let a cache write failure surface to the page.
      redis.set(redisKey, JSON.stringify(data), "PX", ttlMs).catch(() => {});
      return data;
    } catch {
      // Any Redis error → fall through to the in-process path below.
    }
  }

  // In-process fallback (no Redis, or Redis errored).
  const entry = _memCache.get(key);
  if (entry && Date.now() < entry.exp) return entry.data as T;
  const data = await fetcher();
  _memCache.set(key, { data, exp: Date.now() + ttlMs });
  return data;
}
