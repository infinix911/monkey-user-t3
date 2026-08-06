/**
 * Route → banner page key.
 *
 * Banners are scoped in the CMS by a `page` value, so each category page can
 * carry its own creative instead of sharing one. The keys use the lobby
 * `gameType` vocabulary already used by /games/lobbies, the nav config and
 * useGameCategoryAvailability — hence `slot` for `/slots` and `sport` for
 * `/sports`, rather than a second spelling of the same categories.
 */

/** Every page that owns a banner slot. Mirrors the API's allowed values. */
export type BannerPageKey =
  | "homepage"
  | "hot"
  | "slot"
  | "casino"
  | "sport"
  | "mini"
  | "virtual";

/**
 * Unlocalised route path → page key. `/slot-rtp` is deliberately absent: it
 * keeps its own hardcoded banner and is not CMS-driven.
 */
const ROUTE_TO_PAGE: Record<string, BannerPageKey> = {
  "/": "homepage",
  "/hot": "hot",
  "/slots": "slot",
  "/casino": "casino",
  "/sports": "sport",
  "/mini": "mini",
  "/virtual": "virtual",
};

/** The unlocalised routes that own a banner slot, for callers to iterate. */
export const BANNER_PAGE_ROUTES = Object.keys(ROUTE_TO_PAGE);

/**
 * Resolve the banner page key for a route, or null when the page has no
 * CMS-driven banner slot (every other route, including /slot-rtp).
 *
 * @param path - Unlocalised route path, e.g. one of {@link BANNER_PAGE_ROUTES}.
 */
export function pageBannerKey(path: string): BannerPageKey | null {
  // Trailing slashes only matter for the non-root paths; "/" is already bare.
  const normalized = path.length > 1 ? path.replace(/\/+$/, "") : path;
  return ROUTE_TO_PAGE[normalized] ?? null;
}
