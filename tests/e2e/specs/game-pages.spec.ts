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

  test('lobby games append one page at a time while images stay lazy', async ({ page }) => {
    // Keep the sentinel outside its 400px prefetch margin until the test
    // deliberately scrolls to it.
    await page.setViewportSize({ width: 1280, height: 400 })
    await setupApiMocks(page)

    const requestedPages: number[] = []
    const image = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='
    const games = Array.from({ length: 30 }, (_, index) => ({
      id: `game-${index + 1}`,
      lobby: 'Test Provider',
      lobbyId: 'lobby1',
      gameType: 'SLOT',
      gameNameEn: `Test Game ${index + 1}`,
      gameNameKo: null,
      gameImg: image,
      sort: index + 1,
      isNew: false,
    }))

    // Registered after the shared mocks so this route handles the catalogue
    // calls for this scenario and can model the real paginated envelope.
    await page.route(
      (url) => url.pathname === '/api/games' || url.pathname === '/api/games/lobbies',
      async (route) => {
        const url = new URL(route.request().url())
        if (url.pathname.endsWith('/games/lobbies')) {
          return route.fulfill({
            contentType: 'application/json',
            body: JSON.stringify([
              {
                id: 'lobby1',
                gameProvider: 'Test Provider',
                gameType: 'SLOT',
                gameName: 'Test Provider',
                hasSubGame: true,
                sort: 1,
                isActive: true,
              },
            ]),
          })
        }

        const requestedPage = Number(url.searchParams.get('page') ?? '1')
        const limit = Number(url.searchParams.get('limit') ?? '24')
        requestedPages.push(requestedPage)
        const start = (requestedPage - 1) * limit
        return route.fulfill({
          contentType: 'application/json',
          body: JSON.stringify({
            data: games.slice(start, start + limit),
            meta: {
              total: games.length,
              page: requestedPage,
              limit,
              totalPages: Math.ceil(games.length / limit),
            },
          }),
        })
      },
    )

    await gotoAndWait(page, '/lobbies/lobby1/games?page=7')

    const cards = page.locator('#provider-games .grid > div')
    await expect(cards).toHaveCount(24)
    await expect(cards.first().locator('img')).toHaveAttribute('loading', 'lazy')
    await expect(cards.first().locator('img')).toHaveAttribute('decoding', 'async')
    await expect(page).not.toHaveURL(/(?:\?|&)page=/)

    await page.getByTestId('lobby-games-sentinel').scrollIntoViewIfNeeded()
    await expect(cards).toHaveCount(30)
    expect(requestedPages.filter((value) => value === 1)).toHaveLength(1)
    expect(requestedPages.filter((value) => value === 2)).toHaveLength(1)

    await page.waitForTimeout(250)
    expect(requestedPages).not.toContain(3)
  })
})
