import {
  formatAmount,
  formatAmountNumber,
  getCurrencyInfo,
} from "@/utils/currency";
import { useSiteCurrency } from "@/composables/useSiteCurrency";

/**
 * Resolves the deployment currency from the CMS-driven userpage config and
 * exposes formatters that produce the right symbol and locale-aware number
 * separators (e.g. Rp 1.000 / ฿1,000 / ₩1,000 / $1,000).
 *
 * Same shape as useFeatures(): plain object, no reactivity wrapper —
 * the underlying value is stable within a request.
 */
export function useCurrency() {
  const code = useSiteCurrency();
  const info = getCurrencyInfo(code);
  return {
    code: info.code,
    symbol: info.symbol,
    locale: info.locale,
    format: (value: number | string) => formatAmount(value, info.code),
    formatNumber: (value: number | string) =>
      formatAmountNumber(value, info.code),
    /**
     * Resolve a currency symbol from an arbitrary code (e.g. user.currency
     * from the API). Falls back to the deployment currency's symbol when
     * the override is empty/null/unknown — handy for displaying the right
     * sign next to a user's per-wallet balance.
     */
    symbolFor: (override?: string | null) =>
      getCurrencyInfo(override || info.code).symbol,
  };
}
