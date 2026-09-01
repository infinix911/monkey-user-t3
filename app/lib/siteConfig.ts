/**
 * Site Config Fetcher
 *
 * Fetches /api/site/config/userpage and stores the response in
 * useState('userPageConfig'). Called from app.vue via useAsyncData so the
 * page can render with its compiled fallback while this refreshes.
 *
 * Client localStorage provides a warm start while the API refreshes.
 */

import { useApi } from "@/composables/useApi";

const CLIENT_CACHE_KEY_PREFIX = "themeConfig.v2";

/**
 * Recursively upgrades any http:// URLs to https:// in the config object.
 * Prevents mixed-content warnings and HTTPS Lighthouse failures caused by
 * the backend/CMS returning plain-HTTP CDN links.
 */
function enforceHttps(obj: unknown): unknown {
  if (typeof obj === "string") {
    return obj.startsWith("http://") ? obj.replace("http://", "https://") : obj;
  }
  if (Array.isArray(obj)) return obj.map(enforceHttps);
  if (obj && typeof obj === "object") {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(obj)) {
      out[key] = enforceHttps((obj as Record<string, unknown>)[key]);
    }
    return out;
  }
  return obj;
}

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

export const fetchSiteConfig = async (options?: {
  maxRetries?: number;
  timeout?: number;
}) => {
  const apiData = useState<unknown>("userPageConfig", () => null);
  const configError = useState<string | null>("siteConfigError", () => null);

  // Already populated (payload hydration or previous call) — skip refetch
  if (apiData.value) return apiData.value;

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

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const theme = await api<unknown>(
        isPreview ? "/site/config/theme?domain=preview" : "/site/config/theme",
        { timeout: REQUEST_TIMEOUT },
      );
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
    } catch (err) {
      console.error(
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
