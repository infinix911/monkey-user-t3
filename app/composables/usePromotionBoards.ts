/**
 * Shared promotion-boards cache (`GET /promotions/boards`).
 *
 * PromotionContent used to fetch into local state on every mount, so each
 * open showed the 4-card skeleton and then resized to the real list. The list
 * now lives here: the Promotion modal / account panel prefetch it before they
 * are shown (see utils/firstPaintReady.ts), and a mount with cached boards
 * paints them immediately while refreshing in the background.
 */
import { logger } from "~/utils/logger";
import { useApi } from "@/composables/useApi";

export interface IPromotionBoard {
  id: string;
  order: number;
  thumbnail: string;
  description: string;
}

/** `null` until the first load settles (drives the skeleton). */
const boards = shallowRef<IPromotionBoard[] | null>(null);
let inflight: Promise<void> | null = null;

/**
 * Fetch the boards into the shared cache; concurrent calls share one request.
 *
 * @returns {Promise<void>} Resolves when the request settles (never rejects).
 */
export function loadPromotionBoards(): Promise<void> {
  if (inflight) return inflight;
  inflight = useApi()<IPromotionBoard[]>("/promotions/boards")
    .then((rows) => {
      boards.value = rows || [];
    })
    .catch((error: unknown) => {
      logger.error("Failed to fetch promotion boards:", error);
      if (boards.value === null) boards.value = [];
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

/**
 * Reactive view of the shared boards.
 *
 * @returns {object} `boards` (empty until loaded) and `isLoading` (true only
 *   before the first load settles).
 */
export function usePromotionBoards() {
  return {
    boards: computed(() => boards.value ?? []),
    isLoading: computed(() => boards.value === null),
  };
}
