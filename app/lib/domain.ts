import { useRequestURL, useRequestHeaders } from 'nuxt/app'

export function getHostname(): string {
  if (import.meta.server) {
    try {
      return useRequestURL().hostname
    } catch {
      return 'localhost'
    }
  }
  if (typeof window === 'undefined') return 'localhost'
  return window.location.hostname
}

/**
 * Server-only headers that carry the visitor's host to the backend so a
 * multi-tenant backend resolves the right tenant on DIRECT SSR fetches. Those
 * bypass the Nitro proxy (server/routes/api/[...path].ts) that normally sets
 * `x-forwarded-host`, so without this every SSR render gets the backend's
 * default tenant config/data. Empty on the client (same-origin → proxy).
 *
 * Call it in the request/setup context (synchronously, before any `await`) —
 * useRequestHeaders needs the request context, which is lost past an await.
 */
export function forwardHostHeaders(): Record<string, string> {
  if (!import.meta.server) return {}
  try {
    const fwd = useRequestHeaders(['host', 'x-forwarded-host', 'x-forwarded-proto'])
    const headers: Record<string, string> = {}
    const host = fwd['x-forwarded-host'] || fwd.host
    if (host) headers['x-forwarded-host'] = host
    if (fwd['x-forwarded-proto']) headers['x-forwarded-proto'] = fwd['x-forwarded-proto']
    return headers
  } catch {
    return {}
  }
}

export function getRootDomain(): string {
  const hostname = getHostname()
  const parts = hostname.split('.').reverse()
  return parts.slice(0, 2).reverse().join('.')
}

export function getSiteUrl(): string {
  if (import.meta.server) {
    try {
      return useRequestURL().origin
    } catch {
      return 'http://localhost:3000'
    }
  }
  if (typeof window === 'undefined') return 'http://localhost:3000'
  return window.location.origin
}

function getRequiredServerEnv(name: "API_HOST_URL" | "WEBSOCKET_HOST_URL"): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value.replace(/\/$/, "")
}

// Client always talks to its own origin — the Nitro proxy at /api forwards
// to the real backend. Server reads the private API_HOST_URL process
// environment variable for direct SSR fetches.
export function getApiBase(): string {
  if (import.meta.client) return '/api'
  return getRequiredServerEnv("API_HOST_URL")
}

// Same shape for WebSockets. Client connects to wss://<frontend-host>; the
// ws-proxy plugin upgrades that to the backend WS server. Server side returns
// the raw WEBSOCKET_HOST_URL (only used by the proxy plugin itself).
export function getWsApiUrl(): string {
  if (import.meta.client) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}`
  }
  return getRequiredServerEnv("WEBSOCKET_HOST_URL")
}
