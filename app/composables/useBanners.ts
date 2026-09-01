/**
 * Carousel banners (admin CMS — /site/banners-new/carousel)
 *
 * Loads every active banner (`?page=all`) once per client session. Pages then
 * filter the shared Pinia list by their own page key.
 */

import { getApiBase } from "@/lib/domain";
import { validateResponse } from "@/lib/validateResponse";
import {
  bannersCarouselResponseSchema,
  mapBannersCarouselResponse,
  type BannerCarouselItem,
} from "@/interfaces/site.interface";
import { useBannerStore } from "@/stores/banner";

/** Loader — call from useAsyncData in app.vue. Idempotent. */
export async function fetchBanners(): Promise<BannerCarouselItem[]> {
  const store = useBannerStore();
  // Already hydrated (or already fetched this request) — never ask twice.
  if (store.loaded) return store.banners;

  const apiBase = getApiBase();
  try {
    const raw = await $fetch<unknown>(`${apiBase}/site/banners-new/carousel`, {
      query: { page: "all" },
    });

    const list = mapBannersCarouselResponse(
      validateResponse(bannersCarouselResponseSchema, raw, "/site/banners-new"),
    );
    store.setBanners(list);
    return list;
  } catch (err) {
    if (import.meta.dev) console.error("Failed to fetch banners:", err);
    // An empty list still marks the store loaded: the slot renders its empty
    // state rather than retrying per page, which would reintroduce the
    // per-navigation requests this exists to remove.
    store.setBanners([]);
    return [];
  }
}
