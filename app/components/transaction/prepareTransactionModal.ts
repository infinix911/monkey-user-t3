/**
 * First-paint prepare step for the Deposit and Withdrawal modals.
 *
 * Run alongside the modal chunk import (layouts/default.vue) so the modal is
 * not shown until its history rows are in the member-records cache
 * (TransactionHistory otherwise fetched on mount and the panel grew when they
 * landed) and the Korean LINE Seed weights it renders are loaded.
 */
import { transactionHistoryQuery } from "~/components/transaction/transactionHistoryQuery";
import { DEPOSIT_HISTORY_METHOD } from "~/components/transaction/useDepositModal";

export function prepareTransactionModal(type: "deposit" | "withdrawal"): Promise<void> {
  const method = type === "deposit" ? DEPOSIT_HISTORY_METHOD : undefined;
  return whenReady([
    useMemberRecordsStore().loadWalletTransactions(transactionHistoryQuery(type, method)),
    loadKoreanFonts(),
  ]);
}
