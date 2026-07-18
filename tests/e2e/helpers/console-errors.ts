import type { Page } from '@playwright/test'

/** Collect console.error messages during test execution */
export function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = []
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text())
    }
  })
  return errors
}

/** Collect uncaught page errors (unhandled exceptions) */
export function collectPageErrors(page: Page): Error[] {
  const errors: Error[] = []
  page.on('pageerror', (error) => {
    errors.push(error)
  })
  return errors
}

/** Filter out expected/benign errors */
export function filterExpectedErrors(errors: string[]): string[] {
  return errors.filter(
    (e) =>
      !e.includes('WebSocket') &&
      !e.includes('socket') &&
      !e.includes('net::ERR_') &&
      !e.includes('favicon') &&
      !e.includes('workbox') &&
      !e.includes('sw.js') &&
      !e.includes('401') &&
      !e.includes('Unauthorized') &&
      !e.includes('Failed to load resource'),
  )
}
