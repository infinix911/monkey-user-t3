/**
 * Homepage / lobby-page card art helpers (auto-imported).
 *
 * Provider logos are local files named by lobby UUID under
 * `siteConfig.assets.homepage.gameLogos.{casino,sports,slot}` — all `.webp`.
 * Character art is a fixed pool of generic numbered images (`NN.webp`, 1-based,
 * zero-padded) under `homepage.gameCharacters.*`; cards cycle through the pool
 * by their position in the row. A CMS-supplied per-lobby override map
 * (`homepage.gameCharacterOverrides.*`, keyed by lobby UUID) can pin a specific
 * character to a specific lobby — see `resolveLobbyCharacter`.
 *
 * Keep `HOMEPAGE_CHARACTER_COUNTS` in sync with the number of files in each
 * `public/designs/template-3/*-character/` folder.
 */
export const HOMEPAGE_CHARACTER_COUNTS: Record<string, number> = {
    casino: 32,
    sports: 20,
    slot: 40,
};

/** Local provider-logo URL, keyed by lobby UUID (`<base>/<id>.webp`). */
export function lobbyLogoUrl(logoBase: string, id: string | number): string {
    return `${logoBase}/${id}.webp`;
}

/**
 * Character-art URL for a card at `index` in its row. Cycles 1..N through the
 * section's generic pool (`<base>/NN.webp`), so every card always resolves to
 * an existing file regardless of how many lobbies the API returns.
 */
export function lobbyCharacterUrl(
    charBase: string,
    gameType: string,
    index: number,
): string {
    const count = HOMEPAGE_CHARACTER_COUNTS[gameType] ?? 10;
    const n = (index % count) + 1;
    return `${charBase}/${String(n).padStart(2, "0")}.webp`;
}

/**
 * Character-art URL for a lobby: a per-lobby CMS override when one exists for
 * `lobbyId`, otherwise the cycled generic pool image (`lobbyCharacterUrl`).
 */
export function resolveLobbyCharacter(
    charBase: string,
    gameType: string,
    index: number,
    lobbyId: string | number,
    overrides?: Record<string, string>,
): string {
    const custom = overrides?.[String(lobbyId)];
    return custom && custom.length > 0
        ? custom
        : lobbyCharacterUrl(charBase, gameType, index);
}
