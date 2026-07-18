/**
 * Public site settings (admin CMS — /site/settings)
 *
 * Key/value rows (e.g. `site:livechat`) used across the app. Pre-fetched
 * server-side from app.vue via useAsyncData so the call lands in the SSR
 * payload (no browser-side request) and the Pinia `site` store is populated
 * before hydration — consumers read `useSiteStore().siteSettings` directly.
 */

import { getApiBase, getHostname, forwardHostHeaders } from "@/lib/domain";
import { withServerCache } from "@/lib/serverCache";
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
  // Forward the visitor's host so the multi-tenant backend returns THIS site's
  // settings on SSR (direct fetch bypasses the host-setting Nitro proxy).
  const hostHeaders = forwardHostHeaders();
  try {
    // Per-isolate cache (60 s) — public CMS data, no per-user filtering, so a
    // raw $fetch (no forwarded cookie) is fine.
    const list = await withServerCache<SiteSettingItem[] | null>(
      `site-settings:${getHostname()}`,
      60 * 1000,
      async () => {
        const res = await $fetch<{ data?: SiteSettingItem[] } | SiteSettingItem[]>(
          `${apiBase}/site/settings`,
          { headers: hostHeaders },
        );
        if (Array.isArray(res)) return res;
        return res && typeof res === "object" && Array.isArray(res.data)
          ? res.data
          : null;
      },
    );

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
