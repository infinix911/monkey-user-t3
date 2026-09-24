import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveApiToken } from "@/composables/useApiMessage";

const en = JSON.parse(
  readFileSync("i18n/locales/en.json", "utf8"),
);
const ko = JSON.parse(
  readFileSync("i18n/locales/ko.json", "utf8"),
);

describe("browser login restriction message", () => {
  it("maps the Better Auth error code to neutral copy in both locales", () => {
    const token = resolveApiToken({
      data: {
        code: "LOGIN_UNAVAILABLE_HERE",
        message: "Login unavailable",
      },
    });

    expect(token).toBe("LOGIN_UNAVAILABLE_HERE");
    expect(en.login.apiMessages.LOGIN_UNAVAILABLE_HERE).toBe(
      "We cannot login this account.  Please try again later",
    );
    expect(ko.login.apiMessages.LOGIN_UNAVAILABLE_HERE).toBe(
      "로그인할 수 없습니다. 잠시 후 시도해 주세요.",
    );
  });
});
