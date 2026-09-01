import { afterEach, describe, expect, it } from "vitest";
import {
  CSRF_COOKIE_NAME,
  getCsrfHeaders,
} from "@/lib/csrf";

describe("CSRF request headers", () => {
  afterEach(() => {
    document.cookie = `${CSRF_COOKIE_NAME}=; Max-Age=0; Path=/`;
  });

  it("reads the versioned CSRF cookie into the mutation header", () => {
    document.cookie = `${CSRF_COOKIE_NAME}=token-value; Path=/`;

    expect(getCsrfHeaders()).toEqual({ "X-CSRF-Token": "token-value" });
  });

  it("does not use the legacy CSRF cookie", () => {
    document.cookie = "XSRF-TOKEN=legacy-token; Path=/";

    expect(getCsrfHeaders()).toEqual({});
  });
});
