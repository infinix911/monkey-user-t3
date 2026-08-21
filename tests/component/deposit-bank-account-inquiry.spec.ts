import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const bankPaymentContent = readFileSync(
  resolve(__dirname, "../../app/components/transaction/BankPaymentContent.vue"),
  "utf8",
);
const inquiryMutations = readFileSync(
  resolve(__dirname, "../../app/composables/useInquiryMutations.ts"),
  "utf8",
);
const korean = JSON.parse(
  readFileSync(resolve(__dirname, "../../i18n/locales/ko.json"), "utf8"),
) as { inquiry: Record<string, string> };

describe("deposit bank-account inquiry dialogs", () => {
  it("uses the requested label and a title-only confirmation dialog", () => {
    expect(korean.inquiry.depositAccountRequest).toBe("입금 계좌 문의");
    expect(korean.inquiry.accountRequestConfirmation).toBe("문의하시겠습니까?");
    expect(bankPaymentContent).toContain('t("inquiry.accountRequestConfirmation"),');
    expect(bankPaymentContent).toContain("undefined,");
  });

  it("shows a title-only receipt confirmation", () => {
    expect(korean.inquiry.bankAccountRequestSent).toBe("접수 되었습니다");
    expect(inquiryMutations).toContain(
      'await showSuccessAlert(t("inquiry.bankAccountRequestSent"));',
    );
  });
});
