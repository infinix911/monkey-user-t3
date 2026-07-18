/**
 * Game tab configuration and types
 * Shared across game components (2D, 4D, etc.)
 */

// Base game tabs used in most components
export type BaseGameTabId = "DISKON" | "BB" | "FULL";

// Extended type that includes PRIZE123 for special pool types
export type GameTabId = BaseGameTabId | "PRIZE123";

export interface GameTab {
  id: GameTabId;
  label: string;
}

export const GAME_TABS: readonly GameTab[] = [
  { id: "DISKON", label: "BET DISKON" },
  { id: "FULL", label: "BET FULL" },
  { id: "BB", label: "BET BB" },
] as const;

/**
 * Bet type mapping for API submission
 */
export const BET_TYPE_MAP: Record<GameTabId, string> = {
  DISKON: "BET DISKON",
  BB: "BET BB",
  FULL: "BET FULL",
  PRIZE123: "BET PRIZE123",
} as const;

/**
 * Gets the bet type string for API submission based on tab ID
 * @param tabId - The game tab ID (BaseGameTabId or GameTabId)
 * @returns The bet type string for API submission
 */
export function getBetType(
  tabId: BaseGameTabId | GameTabId,
): "BET DISKON" | "BET BB" | "BET FULL" | "PRIZE_123" {
  if (tabId === "PRIZE123") {
    return "PRIZE_123";
  }
  return (
    (BET_TYPE_MAP[tabId as BaseGameTabId] as
      | "BET DISKON"
      | "BET BB"
      | "BET FULL") || "BET DISKON"
  );
}
