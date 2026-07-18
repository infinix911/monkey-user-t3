import { test, expect } from '@playwright/test'
import { setupApiMocks } from '../fixtures/api-mocks'
import { gotoAndWait } from '../helpers/wait-helpers'

test.describe('Protected Routes - Unauthenticated', () => {
  const protectedRoutes = [
    '/deposit',
    '/withdraw',
    '/my-account',
    '/notifications',
  ]

  for (const route of protectedRoutes) {
    test(`redirects from ${route} to / when unauthenticated`, async ({ page }) => {
      await setupApiMocks(page, { authenticated: false })
      await page.goto(route, { waitUntil: 'commit' })
      await page.waitForURL('**/', { timeout: 30_000 })
      expect(page.url()).toMatch(/\/$/)
    })
  }

  test('redirects from dynamic game route to / when unauthenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: false })
    await page.goto('/slot/GAME_123', { waitUntil: 'commit' })
    await page.waitForURL('**/', { timeout: 30_000 })
    expect(page.url()).toMatch(/\/$/)
  })
})

test.describe('Protected Routes - Authenticated', () => {
  test('allows access to /deposit when authenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: true })
    await gotoAndWait(page, '/deposit')
    expect(page.url()).toContain('/deposit')
  })

  test('allows access to /withdraw when authenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: true })
    await gotoAndWait(page, '/withdraw')
    expect(page.url()).toContain('/withdraw')
  })

  test('allows access to /my-account when authenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: true })
    await gotoAndWait(page, '/my-account')
    expect(page.url()).toContain('/my-account')
  })

  test('allows access to /notifications when authenticated', async ({ page }) => {
    await setupApiMocks(page, { authenticated: true })
    await gotoAndWait(page, '/notifications')
    expect(page.url()).toContain('/notifications')
  })
})
