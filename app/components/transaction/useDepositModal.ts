/**
 * useDepositModal — state for DepositModal.vue.
 *
 * Extracted from the component so the .vue stays a thin presentation layer.
 * The deposit bank is fixed (static) and no longer fetched from
 * `/banks/accounts` — a single placeholder account is provided directly.
 * Amount entry/quick-amounts live in `useBankPayment`.
 */

export type PaymentType = "BANK" | "E-MONEY" | "PULSA";

export interface IBankAccount {
  id: string;
  account_name: string;
  bank: string;
  code: string;
  account_number: string;
  credit_fee_type: string;
  credit_fee: string;
}

export interface UseDepositModalOptions {
  isOpen: () => boolean;
}

/**
 * Fixed deposit account shown in the modal (no API load).
 *
 * ⚠️ BLOCKER: `id` must be a real `adminBankAccounts` UUID for a deposit to
 * succeed — the backend validates `accountId` as a uuid and looks it up
 * (404 BANK_ACCOUNT_NOT_FOUND otherwise). There is currently no endpoint that
 * lists admin bank accounts, so this is a placeholder. Replace `id` with a
 * seeded account UUID, or add a bank-accounts list endpoint and load from it.
 */
const STATIC_BANK_ACCOUNT: IBankAccount = {
  id: "00000000-0000-0000-0000-000000000000",
  account_name: "MONKEY",
  bank: "BCA",
  code: "014",
  account_number: "1234567890",
  credit_fee_type: "fixed",
  credit_fee: "0",
};

export function useDepositModal(options: UseDepositModalOptions) {
  const paymentType = ref<PaymentType>("BANK");
  const bankAccounts = ref<IBankAccount[]>([STATIC_BANK_ACCOUNT]);

  const historyMethod = computed(() => {
    if (paymentType.value === "E-MONEY") return "emoney";
    if (paymentType.value === "PULSA") return "pulsa";
    return "bank";
  });

  // Reset the payment-type tab back to BANK when the modal closes.
  watch(options.isOpen, (open) => {
    if (!open) {
      paymentType.value = "BANK";
    }
  });

  return {
    paymentType,
    bankAccounts,
    historyMethod,
  };
}
