/**
 * Per-lobby corner badges for the provider cards (HomeGameCard).
 *
 * Some providers appear twice in the same lobby list — the same brand, but a
 * different table/odds setup — so the card art alone can't tell them apart.
 * This map pins a short label to those specific lobby ids; every surface that
 * renders HomeGameCard (homepage rows, /casino, /slots, /sports) picks it up.
 *
 * Keys are backend lobby UUIDs and are therefore deployment-specific: a lobby
 * that isn't listed simply renders no badge, so a stale id is inert rather than
 * breaking the card. If this outgrows a handful of entries it belongs in the
 * CMS site-config payload instead.
 */
const LOBBY_BADGES: Record<string, string> = {
  // Evolution — the 1:10 table, distinguishing it from the standard Evolution
  // lobby that sits next to it in the casino list.
  "8f02de81-9fdd-44b0-9115-1e8e96268a41": "1:10",
};

/** Badge label for a lobby id, or "" when the lobby has none. */
export function getLobbyBadge(id: string | number | undefined | null): string {
  if (id === undefined || id === null) return "";
  return LOBBY_BADGES[String(id)] ?? "";
}
