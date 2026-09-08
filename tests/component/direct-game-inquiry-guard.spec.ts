/**
 * A direct game launch blocked by unread inquiries must open the modal, not redirect.
 *
 * These two assertions guard the pairing that makes that work: the game layout
 * has to host the inquiry modal and initialise the unread gate, and the launch
 * page has to treat the API's `INQUIRY_UNREAD` refusal as "show the modal"
 * rather than as a generic failure. Split across two files, either half can be
 * removed without the other looking wrong.
 *
 * Read with `node:fs`, not `Bun.file`: Vitest runs on Node, where the `Bun`
 * global does not exist, so both cases threw `ReferenceError: Bun is not
 * defined` and the behaviour above went unverified (BUG-014). Paths resolve
 * from `__dirname` rather than the process cwd, matching the other specs here,
 * so the suite does not depend on where it was invoked from.
 *
 * Repairing the runtime error exposed a second defect the crash had masked: the
 * layout case asserted `blockedByUnreadInquiries`, a symbol `git log -S` shows
 * was never in that file. It is the guard the nav and transaction entry points
 * call; the layout only initialises the gate and hosts the modal. The
 * assertion could never have passed, and shipped in the same commit as the
 * feature it was meant to protect.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const gameLayout = readFileSync(
  resolve(__dirname, "../../app/layouts/game.vue"),
  "utf8",
);

const gameLaunchPage = readFileSync(
  resolve(__dirname, "../../app/pages/[game_type]/[game_id].vue"),
  "utf8",
);

describe("direct game inquiry guard", () => {
  it("hosts the existing inquiry modal and initializes unread-inquiry state in the game layout", () => {
    expect(gameLayout).toContain("useUnreadInquiryGate()");
    expect(gameLayout).toContain("<InquiryModal");
    // The store flag is the seam between the two files: the launch page sets it,
    // this layout renders on it.
    expect(gameLayout).toContain("uiStore.showInquiryModal");
  });

  it("opens the inquiry modal instead of redirecting when the launch API blocks unread replies", () => {
    expect(gameLaunchPage).toContain("INQUIRY_UNREAD");
    expect(gameLaunchPage).toContain("uiStore.setShowInquiryModal(true)");
  });
});
