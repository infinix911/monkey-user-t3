/** Localized game-name fields returned by the public game catalogue. */
export interface LocalizedGameName {
  game_name_en?: string | null;
  game_name_ko?: string | null;
  name?: string | null;
}

/** Return a non-empty name while preserving its original display spelling. */
function usableName(value: string | null | undefined): string | undefined {
  return value && value.trim().length > 0 ? value : undefined;
}

/**
 * Resolve a game name from the active UI locale.
 *
 * Korean prefers `game_name_ko` and falls back to English. Every other locale
 * uses `game_name_en`; `name` remains a compatibility fallback for older rows.
 */
export function localizedGameName(game: LocalizedGameName, locale: string): string {
  const english = usableName(game.game_name_en) ?? usableName(game.name);
  if (locale === "ko") return usableName(game.game_name_ko) ?? english ?? "";
  return english ?? "";
}
