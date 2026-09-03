import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../fixtures/api-mocks";

test.describe("Initial load overlay", () => {
  test("keeps the incomplete homepage covered until the slowest bootstrap read settles", async ({ page }) => {
    await setupApiMocks(page);

    // Register after the shared mocks and fall through to them after a delay.
    // This makes the assertion independent of real API timing.
    await page.route(
      (url) => url.toString().includes("/site/settings"),
      async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fallback();
      },
    );

    await page.goto("/", { waitUntil: "commit" });

    const overlay = page.locator(".initial-load-overlay");
    await expect(overlay).toBeVisible();
    await expect(overlay).toHaveAttribute("role", "status");
    await expect(overlay.locator(".initial-load-label")).not.toBeEmpty();

    await expect(overlay).toBeHidden({ timeout: 10_000 });
    await expect(page.locator("header").first()).toBeVisible();
  });
});
