import { z } from "zod";

/** Shared wire contracts for the `/api/partners` API. */
export const partnerPaginationMetaSchema = z.object({
  total: z.number(),
  page: z.number(),
  limit: z.number(),
  totalPages: z.number(),
});

export const partnerDashboardSchema = z.object({
  deposits: z.string(),
  withdrawals: z.string(),
  netCashflow: z.string(),
  walletAmount: z.string(),
  pointAmount: z.string(),
});

export const partnerGameSummarySchema = z.array(
  z.object({
    gameType: z.enum(["casino", "slot", "sport", "mini"]),
    betAmount: z.string(),
    winAmount: z.string(),
    netAmount: z.string(),
    ownCommissionAmount: z.string(),
    downlineCommissionAmount: z.string(),
    totalProfitAmount: z.string(),
    games: z.array(
      z.object({
        lobby: z.string(),
        game: z.string(),
        betAmount: z.string(),
        winAmount: z.string(),
        netAmount: z.string(),
      }),
    ),
  }),
);

export const partnerMemberSelectSchema = z.array(
  z.object({ memberId: z.string(), username: z.string() }),
);

export const partnerGameStatSchema = z.array(
  z.object({
    settleDate: z.string(),
    deposits: z.string(),
    withdrawals: z.string(),
    netCashflow: z.string(),
    betAmount: z.string(),
    winAmount: z.string(),
    netAmount: z.string(),
    commissionAmount: z.string(),
    totalProfitAmount: z.string(),
  }),
);

export const partnerBetHistorySchema = z.object({
  data: z.array(
    z.object({
      id: z.string(),
      memberId: z.string(),
      username: z.string(),
      name: z.string(),
      gameType: z.enum(["casino", "slot", "sport", "mini"]),
      provider: z.string(),
      lobby: z.string(),
      game: z.string(),
      roomOrder: z.string(),
      betAmount: z.string(),
      winAmount: z.string(),
      netAmount: z.string(),
      walletBeforeAmount: z.string(),
      walletAfterAmount: z.string(),
      betResult: z.string(),
      state: z.number().nullable(),
      createdAt: z.string(),
      updatedAt: z.string(),
    }),
  ),
  meta: partnerPaginationMetaSchema,
  summary: z.object({
    betAmount: z.string(),
    winAmount: z.string(),
    netAmount: z.string(),
    rollingBaseAmount: z.string(),
  }),
});

export type PartnerDashboard = z.infer<typeof partnerDashboardSchema>;
export type PartnerGameSummary = z.infer<typeof partnerGameSummarySchema>;
export type PartnerGameStat = z.infer<typeof partnerGameStatSchema>;
export type PartnerBetHistory = z.infer<typeof partnerBetHistorySchema>;
