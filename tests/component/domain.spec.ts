import { describe, expect, it } from "vitest";
import { getPartnerUrl } from "@/lib/domain";

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
