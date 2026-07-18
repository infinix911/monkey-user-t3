/**
 * Points backend contracts (monkey-user-api /points).
 *
 * - POST /points/exchange  body { amount: number } -> { message }
 * - GET  /points/exchanges query { startDate, endDate, page, limit }
 *        -> { data: [...], meta } (point-to-wallet exchange history)
 */

import { z } from "zod";

/** Wire shape of a point-exchange history row (getPointExchangesSchema.data[]). */
export const pointExchangeWireSchema = z.object({
  id: z.string(),
  amount: z.string(),
  pointAfterAmount: z.string(),
  walletAfterAmount: z.string(),
  createdAt: z.string(),
});

export const pointExchangesResponseWireSchema = z.object({
  data: z.array(pointExchangeWireSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});
export type PointExchangesResponseWire = z.infer<
  typeof pointExchangesResponseWireSchema
>;

/** Normalized point-exchange row (snake_case) for a future history view. */
export interface PointExchangeRow {
  id: string;
  amount: string;
  point_after_amount: string;
  wallet_after_amount: string;
  created_at: string;
}

export interface PointExchangesResponse {
  rows: number;
  pages: number;
  data: PointExchangeRow[];
}

export const mapPointExchange = (
  w: z.infer<typeof pointExchangeWireSchema>,
): PointExchangeRow => ({
  id: w.id,
  amount: w.amount,
  point_after_amount: w.pointAfterAmount,
  wallet_after_amount: w.walletAfterAmount,
  created_at: w.createdAt,
});

export const mapPointExchangesResponse = (
  w: PointExchangesResponseWire,
): PointExchangesResponse => ({
  rows: w.meta.total,
  pages: w.meta.totalPages,
  data: w.data.map(mapPointExchange),
});
