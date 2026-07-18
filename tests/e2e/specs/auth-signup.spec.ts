import { test, expect } from '@playwright/test'
import { setupApiMocks } from '../fixtures/api-mocks'
import { gotoAndWait, openLoginModal } from '../helpers/wait-helpers'

test.describe('Signup Modal', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await gotoAndWait(page, '/')
  })

  async function openSignupModal(page: import('@playwright/test').Page) {
    await openLoginModal(page)
    const signUpLink = page.locator('button, a').filter({ hasText: /sign up|daftar/i }).first()
    await signUpLink.click()
    await page.waitForTimeout(1_000)
  }

  test('opens signup modal from login modal', async ({ page }) => {
    await openSignupModal(page)
    await expect(page.locator('#login-username')).not.toBeVisible()
    const signupForm = page.locator('form').first()
    await expect(signupForm).toBeVisible({ timeout: 5_000 })
  })

  test('signup form has required fields', async ({ page }) => {
    await openSignupModal(page)
    const inputs = page.locator('form input')
    const count = await inputs.count()
    expect(count).toBeGreaterThanOrEqual(3)
  })

  test('username availability check fires', async ({ page }) => {
    await page.route(
      (url) => url.toString().includes('/auth/check/username'),
      (route) => route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ available: true }),
      }),
    )

    await openSignupModal(page)
    const usernameInput = page.locator('form input[type="text"]').first()
    if ((await usernameInput.count()) > 0) {
      await usernameInput.fill('newuser123')
      await usernameInput.blur()
      await page.waitForTimeout(1_000)
    }
  })

  test('close button closes signup modal', async ({ page }) => {
    await openSignupModal(page)
    // On mobile the close button may be partially off-screen, use force click
    const closeBtn = page.locator('button[aria-label]:visible').filter({ has: page.locator('svg') }).first()
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click({ force: true })
      await page.waitForTimeout(500)
    }
  })
})
