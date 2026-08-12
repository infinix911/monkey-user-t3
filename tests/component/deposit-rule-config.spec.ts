/**
 * Deposit-rule site-config contract.
 *
 * The rule is authored in the admin CMS and travels to this app inside the
 * site-config document at `content.depositRule` — there is no dedicated
 * endpoint. `useSiteConfig()` deep-merges the CMS payload onto
 * `getDefaultThemeConfig()` and SILENTLY DROPS paths the typed default does not
 * declare, so if this group is ever removed or renamed here the published rule
 * simply stops appearing, with no error in either repo.
 *
 * These tests pin that contract, plus the empty-by-default behaviour the
 * deposit modal relies on to keep its card unchanged where no rule is set.
 *
 * The admin half is asserted in monkey-admin's `CmsDepositRulePage.spec.ts`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { getDefaultThemeConfig } from "@/composables/useDefaultThemeConfig";

const bankPaymentContent = readFileSync(
  resolve(__dirname, "../../app/components/transaction/BankPaymentContent.vue"),
  "utf8",
);

describe("deposit rule site-config contract", () => {
  it("declares content.depositRule in the bundled default", () => {
    const config = getDefaultThemeConfig();
    expect(config.content).toBeDefined();
    expect(config.content.depositRule).toBe("");
  });

  it("keeps the path spelled exactly as the admin writes it", () => {
    // The admin saves the theme document with `content.depositRule` overlaid.
    // Any rename here must be made in monkey-admin's theme-schema too.
    const config = getDefaultThemeConfig() as unknown as Record<
      string,
      Record<string, unknown>
    >;
    expect(Object.keys(config.content!)).toContain("depositRule");
  });

  it("renders the rule through the sanitizing rich-content helper", () => {
    // Never interpolate the CMS body raw: it is untrusted HTML.
    expect(bankPaymentContent).toContain("renderRichContent");
    expect(bankPaymentContent).toContain("siteConfig.content?.depositRule");
  });

  it("renders nothing when no rule is published", () => {
    // The card must keep its existing shape on deployments that leave the
    // field empty — hence the v-if rather than an always-present block.
    expect(bankPaymentContent).toContain('v-if="depositRuleHtml"');
  });
});
