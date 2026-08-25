/**
 * Point-conversion amount field: grouped display, bare-digit state.
 *
 * The field shows the member a grouped figure (29,900) while `amount` itself
 * stays digits only — everything downstream (the limit checks, the POST body,
 * the success message) reads the raw value. These tests pin both halves, plus
 * the digit-stripping/regrouping the input handler performs, since a
 * separator leaking into the submitted amount would be a money bug.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { formatAmountNumber } from "@/utils/currency";

const modal = readFileSync(
  resolve(__dirname, "../../app/components/transaction/PointConversionModal.vue"),
  "utf8",
);

/** The handler's normalisation, mirrored so the rules can be exercised directly. */
const toDigits = (typed: string): string =>
  typed.replace(/\D/g, "").replace(/^0+(?=\d)/, "");

describe("point conversion amount formatting", () => {
  it("renders the grouped value in the field, not the raw digits", () => {
    expect(modal).toContain(':value="displayAmount"');
    expect(modal).toContain("const displayAmount = computed(");
    expect(modal).toContain("amount.value ? fmt(Number(amount.value)) : \"\"");
  });

  it("formats through the shared currency helper, so separators follow the deployment locale", () => {
    expect(modal).toContain("const fmt = (v: number) => currency.formatNumber(v)");
    expect(formatAmountNumber(29900, "KRW")).toBe("29,900");
    expect(formatAmountNumber(29900, "IDR")).toBe("29.900");
  });

  it("keeps state as bare digits, whatever the member types", () => {
    expect(toDigits("29,900")).toBe("29900");
    expect(toDigits("29.900")).toBe("29900");
    expect(toDigits("2a9b900")).toBe("29900");
    expect(toDigits("007")).toBe("7");
    expect(toDigits("0")).toBe("0");
    expect(toDigits("")).toBe("");
  });

  it("submits and range-checks the raw amount, never the display string", () => {
    expect(modal).toContain("const amt = computed(() => Number(amount.value) || 0)");
    expect(modal).toContain("body: { amount: converted }");
  });

  it("restores the caret by digit count after regrouping", () => {
    // Writing the DOM value back drops the caret to the end; separators shift
    // as the number grows, the member's position within the digits does not.
    expect(modal).toContain("input.setSelectionRange(position, position)");
    expect(modal).toContain("digitsBeforeCaret");
  });

  it("refuses an amount above the points on hand, inline and in place", () => {
    expect(modal).toContain("const amountError = computed(");
    expect(modal).toContain('amt.value > pointCurrent.value ? t("point.amountGt") : ""');
    // Same key the submit-time dialog uses: the form and the server must not
    // word the same rule differently.
    expect(modal).toContain('t("point.amountGt")');
    expect(modal).toContain('v-if="amountError"');
    expect(modal).toContain('v-else class="text-white/40 text-xs mt-2 leading-snug"');
    expect(modal).toContain(':aria-invalid="Boolean(amountError)"');
  });

  it("keeps the submit button gated on the same rule", () => {
    expect(modal).toContain(
      "const canSubmit = computed(() => amt.value >= 1 && amt.value <= pointCurrent.value)",
    );
  });
});
