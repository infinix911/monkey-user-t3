import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolveApiToken } from "@/composables/useApiMessage";
import { resolveLoginError } from "@/lib/login-error";

const en = JSON.parse(
  readFileSync("i18n/locales/en.json", "utf8"),
);
const ko = JSON.parse(
  readFileSync("i18n/locales/ko.json", "utf8"),
);

describe("browser login restriction message", () => {
  it("maps the Better Auth 403 response to generic copy in both locales", () => {
    const error = {
      statusCode: 403,
      data: {
        code: "LOGIN_UNAVAILABLE_HERE",
        message: "Login unavailable",
      },
    };
    const token = resolveApiToken(error);

    expect(token).toBe("LOGIN_UNAVAILABLE_HERE");
    expect(resolveLoginError(error)).toMatchObject({
      key: "login.apiMessages.LOGIN_UNAVAILABLE_HERE",
      unexpected: false,
      status: 403,
    });
    expect(en.login.apiMessages.LOGIN_UNAVAILABLE_HERE).toBe(
      "We cannot sign you in. Please try again.",
    );
    expect(ko.login.apiMessages.LOGIN_UNAVAILABLE_HERE).toBe(
      "로그인할 수 없습니다. 다시 시도해 주세요.",
    );
  });
});
