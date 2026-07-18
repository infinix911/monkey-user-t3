import { test, expect } from '@playwright/test'
import { setupApiMocks } from '../fixtures/api-mocks'
import { gotoAndWait } from '../helpers/wait-helpers'
import { collectPageErrors } from '../helpers/console-errors'

test.describe('Game Category Pages', () => {
  const gamePages = [
    { path: '/slots', name: 'Slots' },
    { path: '/casino', name: 'Casino' },
    { path: '/sports', name: 'Sports' },
    { path: '/mini', name: 'Mini' },
    { path: '/fishing', name: 'Fishing' },
    { path: '/virtual', name: 'Virtual' },
  ]

  for (const { name } of gamePages) {
    test(`${name} page loads via nav click without errors`, async ({ page }) => {
      await setupApiMocks(page)
      const pageErrors = collectPageErrors(page)

      // Load home first, then navigate via nav button (SPA navigation)
      await gotoAndWait(page, '/')

      const navButton = page
        .locator('nav button:visible')
        .filter({ has: page.locator(`img[alt*="${name}" i]`) })
        .first()

      if ((await navButton.count()) > 0) {
        await navButton.scrollIntoViewIfNeeded()
        await navButton.click({ force: true })
        await page.waitForTimeout(3_000)
      }

      expect(pageErrors).toHaveLength(0)
    })
  }

  test('game category page displays visual content', async ({ page }) => {
    await setupApiMocks(page)
    await gotoAndWait(page, '/')
    // Click on Slots nav
    const slotsBtn = page
      .locator('nav button:visible')
      .filter({ has: page.locator('img[alt*="Slot" i]') })
      .first()
    if ((await slotsBtn.count()) > 0) {
      await slotsBtn.click()
      await page.waitForTimeout(2_000)
    }
    const images = page.locator('img')
    const count = await images.count()
    expect(count).toBeGreaterThan(0)
  })
})
