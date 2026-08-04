/**
 * Site content backend contracts (monkey-user-api /site).
 *
 * Most /site content endpoints return plain fields the components already read
 * (top lists: member/amount; banners/:type: title/image/sort). The carousel
 * banners endpoint is the exception — it returns camelCase URL fields that the
 * component consumes as snake_case, so it's normalized here.
 */

import { z } from "zod";

/** Wire shape of a carousel banner (getBannersSchema, /site/banners-new/:type). */
export const bannerCarouselWireSchema = z.object({
  mainUrl: z.string(),
  overlayUrl: z.string().nullable().optional(),
  mainUrlMobile: z.string(),
  overlayUrlMobile: z.string().nullable().optional(),
  // Slot shape, carried WITH the creative so the ratio can never disagree with
  // the artwork it describes. Optional: a backend predating per-banner ratios
  // omits it, and null means "inherit the theme value".
  aspectRatioDesktop: z.string().nullable().optional(),
  aspectRatioMobile: z.string().nullable().optional(),
  sort: z.number(),
});

/** The response is a bare array; tolerate a { data } envelope defensively. */
export const bannersCarouselResponseSchema = z.union([
  z.array(bannerCarouselWireSchema),
  z.object({ data: z.array(bannerCarouselWireSchema) }),
]);

/** Normalized carousel banner (snake_case) consumed by BannerPreview. */
export interface BannerCarouselItem {
  main_url: string;
  overlay_url: string | null;
  main_url_mobile: string;
  overlay_url_mobile: string | null;
  /** CSS aspect-ratio string; null falls back to the theme value. */
  aspect_ratio_desktop: string | null;
  aspect_ratio_mobile: string | null;
  sort: number;
}

export const mapBannerCarousel = (
  w: z.infer<typeof bannerCarouselWireSchema>,
): BannerCarouselItem => ({
  main_url: w.mainUrl,
  overlay_url: w.overlayUrl ?? null,
  main_url_mobile: w.mainUrlMobile,
  overlay_url_mobile: w.overlayUrlMobile ?? null,
  aspect_ratio_desktop: w.aspectRatioDesktop ?? null,
  aspect_ratio_mobile: w.aspectRatioMobile ?? null,
  sort: w.sort,
});

/** Validate + normalize the carousel banners response (array or { data }). */
export const mapBannersCarouselResponse = (
  raw: z.infer<typeof bannersCarouselResponseSchema>,
): BannerCarouselItem[] => {
  const list = Array.isArray(raw) ? raw : raw.data;
  return list.map(mapBannerCarousel);
};
