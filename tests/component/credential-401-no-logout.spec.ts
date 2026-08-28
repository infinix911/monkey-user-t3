/**
 * A wrong password must not look like an ended session.
 *
 * Both HTTP clients treat 401 as session expiry and force-navigate home. The
 * API also answers 401 when a credential in the request *body* is wrong
 * (`INVALID_WITHDRAWAL_PASSWORD` from monkey-user-api's
 * `transactions.controller.ts` / `auth.controller.ts`), so one mistyped
 * withdrawal password reloaded the page and destroyed the error dialog before
 * the member could read it — and only on the first mistake per tab, because the
 * `session_logged_out` latch fires once, which is what made it look random.
 *
 * The token list is the contract with monkey-user-api: renaming a token there
 * without updating `lib/session-401.ts` brings the reload back.
 */
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { isCredentialFailure } from "@/lib/session-401";

const useApi = readFileSync(
  resolve(__dirname, "../../app/composables/useApi.ts"),
  "utf8",
);
const axiosClient = readFileSync(
  resolve(__dirname, "../../app/lib/axios-client.ts"),
  "utf8",
);

describe("credential 401 does not trigger auto-logout", () => {
  it("recognises the `responseHandler` shape ({ message: TOKEN })", () => {
    // Custom controllers return the bare token as `message`.
    expect(isCredentialFailure({ message: "INVALID_WITHDRAWAL_PASSWORD" })).toBe(
      true,
    );
    expect(isCredentialFailure({ message: "INVALID_CURRENT_PASSWORD" })).toBe(
      true,
    );
  });

  it("recognises the Better Auth shape ({ code: TOKEN, message: prose })", () => {
    expect(
      isCredentialFailure({
        code: "INVALID_CREDENTIALS",
        message: "Invalid credentials",
      }),
    ).toBe(true);
  });

  it("still logs out for a genuinely dead session", () => {
    // The auth macro's `status(401)` sends no token at all.
    expect(isCredentialFailure(undefined)).toBe(false);
    expect(isCredentialFailure(null)).toBe(false);
    expect(isCredentialFailure("Unauthorized")).toBe(false);
    expect(isCredentialFailure({})).toBe(false);
    // These mean the session points at a member that no longer resolves.
    expect(isCredentialFailure({ message: "INVALID_AUTH" })).toBe(false);
    expect(isCredentialFailure({ message: "INVALID_USER" })).toBe(false);
  });

  it("ignores a numeric `code` (an HTTP status, never a token)", () => {
    expect(isCredentialFailure({ code: 401 })).toBe(false);
    // ...but still reads `message` when `code` is not a string.
    expect(
      isCredentialFailure({ code: 401, message: "INVALID_WITHDRAWAL_PASSWORD" }),
    ).toBe(true);
  });

  it("is consulted by BOTH clients before the logout latch", () => {
    // useApi.ts and axios-client.ts are kept in deliberate parity — a guard
    // added to one and not the other leaves half the app still reloading.
    expect(useApi).toContain("isCredentialFailure(response?._data)");
    expect(axiosClient).toContain("isCredentialFailure(error.response?.data)");

    // Ordering matters: returning after the latch is set would suppress a real
    // session expiry later in the same tab.
    expect(useApi.indexOf("isCredentialFailure")).toBeLessThan(
      useApi.indexOf('sessionStorage.setItem("session_logged_out"'),
    );
    expect(axiosClient.indexOf("isCredentialFailure")).toBeLessThan(
      axiosClient.indexOf('sessionStorage.setItem("session_logged_out"'),
    );
  });
});
