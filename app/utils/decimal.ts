/**
 * @file app/utils/decimal.ts
 * @description Exact addition of the decimal strings the API sends for money.
 *
 * Amounts arrive as `numeric` decimal strings ("1000.5000"). Adding them with
 * `Number(a) + Number(b)` is the `0.1 + 0.2` problem: each conversion is exact
 * enough on its own, but the sum drifts from what the server would compute, and
 * the drift grows with the number of terms.
 *
 * The house rule is that money is server-computed and never summed on the
 * client — `monkey-admin`'s omitted-bets page states it outright. The Betting
 * Report's "all" tab cannot follow it: there is no single endpoint for all four
 * game types, so it fans out and has to combine four server-computed summaries
 * itself (BUG-025). Doing that in `BigInt` minor units makes the combination
 * exact, so the only remaining conversion is the final one for display.
 */

/** One parsed decimal string, split into sign and digits. */
interface Parsed {
  negative: boolean
  integer: string
  fraction: string
}

/**
 * Split a decimal string into its sign and digit runs.
 *
 * Anything unparseable becomes zero rather than `NaN`: a malformed field should
 * contribute nothing to a total, not poison it.
 *
 * @param value - A decimal string, possibly signed, possibly empty.
 * @returns The parsed parts.
 */
function parse(value: string | number | null | undefined): Parsed {
  const raw = String(value ?? "0").trim() || "0"
  if (!/^[+-]?\d*(\.\d*)?$/.test(raw)) {
    return { negative: false, integer: "0", fraction: "" }
  }
  const negative = raw.startsWith("-")
  const [integer = "", fraction = ""] = raw.replace(/^[+-]/, "").split(".")
  return { negative, integer: integer || "0", fraction }
}

/**
 * Add decimal strings without going through a float.
 *
 * The result keeps the widest scale of its inputs, so summing values that carry
 * four decimal places returns four decimal places — the same shape the server
 * sent, which keeps the value comparable against it.
 *
 * @param values - Decimal strings to add.
 * @returns Their exact sum, as a decimal string.
 */
export function sumDecimalStrings(
  values: ReadonlyArray<string | number | null | undefined>,
): string {
  const parsed = values.map(parse)
  const scale = parsed.reduce((widest, part) => Math.max(widest, part.fraction.length), 0)

  const total = parsed.reduce((accumulator, part) => {
    const digits = `${part.integer}${part.fraction.padEnd(scale, "0")}`
    const magnitude = BigInt(digits)
    return accumulator + (part.negative ? -magnitude : magnitude)
  }, 0n)

  if (scale === 0) return total.toString()

  const negative = total < 0n
  const digits = (negative ? -total : total).toString().padStart(scale + 1, "0")
  const integer = digits.slice(0, digits.length - scale)
  const fraction = digits.slice(digits.length - scale)

  return `${negative ? "-" : ""}${integer}.${fraction}`
}
