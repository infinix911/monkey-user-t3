/**
 * Exact addition of the decimal strings the API sends for money.
 *
 * The Betting Report's "all" tab has no single endpoint covering all four game
 * types, so it fans out and combines four server-computed summaries itself. It
 * used to do that with `Number(a) + Number(b)`, which drifts from the server's
 * decimal arithmetic (BUG-025). The first case below is the classic
 * demonstration: in doubles it produces 0.30000000000000004.
 */
import { describe, expect, it } from "vitest";
import { sumDecimalStrings } from "~/utils/decimal";

describe("sumDecimalStrings", () => {
  it("adds values a float would get wrong", () => {
    expect(sumDecimalStrings(["0.1", "0.2"])).toBe("0.3");
    expect(Number("0.1") + Number("0.2")).not.toBe(0.3);
  });

  it("keeps the widest scale of its inputs, matching the shape the server sent", () => {
    expect(sumDecimalStrings(["1000.5000", "2000.2500"])).toBe("3000.7500");
    expect(sumDecimalStrings(["1.5", "2.25"])).toBe("3.75");
  });

  it("stays exact across many terms, where the drift actually accumulates", () => {
    const values = Array.from({ length: 1000 }, () => "0.0001");
    expect(sumDecimalStrings(values)).toBe("0.1000");
  });

  it("handles negatives, which net_amount can be", () => {
    expect(sumDecimalStrings(["100.0000", "-250.5000"])).toBe("-150.5000");
    expect(sumDecimalStrings(["-0.1", "-0.2"])).toBe("-0.3");
  });

  it("returns an integer string when nothing carries a fraction", () => {
    expect(sumDecimalStrings(["100", "250"])).toBe("350");
    expect(sumDecimalStrings([])).toBe("0");
  });

  it("treats missing and malformed values as zero rather than poisoning the total", () => {
    // A bad field should cost its own contribution, not the whole summary.
    expect(sumDecimalStrings(["100.00", null, undefined, ""])).toBe("100.00");
    expect(sumDecimalStrings(["100.00", "not-a-number"])).toBe("100.00");
  });

  it("accepts numbers as well as strings", () => {
    expect(sumDecimalStrings([1.5, "2.25"])).toBe("3.75");
  });
});
