/**
 * Currency utilities — pure functions only.
 *
 * Components should generally use the `useCurrency()` composable, which
 * resolves the deployment currency from runtimeConfig and calls these
 * formatters with the right code. Calling these directly is fine for
 * code that needs to pin a specific currency (intentionally IDR-fixed
 * IDR-only by gating).
 */

export interface CurrencyInfo {
  code: string;
  symbol: string;
  locale: string;
}

/**
 * Supported currencies. Add a new entry here and the entire UI picks it
 * up automatically — no per-component edits needed.
 */
export const CURRENCY_MAP: Record<string, CurrencyInfo> = {
  IDR: { code: "IDR", symbol: "Rp", locale: "id-ID" },
  THB: { code: "THB", symbol: "฿", locale: "th-TH" },
  USD: { code: "USD", symbol: "$", locale: "en-US" },
  KRW: { code: "KRW", symbol: "₩", locale: "ko-KR" },
};

/** Look up currency info by code. Falls back to IDR for unknown codes. */
export function getCurrencyInfo(code: string | null | undefined): CurrencyInfo {
  if (!code) return CURRENCY_MAP.IDR!;
  return CURRENCY_MAP[code] ?? CURRENCY_MAP.IDR!;
}

/**
 * Format an amount with the currency symbol — uses the locale's native
 * Intl.NumberFormat output, e.g. "Rp 1.000" / "฿1,000" / "₩1,000" / "$1,000".
 */
export function formatAmount(
  value: number | string,
  code: string | null | undefined,
): string {
  const info = getCurrencyInfo(code);
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) {
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency: info.code,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(0);
  }
  return new Intl.NumberFormat(info.locale, {
    style: "currency",
    currency: info.code,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(num);
}

/**
 * Format a number with the locale's separators but no currency symbol —
 * e.g. "1.000" in id-ID, "1,000" in th-TH. Use when the symbol is
 * rendered separately or not at all.
 */
export function formatAmountNumber(
  value: number | string,
  code: string | null | undefined,
): string {
  const info = getCurrencyInfo(code);
  const num = typeof value === "string" ? parseFloat(value) || 0 : value;
  return new Intl.NumberFormat(info.locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * @deprecated Prefer `useCurrency().format(value)` so the result respects
 * the deployment currency. Kept for intentionally-IDR
 * call sites; this always formats as IDR regardless of deployment.
 */
export function formatWallet(value: string | number): string {
  return formatAmount(value, "IDR");
}

/**
 * @deprecated Prefer `useCurrency().formatNumber(value)`. Kept for
 * / other intentionally-IDR call sites; always uses id-ID locale.
 */
export function formatWalletAmount(value: string | number): string {
  return formatAmountNumber(value, "IDR");
}

/**
 * Whole-number THB formatting for the partner/affiliate program, which is
 * intentionally pinned to Thai baht (th-TH, no fraction digits) regardless of
 * the deployment currency — do NOT route this through useCurrency(). Extracted
 * verbatim from four identical local copies in the partner list components.
 */
export function formatPartnerAmount(num: number): string {
  return num.toLocaleString("th-TH", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
}
