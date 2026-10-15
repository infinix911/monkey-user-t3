import { isThemePreview } from "@/lib/siteConfig";
import { syncSiteConfig } from "@/composables/useSiteConfig";
import { useSiteStore } from "@/stores/site";
import { enforceThemeHttps, isUserpageBootstrap, type WindowSiteBootstrap } from "~~/shared/utils/userpage-bootstrap";

declare global {
  interface Window { __SITE_BOOTSTRAP__?: WindowSiteBootstrap }
}

/** Apply before rendering; a published null theme is a loaded bundled fallback. */
export function applySiteBootstrap(): boolean {
  if (!import.meta.client || isThemePreview()) return false;
  const bootstrap = window.__SITE_BOOTSTRAP__;
  if (!isUserpageBootstrap(bootstrap) || typeof bootstrap.customScriptsInjected !== "boolean") return false;
  const theme = enforceThemeHttps(bootstrap.theme);
  useState<unknown>("userPageConfig", () => null).value = theme;
  useState<string | null>("siteConfigError", () => null).value = null;
  useState("siteBootstrapLoaded", () => false).value = true;
  syncSiteConfig(theme);
  useSiteStore().setCustomScripts(bootstrap.customScripts, bootstrap.customScriptsInjected);
  try {
    const cacheKey = `themeConfig.v2:${window.location.hostname.toLowerCase()}`;
    if (theme === null) localStorage.removeItem(cacheKey);
    else localStorage.setItem(cacheKey, JSON.stringify(theme));
  } catch {
    // Storage is optional; the published snapshot is already in Nuxt state.
  }
  return true;
}
