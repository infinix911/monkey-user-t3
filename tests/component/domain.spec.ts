import { describe, expect, it } from "vitest";
import { getPartnerUrl, getProductionApiBase } from "@/lib/domain";

describe("getPartnerUrl", () => {
  it("uses the current hostname's root domain", () => {
    expect(getPartnerUrl("play.example.com")).toBe(
      "https://partner.example.com/",
    );
  });

  it("preserves a two-label hostname", () => {
    expect(getPartnerUrl("localhost.test")).toBe(
      "https://partner.localhost.test/",
    );
  });
});

describe("getProductionApiBase", () => {
  it("uses the parent domain API for a nested userpage host", () => {
    expect(getProductionApiBase("krw-demo1.jaeisol.com")).toBe(
      "https://uapi.jaeisol.com/api",
    );
  });

  it("keeps two-label userpage hosts working", () => {
    expect(getProductionApiBase("ka-700.com")).toBe(
      "https://uapi.ka-700.com/api",
    );
  });
});
