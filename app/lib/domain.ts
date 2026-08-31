/**
 * Browser-facing domain helpers.
 *
 * The generated SPA talks to the API origin directly. Keep the API origin in
 * public runtime config so every browser transport uses the same explicit
 * target instead of relying on a removed Nitro `/api` or `/ws` proxy.
 */

type PublicRuntimeConfig = { public?: { apiBase?: unknown } };

function normalizeApiBase(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw new Error('NUXT_PUBLIC_API_BASE is not configured');
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error('NUXT_PUBLIC_API_BASE must be an absolute HTTP(S) URL');
  }

  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    throw new Error('NUXT_PUBLIC_API_BASE must use HTTP or HTTPS');
  }
  if (url.username || url.password || url.search || url.hash) {
    throw new Error(
      'NUXT_PUBLIC_API_BASE must not include credentials, query, or fragment',
    );
  }

  return url.toString().replace(/\/$/, '');
}

function configuredApiBase(): string {
  try {
    const config = useRuntimeConfig() as PublicRuntimeConfig;
    return normalizeApiBase(config.public?.apiBase);
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('NUXT_PUBLIC_API_BASE is not configured');
  }
}

export function getHostname(): string {
  if (typeof window === 'undefined') return 'localhost';
  return window.location.hostname;
}

export function getRootDomain(): string {
  const parts = getHostname().split('.').reverse();
  return parts.slice(0, 2).reverse().join('.');
}

export function getSiteUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  return window.location.origin;
}

/** Return the validated, absolute browser-facing API base URL. */
export function getApiBase(): string {
  return configuredApiBase();
}

/** Return the API origin with an HTTP(S)-appropriate WebSocket scheme. */
export function getWsApiUrl(): string {
  const apiUrl = new URL(getApiBase());
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return apiUrl.origin;
}
