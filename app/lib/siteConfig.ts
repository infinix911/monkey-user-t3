/**
 * Site Config Fetcher
 *
 * Reads a Worker-injected CMS snapshot or fetches /api/site/config/theme into
 * useState('userPageConfig'). Without a snapshot, app.vue fetches after mount
 * while the page renders its compiled fallback.
 *
 * Client localStorage provides a warm start while the API refreshes.
 */

import { logger } from "~/utils/logger";
import { useApi } from "@/composables/useApi";
import { takeThemePrefetch, takeThemePrefetchData } from "@/lib/theme-prefetch";
import { enforceThemeHttps as enforceHttps } from "~~/shared/utils/userpage-bootstrap";

const CLIENT_CACHE_KEY_PREFIX = "themeConfig.v2";

/**
 * Detects the `?themePreview=1` query flag in the browser.
 * Used to load the staged `domain=preview` theme config and bypass all
 * caches so preview data never leaks into normal sessions.
 */
export function isThemePreview(): boolean {
  if (typeof window !== "undefined") {
    return (
      new URLSearchParams(window.location.search).get("themePreview") === "1"
    );
  }
  return false;
}

function getHostname(): string {
  if (typeof window !== "undefined") return window.location.hostname;
  return "_default";
}

/**
 * Apply the theme response started by the static HTML (lib/theme-prefetch.ts)
 * synchronously, if it has already landed. Called by
 * plugins/theme-prefetch.client.ts before the app mounts, so the very first
 * render uses the CMS theme instead of the bundled default. `fetchSiteConfig()`
 * then finds the state populated and skips its own request.
 *
 * @returns {boolean} True when a theme was applied.
 */
export function applyThemePrefetchIfReady(): boolean {
  if (!import.meta.client || isThemePreview()) return false;
  const data = takeThemePrefetchData();
  if (data === undefined || data === null) return false;
  const merged = enforceHttps(data);
  useState<unknown>("userPageConfig", () => null).value = merged;
  useState<string | null>("siteConfigError", () => null).value = null;
  try {
    localStorage.setItem(`${CLIENT_CACHE_KEY_PREFIX}:${getHostname().toLowerCase()}`, JSON.stringify(merged));
  } catch {
    // Ignore quota errors
  }
  return true;
}

export const fetchSiteConfig = async (options?: {
  maxRetries?: number;
  timeout?: number;
}) => {
  const apiData = useState<unknown>("userPageConfig", () => null);
  const configError = useState<string | null>("siteConfigError", () => null);

  // Already populated (payload hydration or previous call) — skip refetch
  if (apiData.value || !isThemePreview() && useState("siteBootstrapLoaded", () => false).value) return apiData.value;

  const host = getHostname();
  const clientCacheKey = `${CLIENT_CACHE_KEY_PREFIX}:${host.toLowerCase()}`;
  // Preview mode (`?themePreview=1`): load the staged `domain=preview` config
  // and bypass every cache layer so staged data never poisons normal sessions.
  const isPreview = isThemePreview();

  // Client: warm-start from localStorage so the page renders with the last
  // known config before the network request resolves (prevents PageLoader
  // flash on reloads like login → window.location.reload()).
  // Skipped in dev so stale pre-merge data doesn't override fresh API output.
  if (import.meta.client && !import.meta.dev && !isPreview) {
    try {
      const cached = localStorage.getItem(clientCacheKey);
      if (cached) {
        apiData.value = JSON.parse(cached);
        configError.value = null;
        // Fall through to refresh in the background
      }
    } catch {
      // Ignore quota/parse errors
    }
  }

  const MAX_RETRIES = options?.maxRetries ?? 3;
  const RETRY_DELAY = 1500;
  const REQUEST_TIMEOUT = options?.timeout ?? 10000;
  const api = useApi();

  const applyTheme = (theme: unknown) => {
    const merged = enforceHttps(theme);
    apiData.value = merged;
    configError.value = null;

    if (import.meta.client && !isPreview) {
      try {
        localStorage.setItem(clientCacheKey, JSON.stringify(merged));
      } catch {
        // Ignore quota errors
      }
    }

    return apiData.value;
  };

  // The static HTML fired this request before the JS bundle loaded (see
  // lib/theme-prefetch.ts), so on a cold visit it has usually already landed
  // and the app never paints the bundled default theme. Only the first call
  // gets it; if it failed, fall through to the normal request below.
  const early = import.meta.client && !isPreview ? takeThemePrefetch() : undefined;
  if (early) {
    try {
      return applyTheme(await Promise.race([
        early,
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("theme prefetch timeout")), REQUEST_TIMEOUT),
        ),
      ]));
    } catch (err) {
      logger.warn("[siteConfig] Early theme request failed; refetching:", err);
    }
  }

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const theme = await api<unknown>(
        isPreview ? "/site/config/theme?domain=preview" : "/site/config/theme",
        { timeout: REQUEST_TIMEOUT },
      );
      return applyTheme(theme);
    } catch (err) {
      logger.error(
        `[siteConfig] Fetch attempt ${attempt}/${MAX_RETRIES} failed:`,
        err,
      );
      if (attempt < MAX_RETRIES) {
        await new Promise((resolve) =>
          setTimeout(resolve, RETRY_DELAY * attempt),
        );
      }
    }
  }

  // All retries failed. If we had a client cache hit, keep serving it.
  if (apiData.value) return apiData.value;

  // Do not write bundled defaults into the raw API state. The SPA's effective
  // config already starts from those defaults; keeping this null lets a later
  // background retry recover instead of treating fallback data as a cache hit.
  configError.value = "Failed to refresh site configuration.";

  return apiData.value;
};
