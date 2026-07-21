import { describe, expect, it } from "vitest";
import {
  betHistoriesResponseWireSchema,
  mapBetHistoriesResponse,
} from "@/interfaces/game.interface";
import {
  mapNotification,
  notificationWireSchema,
} from "@/interfaces/notification.interface";
import {
  inquiryRepliesResponseWireSchema,
  mapRepliesResponse,
} from "@/interfaces/inquiry.interface";

describe("member API contract mappers", () => {
  it("preserves the bet-history summary from the camelCase API envelope", () => {
    const response = betHistoriesResponseWireSchema.parse({
      data: [],
      meta: { total: 0, page: 1, limit: 25, totalPages: 0 },
      summary: {
        betAmount: "12500",
        winAmount: "10000",
        rollAmount: "12500",
        netAmount: "-2500",
      },
    });

    expect(mapBetHistoriesResponse(response).summary).toEqual({
      bet_amount: "12500",
      win_amount: "10000",
      roll_amount: "12500",
      net_amount: "-2500",
    });
  });

  it("keeps the notification read state from the camelCase API response", () => {
    const notification = notificationWireSchema.parse({
      id: 1,
      category: "transaction",
      title: "Deposit approved",
      message: "Your deposit was approved.",
      isRead: true,
      pagePath: "/transactions",
      createdAt: "2026-07-21 12:00:00",
    });

    expect(mapNotification(notification).is_read).toBe(true);
  });

  it("normalizes cursor-paginated inquiry replies before rendering", () => {
    const response = inquiryRepliesResponseWireSchema.parse({
      data: [
        {
          id: "reply-1",
          senderType: "admin",
          message: "We are checking this for you.",
          createdAt: "2026-07-21 12:00:00",
        },
      ],
      meta: {
        hasMore: false,
        prevCursor: "2026-07-21 12:00:00",
      },
    });

    expect(mapRepliesResponse(response)).toMatchObject({
      has_more: false,
      prev_cursor: "2026-07-21 12:00:00",
      data: [
        {
          sender_type: "admin",
          created_at: "2026-07-21 12:00:00",
        },
      ],
    });
  });
});
