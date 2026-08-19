import { describe, expect, it } from "vitest";

const gameLayoutPath = "app/layouts/game.vue";
const gameLaunchPagePath = "app/pages/[game_type]/[game_id].vue";

describe("direct game inquiry guard", () => {
  it("hosts the existing inquiry modal and initializes unread-inquiry state in the game layout", async () => {
    const source = await Bun.file(gameLayoutPath).text();

    expect(source).toContain("useUnreadInquiryGate()");
    expect(source).toContain("<InquiryModal");
    expect(source).toContain("blockedByUnreadInquiries");
  });

  it("opens the inquiry modal instead of redirecting when the launch API blocks unread replies", async () => {
    const source = await Bun.file(gameLaunchPagePath).text();

    expect(source).toContain("INQUIRY_UNREAD");
    expect(source).toContain("uiStore.setShowInquiryModal(true)");
  });
});
