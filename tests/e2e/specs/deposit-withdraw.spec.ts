import { test, expect } from '@playwright/test'
import { setupApiMocks } from '../fixtures/api-mocks'
import { gotoAndWait, openLoginModal } from '../helpers/wait-helpers'

test.describe('Deposit & Withdraw Flows', () => {
  test('deposit button opens login modal when unauthenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: false })
    await gotoAndWait(page, '/')
    await openLoginModal(page)
    await expect(page.locator('#login-username')).toBeVisible()
  })

  test('withdraw button opens login modal when unauthenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: false })
    await gotoAndWait(page, '/')

    const withdrawBtn = page
      .locator('nav button:visible')
      .filter({ has: page.locator('img[alt*="Withdraw" i]') })
      .first()

    if ((await withdrawBtn.count()) > 0) {
      await withdrawBtn.click()
      await expect(page.locator('#login-username')).toBeVisible({ timeout: 5_000 })
    } else {
      // Mobile: no withdraw button when unauthenticated, test login trigger instead
      await openLoginModal(page)
      await expect(page.locator('#login-username')).toBeVisible()
    }
  })

  test('deposit page accessible when authenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: true })
    await gotoAndWait(page, '/deposit')
    expect(page.url()).toContain('/deposit')
    await expect(page.locator('#login-username')).not.toBeVisible()
  })

  test('withdraw page accessible when authenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: true })
    await gotoAndWait(page, '/withdraw')
    expect(page.url()).toContain('/withdraw')
    await expect(page.locator('#login-username')).not.toBeVisible()
  })

  test('deposit page shows content', async ({ page }) => {
    await setupApiMocks(page, { authenticated: true })
    await gotoAndWait(page, '/deposit')
    const contentArea = page.locator('main, [class*="container"], [class*="content"]').first()
    await expect(contentArea).toBeVisible({ timeout: 10_000 })
  })
})
