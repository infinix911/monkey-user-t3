import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { resolveLoginError } from "@/lib/login-error";

const locales = ["en", "ko"].map((lang) =>
  JSON.parse(readFileSync(`i18n/locales/${lang}.json`, "utf8")),
);

describe("login error resolution", () => {
  it.each([
    ["INVALID_CREDENTIALS", 401],
    ["INVALID_USERNAME_OR_PASSWORD", 401],
    ["INVALID_EMAIL_OR_PASSWORD", 401],
    ["ACCOUNT_NEW", 403],
    ["ACCOUNT_PENDING_APPROVAL", 403],
    ["ACCOUNT_INACTIVE", 403],
    ["ACCOUNT_BLOCKED", 403],
    ["ACCOUNT_BANNED", 403],
    ["ACCOUNT_REJECTED", 403],
    ["ACCOUNT_DELETED", 403],
    ["ACCOUNT_UNAVAILABLE", 403],
    ["LOGIN_UNAVAILABLE_HERE", 403],
    ["USERNAME_TOO_SHORT", 422],
    ["USERNAME_TOO_LONG", 422],
    ["PASSWORD_TOO_SHORT", 422],
    ["INVALID_USERNAME", 422],
    ["EMAIL_NOT_VERIFIED", 403],
    ["TOO_MANY_REQUESTS", 429],
  ])("translates the expected %s code in both locales", (code, status) => {
    const result = resolveLoginError({ data: { code }, status });
    expect(result).toMatchObject({ key: `login.apiMessages.${code}`, unexpected: false });
    for (const locale of locales) {
      expect(locale.login.apiMessages[code]).toBeTruthy();
    }
  });

  it("uses the rate limit message for an unrecognized 429 payload", () => {
    expect(resolveLoginError({ status: 429, data: { message: "Slow down" } }).key)
      .toBe("login.apiMessages.TOO_MANY_REQUESTS");
  });

  it.each([
    [{ cause: { name: "TimeoutError" } }, "login.apiMessages.LOGIN_TIMEOUT"],
    [{ status: 504 }, "login.apiMessages.LOGIN_TIMEOUT"],
    [{ message: "fetch failed" }, "login.apiMessages.LOGIN_NETWORK_ERROR"],
    [{ status: 0, name: "FetchError" }, "login.apiMessages.LOGIN_NETWORK_ERROR"],
    [new Error("unexpected local failure"), "login.apiMessages.LOGIN_UNEXPECTED_ERROR"],
    [{ status: 500, data: { code: "UNRECOGNIZED" } }, "login.apiMessages.LOGIN_UNEXPECTED_ERROR"],
    [{ status: 500, data: { code: "INVALID_CREDENTIALS" } }, "login.apiMessages.LOGIN_UNEXPECTED_ERROR"],
  ])("does not turn non-credential failures into credential errors", (error, key) => {
    const result = resolveLoginError(error);
    expect(result.key).toBe(key);
    expect(result.unexpected).toBe(true);
    expect(result.key).not.toContain("INVALID_CREDENTIALS");
    expect(result.key).not.toContain("invalidCredentials");
    for (const locale of locales) {
      const path = result.key.split(".");
      const translated = path.reduce((value, segment) => value?.[segment], locale);
      expect(translated).toBeTruthy();
    }
  });

  it("drops prose or unsafe values from diagnostics", () => {
    const result = resolveLoginError({
      status: 500,
      data: { code: "password=secret" },
    });
    expect(result).toMatchObject({ key: "login.apiMessages.LOGIN_UNEXPECTED_ERROR", unexpected: true });
    expect(result.code).toBeUndefined();
  });
});
