/**
 * Voucher Popup E2E Tests
 *
 * Verifies that the VoucherPopupModal appears ONLY when the user selects a
 * voucher with enable_popup=true (never automatically on modal open), that
 * "Accept" applies the voucher, and that "Do Not Accept" leaves the voucher in
 * the dropdown but returns the selection to the default (unselected).
 */
import { test, expect, type Page } from "@playwright/test";
import { MOCK_USER, MOCK_BANK_ACCOUNTS } from "../fixtures/test-data";

const MOCK_VOUCHER_WITH_POPUP = {
  issue_id: "aabbccdd-0000-0000-0000-000000000001",
  voucher_id: "vvvvvvvv-0000-0000-0000-000000000001",
  voucher: "Test Popup Voucher",
  description: "Voucher with popup terms",
  valid_to: "2027-12-31 23:59:59",
  enable_popup: true,
  popup_text: "By selecting this voucher you agree to the promotional terms.",
  tiers: [{ min_value: 50000, reward_type: "PERCENT", reward_value: 10, cap: 200000 }],
};

const MOCK_VOUCHER_NO_POPUP = {
  issue_id: "aabbccdd-0000-0000-0000-000000000002",
  voucher_id: "vvvvvvvv-0000-0000-0000-000000000002",
  voucher: "Regular Voucher",
  description: "Voucher without popup",
  valid_to: "2027-12-31 23:59:59",
  enable_popup: false,
  popup_text: null,
  tiers: [{ min_value: 50000, reward_type: "PERCENT", reward_value: 5, cap: 100000 }],
};

function json(data: unknown, status = 200) {
  return {
    status,
    contentType: "application/json",
    body: JSON.stringify(data),
  };
}

/**
 * Open the deposit modal by writing to the Pinia ui store directly.
 * Requires Vue to be hydrated first (call waitForVue before this).
 */
async function openDepositModal(page: Page) {
  await page.evaluate(() => {
    const el = document.getElementById("__nuxt");
    const app = el && (el as any).__vue_app__;
    const pinia = app?.config?.globalProperties?.$pinia;
    const uiState = pinia?.state?.value?.ui;
    if (uiState) uiState.showDepositModal = true;
  });
}

/** Wait for Vue to hydrate — __vue_app__ is set on #__nuxt after mount. */
async function waitForVue(page: Page) {
  await page.waitForFunction(
    () => !!(document.getElementById("__nuxt") && (document.getElementById("__nuxt") as any).__vue_app__),
    { timeout: 15_000 },
  );
}

test.describe("Voucher Popup in Deposit Modal", () => {
  test.beforeEach(async ({ page }) => {
    // All localhost /api/* proxy requests — use hostname+pathname to avoid
    // accidentally matching /@vue/devtools-api JS module paths.
    await page.route(
      (url) => url.hostname === "localhost" && url.pathname.startsWith("/api/"),
      async (route) => {
        const path = route.request().url().replace(/^https?:\/\/[^/]+/, "");

        if (path.startsWith("/api/auth/v")) {
          return route.fulfill(json(MOCK_USER));
        }
        if (path.startsWith("/api/promotions/vouchers")) {
          return route.fulfill(
            json([MOCK_VOUCHER_WITH_POPUP, MOCK_VOUCHER_NO_POPUP]),
          );
        }
        if (
          path.startsWith("/api/site/bank") ||
          path.startsWith("/api/payment/method")
        ) {
          return route.fulfill(json(MOCK_BANK_ACCOUNTS));
        }
        // Everything else — return empty array so the app doesn't error
        return route.fulfill(json([]));
      },
    );

    await page.goto("/", { waitUntil: "commit" });
    await page.waitForSelector("header", { timeout: 30_000 });
    await waitForVue(page);
    // Give client plugins (session-verify) a moment to authenticate
    await page.waitForTimeout(500);
    await openDepositModal(page);
  });

  test("popup does NOT auto-appear on modal open", async ({ page }) => {
    // Wait for the voucher dropdown to be populated, proving vouchers loaded.
    const voucherSelect = page.locator("select").first();
    await expect(voucherSelect).toBeVisible({ timeout: 10_000 });
    await expect(
      voucherSelect.locator(
        `option[value="${MOCK_VOUCHER_WITH_POPUP.issue_id}"]`,
      ),
    ).toHaveCount(1);

    // Even though a popup voucher is available, the popup must stay closed
    // until the user selects it.
    await expect(page.locator('[class*="z-[200]"]')).not.toBeVisible({
      timeout: 2_000,
    });
  });

  test("popup appears only after selecting a voucher with enable_popup=true", async ({
    page,
  }) => {
    const voucherSelect = page.locator("select").first();
    await expect(voucherSelect).toBeVisible({ timeout: 10_000 });

    await voucherSelect.selectOption(MOCK_VOUCHER_WITH_POPUP.issue_id);

    const popup = page.locator('[class*="z-[200]"]');
    await expect(popup).toBeVisible({ timeout: 5_000 });
    await expect(
      popup.locator(`text=${MOCK_VOUCHER_WITH_POPUP.popup_text}`),
    ).toBeVisible();

    // Two action buttons: agree (first) and disagree (last)
    await expect(popup.locator("button").first()).toBeVisible();
    await expect(popup.locator("button").last()).toBeVisible();
  });

  test("accepting popup applies the voucher and closes the popup", async ({
    page,
  }) => {
    const voucherSelect = page.locator("select").first();
    await expect(voucherSelect).toBeVisible({ timeout: 10_000 });
    await voucherSelect.selectOption(MOCK_VOUCHER_WITH_POPUP.issue_id);

    const popup = page.locator('[class*="z-[200]"]');
    await expect(popup).toBeVisible({ timeout: 5_000 });

    await popup.locator("button").first().click();
    await expect(popup).not.toBeVisible({ timeout: 3_000 });

    // The voucher is now the selected option.
    await expect(voucherSelect).toHaveValue(MOCK_VOUCHER_WITH_POPUP.issue_id);
  });

  test("declining popup keeps the voucher in the dropdown but deselects it", async ({
    page,
  }) => {
    const voucherSelect = page.locator("select").first();
    await expect(voucherSelect).toBeVisible({ timeout: 10_000 });
    await voucherSelect.selectOption(MOCK_VOUCHER_WITH_POPUP.issue_id);

    const popup = page.locator('[class*="z-[200]"]');
    await expect(popup).toBeVisible({ timeout: 5_000 });

    // Click the disagree (last) button
    await popup.locator("button").last().click();
    await expect(popup).not.toBeVisible({ timeout: 3_000 });

    // Voucher still present in the dropdown (no longer removed)...
    await expect(
      voucherSelect.locator(
        `option[value="${MOCK_VOUCHER_WITH_POPUP.issue_id}"]`,
      ),
    ).toHaveCount(1);
    // ...but the selection is back to the default (unselected).
    await expect(voucherSelect).toHaveValue("");
  });

  test("selecting a non-popup voucher does not open the popup", async ({
    page,
  }) => {
    const voucherSelect = page.locator("select").first();
    await expect(voucherSelect).toBeVisible({ timeout: 10_000 });

    await voucherSelect.selectOption(MOCK_VOUCHER_NO_POPUP.issue_id);

    await expect(page.locator('[class*="z-[200]"]')).not.toBeVisible({
      timeout: 2_000,
    });
    await expect(voucherSelect).toHaveValue(MOCK_VOUCHER_NO_POPUP.issue_id);
  });
});
