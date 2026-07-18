import type { Page } from '@playwright/test'

export interface FailedRequest {
  url: string
  status: number
  method: string
}

/** Collect failed network requests (4xx/5xx), excluding expected 401s on /auth/v */
export function collectFailedRequests(page: Page): FailedRequest[] {
  const failures: FailedRequest[] = []
  page.on('response', (response) => {
    if (response.status() >= 400) {
      // Expected: unauthenticated users get 401 on /auth/v
      if (response.url().includes('/auth/v') && response.status() === 401) return
      failures.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      })
    }
  })
  return failures
}
