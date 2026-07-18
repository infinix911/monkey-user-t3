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

/** Fixed deposit account shown in the modal (no API load). */
const STATIC_BANK_ACCOUNT: IBankAccount = {
  id: "static-bank",
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
