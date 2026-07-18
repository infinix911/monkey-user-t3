/**
 * Transaction backend contracts (monkey-user-api /transactions).
 *
 * Wire shapes are camelCase; the components render snake_case. Validate + map
 * at the fetch points. Amounts stay strings (money precision).
 */

import { z } from "zod";

// --- Wallet transactions: GET /transactions/wallet/:transaction (bare array) ---

export const walletTransactionWireSchema = z.object({
  id: z.string(),
  bankName: z.string(),
  bankAccount: z.string(),
  bankAccountName: z.string(),
  method: z.string(),
  amount: z.string(),
  status: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});
export const walletTransactionsResponseSchema = z.array(
  walletTransactionWireSchema,
);

/** Normalized deposit/withdrawal history row consumed by TransactionHistory. */
export interface WalletTransaction {
  id: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  method: string;
  amount: string;
  status: number;
  created_at: string;
  updated_at: string;
}

export const mapWalletTransaction = (
  w: z.infer<typeof walletTransactionWireSchema>,
): WalletTransaction => ({
  id: w.id,
  bank_name: w.bankName,
  bank_account: w.bankAccount,
  bank_account_name: w.bankAccountName,
  method: w.method,
  amount: w.amount,
  status: w.status,
  created_at: w.createdAt,
  updated_at: w.updatedAt,
});

// --- Activity ledger: GET /transactions/activity/:category ({ data, meta }) ---

export const activityWireSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  type: z.string(),
  transaction: z.string(),
  transactionId: z.string(),
  debit: z.string(),
  credit: z.string(),
  walletAfter: z.string(),
});

export const activityResponseWireSchema = z.object({
  data: z.array(activityWireSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});
export type ActivityResponseWire = z.infer<typeof activityResponseWireSchema>;

/** Normalized activity row consumed by ActivityContent. */
export interface ActivityRow {
  id: number;
  created_at: string;
  type: string;
  transaction: string;
  transaction_id: string;
  debit: string;
  credit: string;
  wallet_after: string;
}

/** Normalized activity response — the { rows, pages, data } shape consumers use. */
export interface ActivityResponse {
  rows: number;
  pages: number;
  data: ActivityRow[];
}

export const mapActivityRow = (
  w: z.infer<typeof activityWireSchema>,
): ActivityRow => ({
  id: w.id,
  created_at: w.createdAt,
  type: w.type,
  transaction: w.transaction,
  transaction_id: w.transactionId,
  debit: w.debit,
  credit: w.credit,
  wallet_after: w.walletAfter,
});

export const mapActivityResponse = (
  w: ActivityResponseWire,
): ActivityResponse => ({
  rows: w.meta.total,
  pages: w.meta.totalPages,
  data: w.data.map(mapActivityRow),
});
