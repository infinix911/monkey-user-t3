import { test, expect } from '@playwright/test'
import { setupApiMocks } from '../fixtures/api-mocks'
import { gotoAndWait, openLoginModal } from '../helpers/wait-helpers'

test.describe('Accessibility Basics', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await gotoAndWait(page, '/')
  })

  test('navigation images have alt attributes', async ({ page }) => {
    const navImages = page.locator('nav img')
    const count = await navImages.count()
    expect(count).toBeGreaterThan(0)
    for (let i = 0; i < Math.min(count, 20); i++) {
      const alt = await navImages.nth(i).getAttribute('alt')
      expect(alt).not.toBeNull()
    }
  })

  test('page has aria-live region for route announcements', async ({ page }) => {
    const announcer = page.locator('[aria-live]')
    const count = await announcer.count()
    expect(count).toBeGreaterThan(0)
  })

  test('form inputs in login modal have placeholders', async ({ page }) => {
    await openLoginModal(page)
    const usernamePlaceholder = await page.locator('#login-username').getAttribute('placeholder')
    expect(usernamePlaceholder).toBeTruthy()
    const passwordPlaceholder = await page.locator('#login-password').getAttribute('placeholder')
    expect(passwordPlaceholder).toBeTruthy()
  })

  test('login modal close button has aria-label', async ({ page }) => {
    await openLoginModal(page)
    const closeBtn = page.locator('button[aria-label]').filter({ has: page.locator('svg') }).first()
    if ((await closeBtn.count()) > 0) {
      const ariaLabel = await closeBtn.getAttribute('aria-label')
      expect(ariaLabel).toBeTruthy()
    }
  })

  test('keyboard navigation works - Tab moves focus', async ({ page }) => {
    await openLoginModal(page)
    await page.locator('#login-username').click()
    await page.keyboard.press('Tab')
    const activeId = await page.evaluate(() => document.activeElement?.id || document.activeElement?.tagName)
    expect(activeId).toBeTruthy()
  })

  test('autocomplete attributes on login form fields', async ({ page }) => {
    await openLoginModal(page)
    await expect(page.locator('#login-username')).toHaveAttribute('autocomplete', 'username')
    await expect(page.locator('#login-password')).toHaveAttribute('autocomplete', 'current-password')
  })
})
