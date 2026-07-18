import { test, expect } from '@playwright/test'
import { setupApiMocks } from '../fixtures/api-mocks'
import { gotoAndWait } from '../helpers/wait-helpers'
import { collectConsoleErrors, collectPageErrors, filterExpectedErrors } from '../helpers/console-errors'
import { collectFailedRequests } from '../helpers/network-errors'

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page)
  })

  test('loads successfully and displays content', async ({ page }) => {
    await gotoAndWait(page, '/')
    expect(page.url()).toMatch(/\/$/)
  })

  test('displays navbar with navigation buttons', async ({ page }) => {
    await gotoAndWait(page, '/')
    const navButtons = page.locator('nav button')
    const count = await navButtons.count()
    expect(count).toBeGreaterThanOrEqual(8)
  })

  test('displays images when data loads', async ({ page }) => {
    await gotoAndWait(page, '/')
    const images = page.locator('img')
    const count = await images.count()
    expect(count).toBeGreaterThan(0)
  })

  test('no unexpected console errors', async ({ page }) => {
    const consoleErrors = collectConsoleErrors(page)
    const pageErrors = collectPageErrors(page)
    await gotoAndWait(page, '/')
    await page.waitForTimeout(2000)
    const unexpected = filterExpectedErrors(consoleErrors)
    expect(unexpected).toHaveLength(0)
    expect(pageErrors).toHaveLength(0)
  })

  test('no failed network requests', async ({ page }) => {
    const failures = collectFailedRequests(page)
    await gotoAndWait(page, '/')
    await page.waitForTimeout(2000)
    expect(failures).toHaveLength(0)
  })

  test('shows error state with retry on API failure', async ({ page }) => {
    await setupApiMocks(page, { failEndpoints: ['games'] })
    await gotoAndWait(page, '/')
    const retryButton = page.locator('button').filter({ hasText: /retry|coba/i })
    await expect(retryButton.first()).toBeVisible({ timeout: 10_000 })
  })
})
