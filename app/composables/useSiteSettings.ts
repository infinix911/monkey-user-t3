/**
 * Public site settings (admin CMS — /site/settings)
 *
 * Key/value rows (e.g. `site:livechat`) used across the app.
 */

import { getApiBase } from "@/lib/domain";
import { useSiteStore, type SiteSettings } from "@/stores/site";

interface SiteSettingItem {
  key: string;
  value: string;
}

/** Loader — call from useAsyncData in app.vue. Idempotent. */
export async function fetchSiteSettings(): Promise<SiteSettings | null> {
  const store = useSiteStore();
  if (store.siteSettings !== null) return store.siteSettings;

  const apiBase = getApiBase();
  try {
    const res = await $fetch<{ data?: SiteSettingItem[] } | SiteSettingItem[]>(
      `${apiBase}/site/settings`,
      { timeout: 10000 },
    );
    const list = Array.isArray(res)
      ? res
      : res && typeof res === "object" && Array.isArray(res.data)
        ? res.data
        : null;

    const map: SiteSettings | null = list
      ? Object.fromEntries(list.map((s) => [s.key, s.value]))
      : null;
    store.setSiteSettings(map);
    return map;
  } catch {
    store.setSiteSettings(null);
    return null;
  }
}
