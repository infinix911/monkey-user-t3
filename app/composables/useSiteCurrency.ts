/**
 * Site currency resolver — reads the dropdown value the admin sets via
 * /cms/user-page → Currency, which the backend returns as
 * `response.data.currency` on /api/site/config/userpage.
 *
 * The value is already in `useState('userPageConfig')` once
 * `fetchSiteConfig()` (called from `app.vue` before mount) resolves, so this
 * composable stays synchronous — same ergonomics as the old
 * `config.public.siteCurrency` read.
 *
 * Server-side handlers (server/middleware, server/routes) cannot use this
 * composable — they run before Vue setup. Use `getSiteCurrency(event)` from
 * `server/utils/site-currency` there.
 */
export type SiteCurrency = "IDR" | "THB" | "USD" | "KRW";

const FALLBACK: SiteCurrency = "KRW";
const VALID = new Set<SiteCurrency>(["IDR", "THB", "USD", "KRW"]);

export function useSiteCurrency(): SiteCurrency {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — useState is a Nuxt auto-import
  const state = useState<Record<string, unknown> | null>(
    "userPageConfig",
    () => null,
  );
  const raw = String(
    (state.value as { currency?: string } | null)?.currency ?? "",
  ).toUpperCase() as SiteCurrency;
  return VALID.has(raw) ? raw : FALLBACK;
}
