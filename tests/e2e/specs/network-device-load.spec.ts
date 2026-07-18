import { test, expect, devices, type BrowserContext } from '@playwright/test'
import { NETWORK_PROFILES, applyNetworkConditions } from '../helpers/network-conditions'
import {
  collectConsoleErrors,
  collectPageErrors,
  filterExpectedErrors,
} from '../helpers/console-errors'

/**
 * Resilience smoke test: verify the production homepage still renders across a
 * matrix of low-bandwidth network profiles and device form factors.
 *
 * Hard gate: the page must render (header visible) with no fatal JS errors.
 * Soft signal: load durations are captured per profile for visibility but do
 * NOT fail the test (live prod conditions vary).
 *
 * Targets prod directly via an absolute URL (config baseURL is localhost).
 * Override with PERF_BASE_URL to point at another environment.
 */
const PERF_BASE_URL =
  process.env.PERF_BASE_URL ?? 'https://idr-demo1.jaeisol.com'

const DEVICE_NAMES = ['Desktop Chrome', 'iPhone 13', 'Pixel 7'] as const

test.describe.configure({ mode: 'serial' })

test.describe('Network + device homepage load (prod)', () => {
  for (const deviceName of DEVICE_NAMES) {
    for (const profile of NETWORK_PROFILES) {
      test(`${deviceName} on ${profile.name} renders homepage`, async ({
        browser,
      }, testInfo) => {
        // Slow profiles need headroom over the 30s default.
        test.setTimeout(120_000)

        let context: BrowserContext | undefined
        try {
          context = await browser.newContext({ ...devices[deviceName] })
          const page = await context.newPage()

          const consoleErrors = collectConsoleErrors(page)
          const pageErrors = collectPageErrors(page)

          await applyNetworkConditions(page, profile)

          const t0 = Date.now()
          await page.goto(PERF_BASE_URL, { waitUntil: 'commit' })

          // Must-render: header is the app-ready signal (see wait-helpers.ts).
          await expect(page.locator('header').first()).toBeVisible({
            timeout: 90_000,
          })

          const loadMs = Date.now() - t0

          // Sanity: app actually painted content, not just the shell.
          expect(await page.locator('img').count()).toBeGreaterThan(0)
          expect(await page.locator('nav').count()).toBeGreaterThan(0)

          // Soft budget — informational only.
          const navTiming = await page.evaluate(() => {
            const [nav] = performance.getEntriesByType(
              'navigation',
            ) as PerformanceNavigationTiming[]
            if (!nav) return null
            return {
              domContentLoaded: Math.round(nav.domContentLoadedEventEnd),
              loadEvent: Math.round(nav.loadEventEnd),
              responseEnd: Math.round(nav.responseEnd),
            }
          })

          const metrics = {
            device: deviceName,
            profile: profile.name,
            loadMs,
            softBudgetMs: profile.softBudgetMs,
            withinBudget: loadMs <= profile.softBudgetMs,
            navTiming,
          }
          await testInfo.attach('load-metrics', {
            body: JSON.stringify(metrics, null, 2),
            contentType: 'application/json',
          })
          console.log(`[load] ${deviceName} / ${profile.name}: ${loadMs}ms`)
          if (loadMs > profile.softBudgetMs) {
            console.warn(
              `[load] ${deviceName} / ${profile.name} exceeded soft budget ` +
                `(${loadMs}ms > ${profile.softBudgetMs}ms)`,
            )
          }

          // Hard gate: no fatal errors.
          expect(pageErrors).toHaveLength(0)
          expect(filterExpectedErrors(consoleErrors)).toHaveLength(0)
        } finally {
          await context?.close()
        }
      })
    }
  }
})
