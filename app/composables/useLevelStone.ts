/**
 * Resolves the level-matched "stone" badge image for the current user.
 *
 * Maps `authStore.user.level_name` (bronze, silver, gold, ruby, …) to the
 * matching `siteConfig.assets.images.<level>` asset, falling back to the gold
 * stone for unknown/empty levels. `diamond` maps to the `diamonds` asset key.
 *
 * Single source of truth for the balance-pill stone shown in the homepage and
 * page headers ([[UserBalancePill]], AppHeader).
 */
import { computed, type ComputedRef } from "vue";

export const useLevelStone = (): ComputedRef<string> => {
  const authStore = useAuthStore();
  const siteConfig = useSiteConfig();

  return computed(() => {
    const name = (authStore.user.level_name || "").toLowerCase();
    const key = name === "diamond" ? "diamonds" : name;
    const images = siteConfig.assets.images as unknown as Record<string, string>;
    return images[key] || images.gold || "";
  });
};
