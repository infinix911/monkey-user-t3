/**
 * Resolves the "stone" badge image shown beside a user's balance.
 *
 * Member levels were removed from the database, so the session response carries
 * no level and there is nothing left to map: this returns the gold stone for
 * everyone. Kept as a composable (rather than inlining the asset) so the badge
 * has one source of truth if levels ever come back — it would go back to
 * keying `siteConfig.assets.images.<level>` off the level name here.
 */
import { computed, type ComputedRef } from "vue";

export const useLevelStone = (): ComputedRef<string> => {
  const siteConfig = useSiteConfig();

  return computed(() => {
    const images = siteConfig.assets.images as unknown as Record<string, string>;
    return images.gold || "";
  });
};
