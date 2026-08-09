/**
 * Carousel banners (admin CMS — /site/banners-new/carousel)
 *
 * One request for EVERY active banner (`?page=all`), pre-fetched server-side
 * from app.vue via useAsyncData so it lands in the SSR payload and the Pinia
 * `banner` store is populated before hydration. Pages then filter the hydrated
 * list by their own page key — see [[useBannerStore]] `bannersByPage`.
 *
 * Mirrors `fetchSiteSettings`: same server cache, same host forwarding, same
 * "resolve everything synchronously in setup" constraint.
 */

import { getApiBase, getHostname, forwardHostHeaders } from "@/lib/domain";
import { withServerCache } from "@/lib/serverCache";
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
  // Forward the visitor's host so the multi-tenant backend returns THIS site's
  // banners on SSR (this raw $fetch bypasses the host-setting Nitro proxy).
  const hostHeaders = forwardHostHeaders();
  try {
    // Public CMS data with no per-user filtering, so a raw $fetch (no cookie)
    // is safe to share through the server cache.
    const raw = await withServerCache<unknown>(
      `banners-carousel-all:${getHostname()}`,
      60 * 1000,
      // The response type is given explicitly (rather than inferred) for the
      // same reason the other loaders do it: an untyped $fetch on a template
      // -literal URL sends Nitro's route-matching types into an "excessive
      // stack depth" error. The shape is validated by zod below regardless.
      () =>
        $fetch<unknown>(`${apiBase}/site/banners-new/carousel`, {
          query: { page: "all" },
          headers: hostHeaders,
        }),
    );

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
