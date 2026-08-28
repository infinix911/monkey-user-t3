/**
 * Kickout → auto-logout contract.
 *
 * When an operator ends a member's session (monkey-admin's online-members
 * "Logout"), monkey-admin-api revokes the session rows and emits a `kickout`
 * event to the member's socket room. This app is the half that acts on it, and
 * the event NAME is the whole contract between the two repos — renaming it on
 * either side silently leaves the member on a signed-in page until the 30s
 * session check catches up.
 *
 * The admin half is asserted in monkey-admin-api's
 * `test/controllers/membersdetail-kickout.controller.test.ts`.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const store = readFileSync(
  resolve(__dirname, "../../app/stores/websocket.ts"),
  "utf8",
);
const sessionPlugin = readFileSync(
  resolve(__dirname, "../../app/plugins/session-verify.client.ts"),
  "utf8",
);

describe("kickout auto-logout", () => {
  it("handles the `kickout` event the admin API emits", () => {
    expect(store).toContain('case "kickout"');
    expect(store).toContain("void handleSessionRevoked()");
  });

  it("closes the socket before logging out, so it does not reconnect", () => {
    // disconnect() closes with 1000; any other code puts the store on its
    // exponential reconnect ladder, redialling with a dead cookie.
    const revoked = store.slice(
      store.indexOf("const handleSessionRevoked"),
      store.indexOf("const connect = async"),
    );
    expect(revoked).toContain("disconnect();");
    expect(revoked.indexOf("disconnect();")).toBeLessThan(
      revoked.indexOf("logout()"),
    );
  });

  it("clears client state and reloads as a guest", () => {
    const revoked = store.slice(
      store.indexOf("const handleSessionRevoked"),
      store.indexOf("const connect = async"),
    );
    expect(revoked).toContain("useAuthStore().logout()");
    expect(revoked).toContain("window.location");
  });

  it("routes the periodic session check through the same path", () => {
    // Expiry, a login elsewhere and an operator kick all mean the same thing to
    // the member; they must not drift into two different logout behaviours.
    expect(store).toContain("await handleSessionRevoked();");
    expect(store.match(/handleSessionRevoked/g)?.length).toBeGreaterThanOrEqual(
      3,
    );
  });

  it("re-checks the session when a hidden tab comes back", () => {
    // A hidden tab has no socket — the plugin disconnects it for bfcache — so
    // it cannot hear `kickout`, and its 30s check is stopped with it. Coming
    // back is the first chance to notice, and it must not simply reconnect.
    expect(sessionPlugin).toContain("ws.confirmSession()");
    expect(sessionPlugin.match(/confirmSession\(\)/g)?.length).toBe(2);
    expect(sessionPlugin).toContain("if (valid) ws.connect()");
  });

  it("asks whether the session survived when the API refuses the socket", () => {
    // 1008 is UNAUTHENTICATED / SESSION_EXPIRED: redialling with the same
    // cookie only repeats the refusal.
    expect(store).toContain("if (event.code === 1008)");
    expect(store).toContain("const confirmSession = async (): Promise<boolean>");
    expect(store).toContain("confirmSession,");
  });
});
