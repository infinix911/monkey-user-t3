/** Public theme resolved during SSR and reused during hydration. */
import { useApi } from "@/composables/useApi";
import { enforceThemeHttps } from "~~/shared/utils/theme-utils";

export function isThemePreview(): boolean {
  return import.meta.server ? useRequestURL().searchParams.get("themePreview") === "1"
    : new URLSearchParams(window.location.search).get("themePreview") === "1";
}

export const fetchSiteConfig = async (options?: { maxRetries?: number; timeout?: number }) => {
  const apiData = useState<unknown>("userPageConfig", () => null);
  const configError = useState<string | null>("siteConfigError", () => null);
  const loaded = useState("siteThemeLoaded", () => false);

  if (loaded.value || apiData.value) return apiData.value;
  const api = useApi();
  const preview = isThemePreview();
  const attempts = import.meta.server ? 1 : options?.maxRetries ?? 3;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const theme = await api<unknown>(preview ? "/site/config/theme?domain=preview" : "/site/config/theme", { timeout: options?.timeout ?? 10000 });
      apiData.value = enforceThemeHttps(theme);
      configError.value = null;
      loaded.value = true;
      return apiData.value;
    } catch {
      if (attempt < attempts) await new Promise((resolve) => setTimeout(resolve, 1500 * attempt));
    }
  }
  configError.value = "Failed to refresh site configuration.";
  return apiData.value;
};
