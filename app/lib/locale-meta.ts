/**
 * Locale → meta-tag format map.
 *
 * Single source of truth for translating the active i18n locale into the
 * string formats expected by <meta name="language">, <meta property="og:locale">,
 * and <meta property="og:locale:alternate">.
 */

export const LOCALE_META = {
  en: { bcp47: "en-US", og: "en_US" },
  ko: { bcp47: "ko-KR", og: "ko_KR" },
} as const;

export type SupportedLocale = keyof typeof LOCALE_META;
