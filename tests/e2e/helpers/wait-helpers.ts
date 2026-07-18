import type { Page } from '@playwright/test'

/**
 * Wait for the SPA to finish initial boot.
 * Uses 'commit' waitUntil to avoid blocking on pending requests,
 * then waits for the app content to render.
 */
export async function waitForAppReady(page: Page, timeout = 30_000) {
  // Wait for header to appear (rendered by default layout after siteConfig loads)
  await page.locator('header').first().waitFor({ state: 'visible', timeout })
}

/**
 * Navigate to a page and wait for the SPA to be ready.
 * Uses 'commit' to avoid blocking on external requests.
 */
export async function gotoAndWait(page: Page, path: string, timeout = 30_000) {
  await page.goto(path, { waitUntil: 'commit' })
  await waitForAppReady(page, timeout)
}

/**
 * Wait for loading indicators to disappear after a page navigation.
 */
export async function waitForContentLoaded(page: Page, timeout = 10_000) {
  const spinner = page.locator('.animate-spin').first()
  if (await spinner.isVisible().catch(() => false)) {
    await spinner.waitFor({ state: 'hidden', timeout }).catch(() => {})
  }
}

/**
 * Find a visible deposit button (works on both desktop and mobile viewports).
 * Desktop: nav button with deposit img in top navbar
 * Mobile: button with "DEPOSIT" text in bottom nav
 */
export function getDepositButton(page: Page) {
  return page
    .locator('nav button:visible')
    .filter({ has: page.locator('img[alt*="Deposit" i]') })
    .first()
}

/**
 * Open the login modal by clicking the best available trigger.
 * Desktop unauthenticated: deposit button in navbar
 * Mobile unauthenticated: login button in header
 * Mobile authenticated: deposit button in bottom nav
 */
export async function openLoginModal(page: Page) {
  // Try desktop deposit button first
  const depositBtn = getDepositButton(page)
  if ((await depositBtn.count()) > 0) {
    await depositBtn.click()
  } else {
    // Mobile: click login button in header
    const loginBtn = page
      .locator('button:visible, a:visible')
      .filter({ has: page.locator('img[alt*="Login" i]') })
      .first()
    if ((await loginBtn.count()) > 0) {
      await loginBtn.click()
    } else {
      // Last fallback: any visible button with login text
      await page.locator('button:visible').filter({ hasText: /login|masuk/i }).first().click()
    }
  }

  await page.locator('#login-username').waitFor({ state: 'visible', timeout: 5_000 })
}
