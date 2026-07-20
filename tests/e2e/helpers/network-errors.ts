import type { Page } from "@playwright/test";

export interface FailedRequest {
  url: string;
  status: number;
  method: string;
}

/** Collect failed network requests (4xx/5xx) for E2E assertions. */
export function collectFailedRequests(page: Page): FailedRequest[] {
  const failures: FailedRequest[] = [];
  page.on("response", (response) => {
    if (response.status() >= 400) {
      failures.push({
        url: response.url(),
        status: response.status(),
        method: response.request().method(),
      });
    }
  });
  return failures;
}
