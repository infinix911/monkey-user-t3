/**
 * Shared table cell formatting.
 *
 * Every account/transaction table used to format its own dates — `formatDate`
 * was reimplemented in TransactionHistory, BettingReport, LoginHistory and
 * TransactionLogs, each with a different shape ("Jul 30 26 14:05", raw ISO, …).
 * These helpers are the single definition so the tables read alike.
 */

/** A timestamp split for a two-line table cell. */
export interface DateParts {
  /** `2026-07-30` — always zero-padded, never locale-reordered. */
  date: string;
  /** `14:05:09`, or "" when the source carried no usable time. */
  time: string;
}

/**
 * Splits a timestamp into its date and time halves for a stacked table cell.
 *
 * The date is deliberately ISO-ordered rather than locale-formatted: these
 * tables are scanned and compared down a column, where a fixed-width
 * year-month-day sorts visually and never reads ambiguously (07/08 is a
 * different day either side of the Atlantic).
 *
 * Values already stored as `YYYY-MM-DD HH:MM:SS` are split as text rather than
 * parsed, because `new Date()` would treat them as UTC in some engines and
 * local in others and shift the displayed day. Anything else falls back to
 * parsing.
 *
 * @param value - Timestamp from the API; may be null or unparseable.
 * @returns {DateParts} The two halves; both "" when there is nothing to show.
 */
export function toDateParts(value: string | null | undefined): DateParts {
  const raw = (value ?? "").trim();
  if (!raw) return { date: "", time: "" };

  // `2026-07-30 14:05:09` or `2026-07-30T14:05:09(.sss)(Z|+09:00)`
  const asText = /^(\d{4}-\d{2}-\d{2})[T ](\d{2}:\d{2}(?::\d{2})?)/.exec(raw);
  if (asText) return { date: asText[1]!, time: asText[2]! };

  // Date only.
  const dateOnly = /^(\d{4}-\d{2}-\d{2})$/.exec(raw);
  if (dateOnly) return { date: dateOnly[1]!, time: "" };

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return { date: raw, time: "" };

  const pad = (n: number) => String(n).padStart(2, "0");
  return {
    date: `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}`,
    time: `${pad(parsed.getHours())}:${pad(parsed.getMinutes())}:${pad(parsed.getSeconds())}`,
  };
}
