import { getApiBase } from "@/lib/domain";

export interface PopupBanner {
  id: number;
  title: string;
  image: string;
  sort: number;
  updated_at: string;
}

/**
 * Shared popup-banner read. Keeping it outside the layout lets the initial
 * bootstrap start it with the other public CMS requests instead of leaving an
 * untracked request behind the first paint.
 */
export function usePopupBanners() {
  const banners = useState<PopupBanner[]>("site-popup-banners", () => []);
  const loaded = useState("site-popup-banners-loaded", () => false);

  const fetchPopupBanners = async (): Promise<PopupBanner[]> => {
    if (loaded.value) return banners.value;

    try {
      const response = await $fetch<{ data?: PopupBanner[] } | PopupBanner[]>(
        `${getApiBase()}/site/banners/popup`,
        { timeout: 10000 },
      );
      banners.value = Array.isArray(response)
        ? response
        : Array.isArray(response?.data)
          ? response.data
          : [];
    } catch {
      banners.value = [];
    } finally {
      loaded.value = true;
    }

    return banners.value;
  };

  return { banners, loaded, fetchPopupBanners };
}
