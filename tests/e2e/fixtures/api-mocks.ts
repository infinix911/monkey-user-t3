/**
 * Central API mock setup for all E2E tests.
 *
 * Uses Playwright route interception with URL function matching
 * (glob patterns don't reliably match cross-origin requests).
 */
import type { Page } from '@playwright/test'
import { MOCK_USER, MOCK_GAMES, MOCK_LOBBIES, MOCK_BANK_ACCOUNTS } from './test-data'
import { MOCK_SITE_CONFIG } from './site-config.fixture'

export interface MockOptions {
  /** Whether the user is authenticated (default: false) */
  authenticated?: boolean
  /** Endpoints that should return 500 (e.g., ['games', 'site-config']) */
  failEndpoints?: string[]
  /** Custom games data override */
  games?: unknown[]
  /** Custom site config override */
  siteConfig?: unknown
}

function json(data: unknown, status = 200) {
  return {
    status,
    contentType: 'application/json',
    body: JSON.stringify(data),
  }
}

export async function setupApiMocks(page: Page, options: MockOptions = {}) {
  const { authenticated = false, failEndpoints = [] } = options

  // Single route handler for ALL non-localhost requests.
  // Glob patterns don't reliably match cross-origin URLs, so we use a URL function.
  await page.route(
    (url) => !url.toString().startsWith('http://localhost:3000'),
    (route) => {
      const url = route.request().url()
      const method = route.request().method()

      // --- Site config (CRITICAL: app renders nothing without this) ---
      if (url.includes('site/config/userpage')) {
        if (failEndpoints.includes('site-config')) {
          return route.fulfill(json({ message: 'Internal Server Error' }, 500))
        }
        return route.fulfill(json(options.siteConfig ?? MOCK_SITE_CONFIG))
      }

      // --- Auth verification ---
      if (url.includes('/auth/v') && !url.includes('/auth/verify')) {
        if (authenticated) {
          return route.fulfill(json(MOCK_USER))
        }
        return route.fulfill(json({ message: 'Unauthorized' }, 401))
      }

      // --- Login ---
      if (url.includes('/auth/login') && method === 'POST') {
        return route.fulfill(json({ message: 'OK' }))
      }

      // --- Logout ---
      if (url.includes('/auth/logout')) {
        return route.fulfill(json({ message: 'OK' }))
      }

      // --- Register ---
      if (url.includes('/auth/register') && method === 'POST') {
        return route.fulfill(json({ message: 'OK' }))
      }

      // --- Username check ---
      if (url.includes('/auth/check/username')) {
        return route.fulfill(json({ available: true }))
      }

      // --- Referral check ---
      if (url.includes('/auth/check/referral')) {
        return route.fulfill(json({ valid: true }))
      }

      // --- Games ---
      if (url.includes('/games')) {
        if (failEndpoints.includes('games')) {
          return route.fulfill(json({ message: 'Server Error' }, 500))
        }
        if (url.includes('/lobbies')) {
          return route.fulfill(json({ data: MOCK_LOBBIES }))
        }
        return route.fulfill(json({ data: options.games ?? MOCK_GAMES }))
      }

      // --- Top stats ---
      if (url.includes('/site/top/')) {
        return route.fulfill(json({ data: [] }))
      }

      // --- Banners ---
      if (url.includes('/site/banner')) {
        return route.fulfill(json({ data: [] }))
      }

      // --- Site settings ---
      if (url.includes('/site/setting')) {
        return route.fulfill(json({ data: {} }))
      }

      // --- Site banks ---
      if (url.includes('/site/bank')) {
        return route.fulfill(json({ data: MOCK_BANK_ACCOUNTS }))
      }

      // --- Promotions ---
      if (url.includes('/promotion')) {
        return route.fulfill(json({ data: [] }))
      }


      // --- Inquiries ---
      if (url.includes('/inquiry')) {
        return route.fulfill(json({ data: [] }))
      }

      // --- Transactions ---
      if (url.includes('/transaction')) {
        return route.fulfill(json({ data: [] }))
      }

      // --- Notifications (component expects Array, not { data: [] }) ---
      if (url.includes('/notification')) {
        return route.fulfill(json([]))
      }

      // --- Member endpoints ---
      if (url.includes('/member')) {
        return route.fulfill(json({ data: [] }))
      }

      // --- WebSocket / socket.io ---
      if (url.includes('socket')) {
        return route.abort()
      }

      // --- Catch-all: return empty success ---
      return route.fulfill(json({ data: null }))
    },
  )
}
