/**
 * useDepositModal — state for DepositModal.vue.
 *
 * Extracted from the component so the .vue stays a thin presentation layer.
 * The deposit bank is fixed (static) and no longer fetched from
 * `/banks/accounts` — a single placeholder account is provided directly.
 * Amount entry/quick-amounts live in `useBankPayment`.
 */

export interface IBankAccount {
  id: string;
  account_name: string;
  bank: string;
  code: string;
  account_number: string;
  credit_fee_type: string;
  credit_fee: string;
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

export function useDepositModal() {
  const bankAccounts = ref<IBankAccount[]>([STATIC_BANK_ACCOUNT]);

  // Bank transfer is the only deposit method — the E-WALLET and PULSA tabs were
  // removed, so the history filter is fixed rather than derived from a tab.
  const historyMethod = "bank";

  return {
    bankAccounts,
    historyMethod,
  };
}
