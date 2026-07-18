/**
 * Transaction-ledger API types.
 *
 * Consumed by the account transaction-log view (`my-account/TransactionLogs.vue`).
 * These are generic wallet-ledger shapes — not tied to any single game vertical.
 */

export type LedgerStatus = "new" | "failed" | "completed";

export interface ILedgerItem {
  id: number;
  created_at: string;
  transaction: string;
  status: LedgerStatus;
  wallet_after: string;
  amount: string;
}

export interface ILedgerResponse {
  pages: number;
  rows: number;
  data: ILedgerItem[];
}
