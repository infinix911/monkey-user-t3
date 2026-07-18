import { formatNumber } from "./formatter";

/**
 * Get currency symbol as string for a given currency code
 * @param currency - Currency code (e.g., "KRW", "USD", "IDR", "THB")
 * @returns Currency symbol as string
 *
 * @example
 * getCurrencySymbolString("KRW") // "₩"
 * getCurrencySymbolString("USD") // "$"
 * getCurrencySymbolString("IDR") // "Rp"
 */
export function getCurrencySymbolString(
  currency: string | null | undefined,
): string {
  if (!currency) return "$"; // Default to USD

  switch (currency.toUpperCase()) {
    case "KRW":
      return "₩";
    case "USD":
      return "$";
    case "IDR":
      return "Rp";
    case "THB":
      return "฿";
    default:
      return currency; // Return the code itself if no symbol is defined
  }
}

/**
 * Get currency code from locale
 * @param locale - Locale string (e.g., "en-US", "ko-KR", "th-TH")
 * @returns Currency code based on locale
 */
function getCurrencyFromLocale(locale: string): string {
  const localeToCurrency: Record<string, string> = {
    "en-US": "USD",
    "en-GB": "GBP",
    "ko-KR": "KRW",
    ko: "KRW",
    "th-TH": "THB",
    th: "THB",
    "id-ID": "IDR",
    id: "IDR",
    "ja-JP": "JPY",
    ja: "JPY",
    "zh-CN": "CNY",
    zh: "CNY",
    "de-DE": "EUR",
    de: "EUR",
    "fr-FR": "EUR",
    fr: "EUR",
    "es-ES": "EUR",
    es: "EUR",
    "it-IT": "EUR",
    it: "EUR",
    "pt-PT": "EUR",
    pt: "EUR",
    "nl-NL": "EUR",
    nl: "EUR",
    "sv-SE": "SEK",
    sv: "SEK",
    "no-NO": "NOK",
    no: "NOK",
    "da-DK": "DKK",
    da: "DKK",
    "fi-FI": "EUR",
    fi: "EUR",
    "pl-PL": "PLN",
    pl: "PLN",
    "ru-RU": "RUB",
    ru: "RUB",
    "tr-TR": "TRY",
    tr: "TRY",
    "ar-SA": "SAR",
    ar: "SAR",
    "he-IL": "ILS",
    he: "ILS",
    "hi-IN": "INR",
    hi: "INR",
    "ms-MY": "MYR",
    ms: "MYR",
    "vi-VN": "VND",
    vi: "VND",
  };

  return (
    localeToCurrency[locale] || localeToCurrency[locale.split("-")[0]] || "USD"
  );
}

/**
 * Format currency amount with symbol
 * @param amount - The amount to format (number or string)
 * @param currency - Currency code (optional, defaults to locale-based currency)
 * @param locale - Locale for number formatting (optional, uses browser locale if not provided)
 * @returns Formatted currency string with symbol
 *
 * @example
 * formatCurrencyAmount(4000) // Auto-detects locale and currency
 * formatCurrencyAmount(4000, undefined, "ko-KR") // "₩4,000" (locale-based)
 * formatCurrencyAmount(4000, "USD", "ko-KR") // "$4,000" (currency overrides locale)
 * formatCurrencyAmount(100, undefined, "en-US") // "$100" (locale-based)
 */
export function formatCurrencyAmount(
  amount: number | string | null | undefined,
  currency?: string | null,
  locale?: string,
): string {
  // In SPA mode we are always in the browser, use navigator.language as fallback
  const effectiveLocale =
    locale || (typeof navigator !== "undefined" ? navigator.language : "en-US");

  if (!amount)
    return `${getCurrencySymbolString(currency || getCurrencyFromLocale(effectiveLocale))}0`;

  // Use passed currency if provided, otherwise use locale-based currency
  const effectiveCurrency = currency || getCurrencyFromLocale(effectiveLocale);
  const symbol = getCurrencySymbolString(effectiveCurrency);
  const formattedAmount = formatNumber(amount, effectiveLocale);

  return `${symbol}${formattedAmount}`;
}
