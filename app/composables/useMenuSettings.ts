/**
 * Menu settings — derived from the theme doc's `assets.profileMenu`.
 *
 * The profile-menu config (visibility / page / order / icon) now lives inside
 * the theme document already loaded by fetchSiteConfig() (`/site/config/theme`)
 * and merged into useState('userPageConfig'). There is no separate HTTP call:
 * `useMenuSettings()` is a computed view over `useSiteConfig().assets.profileMenu`,
 * normalized to the legacy `MenuSetting` shape and sorted by page then sort.
 */

import type { ProfileMenuItem } from "@/composables/useDefaultThemeConfig";

export interface MenuSetting {
  item: string;
  enabled: boolean;
  page: number;
  sort: number;
  image: string;
}

/** Normalize one raw `assets.profileMenu` entry into a MenuSetting. */
function toMenuSetting(raw: unknown): MenuSetting | null {
  if (!raw || typeof raw !== "object") return null;
  const d = raw as Partial<ProfileMenuItem>;
  const item = typeof d.key === "string" ? d.key : "";
  if (!item) return null;
  return {
    item,
    enabled: Boolean(d.is_active),
    page: Number(d.page) || 1,
    sort: Number(d.sort) || 0,
    image: typeof d.image === "string" ? d.image : "",
  };
}

/**
 * Reactive accessor — derives the ordered menu settings from the resolved site
 * config. Returns `null` when no profile-menu array is present so consumers can
 * fall back to their bundled defaults.
 */
export const useMenuSettings = () => {
  const siteConfig = useSiteConfig();
  return computed<MenuSetting[] | null>(() => {
    const raw = siteConfig.assets?.profileMenu;
    if (!Array.isArray(raw)) return null;
    const parsed = raw
      .map(toMenuSetting)
      .filter((s): s is MenuSetting => s !== null);
    if (parsed.length === 0) return null;
    return parsed.sort((a, b) => a.page - b.page || a.sort - b.sort);
  });
};
