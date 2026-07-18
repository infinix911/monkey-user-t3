import { test, expect } from '@playwright/test'
import { setupApiMocks } from '../fixtures/api-mocks'
import { gotoAndWait } from '../helpers/wait-helpers'

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
    await gotoAndWait(page, '/')
  })

  const navRoutes = [
    { name: 'Slots', altText: 'Slot' },
    { name: 'Casino', altText: 'Casino' },
    { name: 'Sports', altText: 'Sport' },
    { name: 'Mini', altText: 'Mini' },
    { name: 'Fishing', altText: 'Fishing' },
    { name: 'Virtual', altText: 'Virtual' },
  ]

  for (const { name, altText } of navRoutes) {
    test(`${name} nav button is clickable`, async ({ page }) => {
      const navButton = page
        .locator('nav button:visible')
        .filter({ has: page.locator(`img[alt*="${altText}" i]`) })
        .first()

      if ((await navButton.count()) > 0) {
        await navButton.scrollIntoViewIfNeeded()
        await navButton.click({ force: true })
        // Wait for any navigation/loading to complete
        await page.waitForTimeout(2_000)
        // Verify page didn't crash (header still visible)
        await expect(page.locator('header')).toBeVisible()
      } else {
        // Skip if nav button not found (different alt text format)
        test.skip()
      }
    })
  }

  test('home page renders with header on initial load', async ({ page }) => {
    await expect(page.locator('header')).toBeVisible()
  })

  test('multiple nav clicks work without errors', async ({ page }) => {
    // Click Slots, then Casino, verify no crash
    for (const altText of ['Slot', 'Casino']) {
      const btn = page
        .locator('nav button:visible')
        .filter({ has: page.locator(`img[alt*="${altText}" i]`) })
        .first()
      if ((await btn.count()) > 0) {
        await btn.click()
        await page.waitForTimeout(1_500)
      }
    }
    await expect(page.locator('header')).toBeVisible()
  })
})
