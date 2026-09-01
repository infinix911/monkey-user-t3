/**
 * Locale → meta-tag format map.
 *
 * Single source of truth for translating the active i18n locale into the
 * BCP-47 string used by <html lang>.
 */

export const LOCALE_META = {
  en: { bcp47: "en-US" },
  ko: { bcp47: "ko-KR" },
} as const;

export type SupportedLocale = keyof typeof LOCALE_META;
