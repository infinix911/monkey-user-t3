/**
 * Drop fields that the frontend never reads from raw `/games` objects before
 * they're stored by `useAsyncData` and serialized into the SSR `__NUXT_DATA__`
 * payload.
 *
 * The backend returns each game with multilingual name fields, but every
 * component renders `game_name_en` only (HotGameCard, GameCard, SubGames) —
 * there is no `game_name_${locale}` dynamic access anywhere — so `game_name_ko`
 * is pure dead weight shipped on every game in the lobby payload. Stripping it
 * shrinks the serialized payload (≈108 occurrences on the homepage) with zero
 * functional change.
 *
 * Immutable: returns new objects, never mutates the fetched data. Nuxt
 * auto-imports `app/utils/`, so fetchers call `stripGamePayload(...)` directly.
 */

// Fields confirmed unused by any template/logic (only present in a type decl).
// Keep this list conservative — only add a key after grepping that nothing
// reads it, so the trim stays provably safe.
const UNUSED_GAME_FIELDS: ReadonlySet<string> = new Set(["game_name_ko"]);

export function stripGamePayload<T extends Record<string, unknown>>(
  games: readonly T[],
): T[] {
  return games.map((game) => {
    const out: Record<string, unknown> = {};
    for (const key in game) {
      if (!UNUSED_GAME_FIELDS.has(key)) out[key] = game[key];
    }
    return out as T;
  });
}
