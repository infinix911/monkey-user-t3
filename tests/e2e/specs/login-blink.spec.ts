import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../fixtures/api-mocks";
import { MOCK_USER } from "../fixtures/test-data";
import { gotoAndWait, openLoginModal } from "../helpers/wait-helpers";

/**
 * Regression coverage for PLAN-LOGIN-RELOAD-BLINK.md.
 *
 * Before the fix, LoginModal.vue called window.location.reload() after a
 * successful login. The reload produced ~4 visible state changes
 * (white flash → anonymous SSR → authenticated swap → notice modal)
 * because SSR on Cloudflare Pages can't see the cookie. The fix
 * collapses these by awaiting verifyUser() + fetchNotice() in the
 * submit handler, so the modal closes straight into the notice.
 *
 * Two assertions guard the regression:
 *  1. No `framenavigated` event fires after submit → no reload.
 *  2. The header's "Login" button is never visible after submit →
 *     no logged-out repaint between auth and notice.
 */

test.describe("Login does not flash logged-out UI before notice", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);

    // Better Auth get-session returns the authenticated user once login has succeeded.
    await page.route(
      (url) => url.toString().includes("/auth/get-session"),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_USER),
        }),
    );

    // /site/notice returns a non-empty Tiptap doc so the notice opens.
    await page.route(
      (url) => url.toString().includes("/site/notice"),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            type: "doc",
            content: [
              {
                type: "paragraph",
                content: [{ type: "text", text: "Test notice" }],
              },
            ],
          }),
        }),
    );

    await gotoAndWait(page, "/");
  });

  test("no full-page reload after successful login", async ({ page }) => {
    await openLoginModal(page);
    await page.fill("#login-username", "testuser");
    await page.fill("#login-password", "testpass123");

    const navs: string[] = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) navs.push(frame.url());
    });

    await page.locator('form button[type="submit"]').first().click();
    await expect(page.locator(".notice-card")).toBeVisible({ timeout: 10_000 });

    // window.location.reload() would fire a navigation to the same URL.
    expect(navs).toEqual([]);
  });

  test("logged-out header never paints between login and notice", async ({
    page,
  }) => {
    await openLoginModal(page);
    await page.fill("#login-username", "testuser");
    await page.fill("#login-password", "testpass123");

    // Poll the login button's visibility from submit until notice opens.
    // Before the fix, a reload + anonymous SSR repaint would let this
    // image flash back into the DOM for a frame or two.
    const loginImgVisible: number[] = [];
    const stop = setInterval(async () => {
      const visible = await page
        .locator('header img[alt*="Login" i]')
        .isVisible()
        .catch(() => false);
      loginImgVisible.push(visible ? 1 : 0);
    }, 50);

    await page.locator('form button[type="submit"]').first().click();
    await expect(page.locator(".notice-card")).toBeVisible({ timeout: 10_000 });
    clearInterval(stop);

    const flashes = loginImgVisible.reduce((a, b) => a + b, 0);
    expect(
      flashes,
      "Login button re-appeared post-submit (logged-out repaint)",
    ).toBe(0);
  });
});
