/**
 * Browser-facing domain helpers.
 *
 * The generated SPA talks to the API origin directly. Local development uses
 * public runtime config; deployed sites resolve the sibling uapi service from
 * the browser's root domain.
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
  const parts = getHostname().split('.');
  return parts.length > 2 ? parts.slice(1).join('.') : getHostname();
}

/** Build the partner console URL from a deployed hostname. */
export function getPartnerUrl(hostname = getHostname()): string {
  const labels = hostname.split('.');
  const rootDomain = labels.length > 2 ? labels.slice(1).join('.') : hostname;
  return `https://partner.${rootDomain}/`;
}

export function getSiteUrl(): string {
  if (typeof window === 'undefined') return 'http://localhost:3000';
  return window.location.origin;
}

function isLocalDevelopment(): boolean {
  const hostname = getHostname();
  return hostname === 'localhost' || hostname === '127.0.0.1';
}

/** Build the deployed API base URL from the current browser hostname. */
export function getProductionApiBase(hostname: string): string {
  const labels = hostname.split('.');
  const rootDomain = labels.length > 2 ? labels.slice(1).join('.') : hostname;
  return `https://uapi.${rootDomain}/api`;
}

/** Return the browser-facing API base URL. */
export function getApiBase(): string {
  if (!isLocalDevelopment() && typeof window !== 'undefined') {
    return getProductionApiBase(window.location.hostname);
  }
  return configuredApiBase();
}

/** Return the API origin with an HTTP(S)-appropriate WebSocket scheme. */
export function getWsApiUrl(): string {
  const apiUrl = new URL(getApiBase());
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  return apiUrl.origin;
}
