import { defineStore } from "pinia";
import { ref } from "vue";
import type { BannerCarouselItem } from "@/interfaces/site.interface";
import type { BannerPageKey } from "@/utils/pageBanner";

/**
 * Carousel banners — every active banner for the site, fetched ONCE.
 *
 * `/site/banners-new/carousel?page=all` returns the whole set with each record
 * tagged by the page slot it belongs to, so the app reads it a single time
 * during SSR (see `fetchBanners` in [[useBanners]], invoked from app.vue) and
 * every page filters the same hydrated list. Previously BannerPreview fetched
 * its own page's banners and refetched on each navigation, which cost one
 * request per page visited.
 *
 * State is public CMS content with no per-user filtering, so unlike the `site`
 * store it is NOT cleared on logout — there is nothing user-specific to leak.
 */
export const useBannerStore = defineStore("banner", () => {
  /** Every active carousel banner, all pages. */
  const banners = ref<BannerCarouselItem[]>([]);
  /**
   * Whether the one fetch has resolved — including when it resolved to an
   * empty list. Distinguishes "no banners" from "not fetched yet", which is
   * what stops a second request on client navigation.
   */
  const loaded = ref(false);

  const setBanners = (list: BannerCarouselItem[]) => {
    banners.value = list;
    loaded.value = true;
  };

  /**
   * Banners for one page slot, in render order.
   *
   * A record whose `page` matches nothing simply never renders, which is how a
   * malformed or unknown value degrades — it is not shown on the wrong page.
   */
  const bannersByPage = (page: BannerPageKey): BannerCarouselItem[] =>
    banners.value
      .filter((banner) => banner.page === page)
      .sort((a, b) => a.sort - b.sort);

  return { banners, loaded, setBanners, bannersByPage };
});
