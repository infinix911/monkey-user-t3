/**
 * Transaction-ledger API types.
 *
 * Consumed by the account transaction-log view (`my-account/TransactionLogs.vue`).
 * These are generic wallet-ledger shapes — not tied to any single game vertical.
 */

import { z } from "zod";

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

// --- Backend contract: GET /transactions/logs ({ data, meta }, camelCase) ---

/** Wire shape of a wallet-log row (getTransactionLogsSchema.data[]). */
export const logItemWireSchema = z.object({
  id: z.number(),
  createdAt: z.string(),
  transaction: z.string(),
  amount: z.string(),
  walletAfter: z.string(),
  status: z.string(),
});

export const logsResponseWireSchema = z.object({
  data: z.array(logItemWireSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});
export type LogsResponseWire = z.infer<typeof logsResponseWireSchema>;

export const mapLogItem = (w: z.infer<typeof logItemWireSchema>): ILedgerItem => ({
  id: w.id,
  created_at: w.createdAt,
  transaction: w.transaction,
  status: w.status as LedgerStatus,
  wallet_after: w.walletAfter,
  amount: w.amount,
});

/** Normalize the paginated logs response to the `{ pages, rows, data }` shape. */
export const mapLogsResponse = (w: LogsResponseWire): ILedgerResponse => ({
  pages: w.meta.totalPages,
  rows: w.meta.total,
  data: w.data.map(mapLogItem),
});
