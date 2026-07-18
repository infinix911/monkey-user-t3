/**
 * useThemeDoc — loads the saved admin theme document from /api/site/config/theme
 * and merges it into useState('userPageConfig') so the public site reflects any
 * theme saved via the theme editor without requiring a full CMS republish.
 *
 * Design notes:
 *   - Runs in parallel with the existing fetchSiteConfig() call in app.vue.
 *   - Intentionally additive: it only writes into userPageConfig when the API
 *     returns a non-null document. If the endpoint 404s, errors, or returns
 *     nothing, the function swallows the failure and lets the normal config
 *     (bundled defaults or CMS payload) serve the page.
 *   - Does NOT alter the DISABLE_CMS_CONFIG flag or any other fetchSiteConfig
 *     behavior — the two fetches are fully independent.
 *   - The deep-merge order mirrors useSiteConfig(): bundled defaults < CMS
 *     userpage config < theme doc. This way the theme editor's saved values
 *     always win for the fields it manages.
 */

import type { SiteConfig } from "@/composables/useDefaultThemeConfig";
import { getDefaultThemeConfig } from "@/composables/useDefaultThemeConfig";
import { USER_PAGE_CONFIG_KEY } from "@/composables/useSiteConfig";
import { isThemePreview } from "@/lib/siteConfig";

type Plain = Record<string, unknown>;

/** Minimal deep-merge (same logic as useSiteConfig / themeEditor store). */
function deepMerge<T>(base: T, override: unknown): T {
  if (override === undefined || override === null) return base;
  const baseIsObj =
    typeof base === "object" && base !== null && !Array.isArray(base);
  const overrideIsObj =
    typeof override === "object" && !Array.isArray(override);
  if (!baseIsObj || !overrideIsObj) return override as T;
  const out: Plain = { ...(base as Plain) };
  for (const key of Object.keys(override as Plain)) {
    out[key] = deepMerge((base as Plain)[key], (override as Plain)[key]);
  }
  return out as T;
}

/**
 * Fetch the admin-saved theme document and apply it to the shared
 * useState('userPageConfig') so useSiteConfig() picks it up reactively.
 *
 * Call from app.vue alongside fetchSiteConfig(). Errors are swallowed so a
 * missing/unreachable theme endpoint never blocks rendering.
 */
export async function fetchThemeDoc(): Promise<boolean> {
  // Always return a defined value: useAsyncData warns (and may double-fetch on
  // the client) when its handler resolves to undefined.
  try {
    const api = useApi();
    const isPreview = isThemePreview();
    const raw = await api<{ data?: unknown } | null>(
      isPreview ? "/site/config/theme?domain=preview" : "/site/config/theme",
      {
        timeout: 5000,
      },
    );

    // Unwrap { data: ... } envelope if present
    const doc =
      raw && typeof raw === "object" && "data" in raw ? raw.data : raw;

    if (!doc || typeof doc !== "object") return false;

    // Merge the theme doc over whatever is already in userPageConfig
    // (which may be null if fetchSiteConfig() returned before this call).
    const current = useState<SiteConfig | null>(USER_PAGE_CONFIG_KEY, () => null);
    const base = current.value ?? getDefaultThemeConfig();
    current.value = deepMerge(base, doc);
    return true;
  } catch {
    // Swallow all errors — theme doc is non-critical
    return false;
  }
}
