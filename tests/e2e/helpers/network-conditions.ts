import type { Page } from '@playwright/test'

/**
 * Network throttling profiles for Chromium via CDP
 * (Network.emulateNetworkConditions). Throughput is bytes/sec, latency is ms.
 * Values mirror the standard Chrome DevTools presets.
 */
export interface NetworkProfile {
  name: string
  downloadThroughput: number
  uploadThroughput: number
  latency: number
  /** Informational soft budget (ms) — exceeding it warns, never fails. */
  softBudgetMs: number
}

export const NETWORK_PROFILES: NetworkProfile[] = [
  {
    name: 'Slow 3G',
    downloadThroughput: Math.floor((500 * 1024) / 8), // ~64 KB/s
    uploadThroughput: Math.floor((500 * 1024) / 8),
    latency: 2000,
    softBudgetMs: 45_000,
  },
  {
    name: 'Fast 3G',
    downloadThroughput: Math.floor((1.6 * 1024 * 1024) / 8), // ~1.6 Mbit
    uploadThroughput: Math.floor((750 * 1024) / 8), // ~750 kbit
    latency: 562,
    softBudgetMs: 20_000,
  },
  {
    name: 'Regular 4G',
    downloadThroughput: Math.floor((4 * 1024 * 1024) / 8), // ~4 Mbit
    uploadThroughput: Math.floor((3 * 1024 * 1024) / 8), // ~3 Mbit
    latency: 150,
    softBudgetMs: 10_000,
  },
]

/**
 * Apply a network throttling profile to a page using a CDP session.
 * Chromium-only. Returns the CDP client so callers may detach if desired.
 */
export async function applyNetworkConditions(page: Page, profile: NetworkProfile) {
  const client = await page.context().newCDPSession(page)
  await client.send('Network.enable')
  await client.send('Network.emulateNetworkConditions', {
    offline: false,
    downloadThroughput: profile.downloadThroughput,
    uploadThroughput: profile.uploadThroughput,
    latency: profile.latency,
  })
  return client
}
