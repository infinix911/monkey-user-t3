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
      "We couldn’t sign you in here. Please try your usual login page or contact support for help.",
    );
    expect(ko.login.apiMessages.LOGIN_UNAVAILABLE_HERE).toBe(
      "현재 이곳에서는 로그인할 수 없습니다. 평소 이용하시던 로그인 페이지에서 다시 시도하거나 고객센터에 문의해 주세요.",
    );
  });
});
