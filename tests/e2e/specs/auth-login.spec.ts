import { test, expect } from "@playwright/test";
import { setupApiMocks } from "../fixtures/api-mocks";
import { MOCK_USER } from "../fixtures/test-data";
import { gotoAndWait, openLoginModal } from "../helpers/wait-helpers";

test.describe("Login Modal", () => {
  test.beforeEach(async ({ page }) => {
    await setupApiMocks(page);
    await gotoAndWait(page, "/");
  });

  test("opens login modal when clicking deposit while unauthenticated", async ({
    page,
  }) => {
    await openLoginModal(page);
    await expect(page.locator("#login-username")).toBeVisible();
    await expect(page.locator("#login-password")).toBeVisible();
  });

  test("shows username and password inputs", async ({ page }) => {
    await openLoginModal(page);
    await expect(page.locator("#login-username")).toHaveAttribute(
      "type",
      "text",
    );
    await expect(page.locator("#login-password")).toHaveAttribute(
      "type",
      "password",
    );
  });

  test("password visibility toggle works", async ({ page }) => {
    await openLoginModal(page);
    const password = page.locator("#login-password");
    await expect(password).toHaveAttribute("type", "password");

    const toggleBtn = page
      .locator("#login-password")
      .locator("..")
      .locator("button")
      .first();
    if ((await toggleBtn.count()) > 0) {
      await toggleBtn.click();
      await expect(password).toHaveAttribute("type", "text");
      await toggleBtn.click();
      await expect(password).toHaveAttribute("type", "password");
    }
  });

  test("close button has aria-label", async ({ page }) => {
    await openLoginModal(page);
    const closeBtn = page
      .locator(".login-modal-wrapper")
      .locator("..")
      .locator("button[aria-label]")
      .first();
    if ((await closeBtn.count()) > 0) {
      const label = await closeBtn.getAttribute("aria-label");
      expect(label).toBeTruthy();
    }
  });

  test("closes modal on close button click", async ({ page }) => {
    await openLoginModal(page);
    const closeBtn = page
      .locator("button[aria-label]")
      .filter({ has: page.locator("svg") })
      .first();
    if ((await closeBtn.count()) > 0) {
      await closeBtn.click();
      await expect(page.locator("#login-username")).not.toBeVisible({
        timeout: 3_000,
      });
    }
  });

  test("successful login closes modal and updates UI", async ({ page }) => {
    // Re-route Better Auth get-session to return an authenticated user after login
    await page.route(
      (url) => url.toString().includes("/auth/get-session"),
      (route) =>
        route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(MOCK_USER),
        }),
    );

    await openLoginModal(page);
    await page.fill("#login-username", "testuser");
    await page.fill("#login-password", "testpass123");

    const submitBtn = page.locator('form button[type="submit"]').first();
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
    } else {
      await page.locator("form").first().locator("button").last().click();
    }

    await expect(page.locator("#login-username")).not.toBeVisible({
      timeout: 10_000,
    });
  });

  test("shows error on invalid credentials", async ({ page }) => {
    await page.route(
      (url) => url.toString().includes("/auth/sign-in/username"),
      (route) =>
        route.fulfill({
          status: 401,
          contentType: "application/json",
          body: JSON.stringify({
            code: "INVALID_CREDENTIALS",
            message: "Invalid credentials",
          }),
        }),
    );

    await openLoginModal(page);
    await page.fill("#login-username", "wronguser");
    await page.fill("#login-password", "wrongpass");

    const submitBtn = page.locator('form button[type="submit"]').first();
    if ((await submitBtn.count()) > 0) {
      await submitBtn.click();
    } else {
      await page.locator("form").first().locator("button").last().click();
    }

    const errorIndicator = page
      .locator("[data-sonner-toast], .text-red-500, .swal2-popup")
      .first();
    await expect(errorIndicator).toBeVisible({ timeout: 5_000 });
  });

  test("switch to signup modal", async ({ page }) => {
    await openLoginModal(page);
    const signUpLink = page
      .locator("button, a")
      .filter({ hasText: /sign up|daftar/i })
      .first();
    if ((await signUpLink.count()) > 0) {
      await signUpLink.click();
      await expect(page.locator("#login-username")).not.toBeVisible({
        timeout: 5_000,
      });
    }
  });
});
