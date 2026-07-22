import { useRequestURL, useRequestHeaders } from 'nuxt/app'
import { resolveCanonicalAuthority } from '~~/shared/utils/request-security'

function configuredHosts(): string[] {
  try {
    const config = useRuntimeConfig()
    return [
      String((config as { allowedHosts?: string }).allowedHosts ?? ''),
      String(config.public.siteUrl ?? ''),
    ].filter(Boolean)
  } catch {
    return []
  }
}

function serverAuthority(): string | null {
  try {
    const { host } = useRequestHeaders(['host'])
    return resolveCanonicalAuthority(
      host,
      configuredHosts(),
      process.env.NODE_ENV === 'production',
    )?.authority ?? null
  } catch {
    return null
  }
}

export function getHostname(): string {
  if (import.meta.server) {
    const authority = serverAuthority()
    return authority ? new URL(`http://${authority}`).hostname : '_invalid-host'
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
    const authority = serverAuthority()
    const headers: Record<string, string> = {}
    if (authority) headers['x-forwarded-host'] = authority
    if (authority)
      headers['x-forwarded-proto'] = process.env.NODE_ENV === 'production' ? 'https' : useRequestURL().protocol.replace(':', '')
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

function getRequiredServerEnv(name: "NUXT_API_URL" | "NUXT_WS_API_URL"): string {
  const value = process.env[name]?.trim()
  if (!value) throw new Error(`${name} is not configured`)
  return value.replace(/\/$/, "")
}

// Client always talks to its own origin — the Nitro proxy at /api forwards
// to the real backend. Server reads the private NUXT_API_URL process
// environment variable for direct SSR fetches.
export function getApiBase(): string {
  if (import.meta.client) return '/api'
  return getRequiredServerEnv("NUXT_API_URL")
}

// Same shape for WebSockets. Client connects to wss://<frontend-host>; the
// ws-proxy plugin upgrades that to the backend WS server. Server side returns
// the raw NUXT_WS_API_URL (only used by the proxy plugin itself).
export function getWsApiUrl(): string {
  if (import.meta.client) {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws'
    return `${proto}://${window.location.host}`
  }
  return getRequiredServerEnv("NUXT_WS_API_URL")
}
