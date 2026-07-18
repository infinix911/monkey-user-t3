/**
 * Site Configuration
 *
 * Resolves the effective site config by deep-merging the API value
 * (/api/site/config/userpage, populated into useState by app.vue's
 * fetchSiteConfig) over the bundled Template2 config. API value wins for any
 * field it carries; the bundled config fills any field the API omits and acts
 * as the offline fallback when the CMS payload is unavailable.
 *
 * This module also owns the shared useState container (`useSiteConfigState`)
 * and the raw API-payload accessor (`useSiteConfigData`). They previously lived
 * in `useSiteConfigState.ts` / `useSiteConfigData.ts`; both are still exported
 * here under the same names so Nuxt's by-name auto-import keeps resolving every
 * external caller. The fetch helper (`fetchSiteConfig`) lives in
 * `app/lib/siteConfig.ts`.
 */

import type { SiteConfig } from "./useDefaultThemeConfig";
import { getDefaultThemeConfig } from "./useDefaultThemeConfig";

type Plain = Record<string, unknown>;

/**
 * Single source of truth for the site-config payload fetched from
 * /api/site/config/userpage. The payload is populated by `fetchSiteConfig`
 * (app/lib/siteConfig.ts), invoked from `app.vue` via `useAsyncData` before the
 * app mounts; `siteConfigError` is set alongside it on failure.
 */
export const USER_PAGE_CONFIG_KEY = "userPageConfig";
export const SITE_CONFIG_ERROR_KEY = "siteConfigError";

/**
 * Returns the SAME shared `useState` refs that every caller already binds to —
 * `useState(key)` is keyed global state, so reactivity here is identical to
 * reading the key inline. It exists only to centralize the state keys + type
 * and to surface the error/readiness contract that was previously implicit
 * (consumers silently received `null` when the fetch failed). See
 * [[useSiteConfig]] for the merged-config resolver and [[useSiteCurrency]] for
 * the currency slice.
 */
export function useSiteConfigState() {
  const config = useState<SiteConfig | null>(USER_PAGE_CONFIG_KEY, () => null);
  const error = useState<string | null>(SITE_CONFIG_ERROR_KEY, () => null);
  const isReady = computed(() => config.value != null);
  return { config, error, isReady };
}

/**
 * Raw site-config payload fetched from /api/site/config/userpage by
 * `fetchSiteConfig` before the app mounts. Returns a shallow copy of the API
 * payload, or `null` when it has not loaded yet.
 */
export const useSiteConfigData = () => {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore — useState is a Nuxt auto-import
  const apiData = useState<Record<string, unknown>>(USER_PAGE_CONFIG_KEY, () => null).value;

  if (!apiData) return null;

  return {
    ...apiData,
  };
};

/**
 * Recursive merge: override wins for primitives, arrays, and at the leaf
 * level. Both being plain objects merges keys (override beats base on
 * collision). Undefined/null in override falls back to base, so the CMS can't
 * accidentally blank out a bundled field by omitting it.
 */
function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;
  const baseIsPlainObject =
    typeof base === "object" && base !== null && !Array.isArray(base);
  const overrideIsPlainObject =
    typeof override === "object" && !Array.isArray(override);
  if (!baseIsPlainObject || !overrideIsPlainObject) {
    return override as T;
  }
  const out: Plain = { ...(base as Plain) };
  for (const key of Object.keys(override as Plain)) {
    out[key] = deepMerge((base as Plain)[key], (override as Plain)[key]);
  }
  return out as T;
}

/**
 * Resolves the effective site config: deep-merges the admin CMS response
 * (useState('userPageConfig')) over the bundled config. Falls back to the
 * bundled config when the API payload has not loaded.
 */
export const useSiteConfig = () => {
  const bundled = getDefaultThemeConfig();

  const apiState = useState<unknown>(USER_PAGE_CONFIG_KEY, () => null);
  if (!apiState.value) return bundled;

  return deepMerge(bundled, apiState.value);
};
