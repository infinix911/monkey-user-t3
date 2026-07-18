/**
 * Currency → UI language mapping.
 *
 * The deployment's language is decided by the `currency` field on
 * /api/site/config/userpage — NOT by the visitor's browser.
 *
 *   KRW -> Korean      anything else / missing -> Korean (the default)
 *
 * Only English and Korean ship as UI languages; English is opt-in via the
 * language switcher (`ui_locale` cookie). Pure + isomorphic so SSR and client
 * hydration always agree.
 */

export type AppLocale = "en" | "ko";

/** The product default — used whenever currency doesn't map to a language. */
export const DEFAULT_LOCALE: AppLocale = "ko";

const VALID_LOCALES = new Set<AppLocale>(["en", "ko"]);

/** Map a site-config currency code to the UI locale. */
export function currencyToLocale(currency: string | null | undefined): AppLocale {
  switch (String(currency ?? "").toUpperCase()) {
    case "KRW":
      return "ko";
    default:
      return DEFAULT_LOCALE;
  }
}

/** Narrow an arbitrary string (e.g. a cookie value) to a supported locale. */
export function isAppLocale(value: unknown): value is AppLocale {
  return typeof value === "string" && VALID_LOCALES.has(value as AppLocale);
}
