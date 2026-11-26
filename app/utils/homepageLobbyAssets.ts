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
import { cdn } from "~/utils/assetUrl";
import { getProviderName, getProviderNameFromLobbyName } from "~/utils/gameProviderLogo";
export const HOMEPAGE_CHARACTER_COUNTS: Record<string, number> = {
    casino: 32,
    sports: 20,
    slot: 40,
};

/**
 * Local provider-logo URL (`<base>/<key>.webp`).
 *
 * The key is the provider code where the asset has been named after it, and the
 * lobby UUID otherwise — logos are migrating from the UUID (which differs per
 * deployment for the same provider) to the code. `HomeGameCard` tries the code
 * first and falls back to the id, so both naming schemes resolve.
 */
export function lobbyLogoUrl(logoBase: string, key: string | number): string {
    return `${logoBase}/${key}.webp`;
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
 * Folder of slot characters drawn for one specific provider. Served from the
 * R2 asset CDN (`cdn()`), where the files already live — the same path
 * banana-jaeisol-t3-nuxt uses — so they are not copied into `public/`.
 */
export const SLOT_CHARACTER_BASE = "/designs/providers/slot-character";

/**
 * Provider display name (the logo names in `gameProviderLogos.json`) -> file in
 * `SLOT_CHARACTER_BASE`. Explicit rather than derived: several files are named
 * after the lobby, not the logo (`Pragmatic Slots`, `No Limity City`, `JILI`),
 * and static hosting is case-sensitive. Providers not listed have no own art and
 * fall back to the numbered pool. Add a provider by uploading its 480x627
 * `<Name>.webp` to that CDN folder and listing it here.
 */
const SLOT_CHARACTER_FILES: Record<string, string> = {
    "Big Time Gaming": "Big Time Gaming",
    Blueprint: "Blueprint",
    BNG: "BNG",
    Booming: "Booming",
    CosmoPlay: "CosmoPlay",
    CQ9: "CQ9",
    Evoplay: "Evoplay",
    Habanero: "Habanero",
    Hacksaw: "Hacksaw",
    JDB: "JDB",
    JiLi: "JILI",
    Joker: "Joker",
    MG: "Micro Gaming Slots",
    Microgaming: "Micro Gaming Slots",
    Naga: "Naga",
    Netent: "Netent",
    NextSpin: "NextSpin",
    "Nolimit City": "No Limity City",
    Octoplay: "Octoplay",
    OneTouch: "OneTouch",
    Oriental: "Oriental Slots",
    "PG Soft": "PG Soft",
    "Play N Go": "Play N Go",
    Playtech: "Playtech",
    Pragmatic: "Pragmatic Slots",
    Quickspin: "Quickspin",
    "Red Tiger": "Red Tiger",
    Relax: "Relax",
    Skywind: "Skywind Slots",
    Slotmill: "Slotmill",
    Smartsoft: "Smartsoft",
    "Spade Slots": "Spade Gaming",
    "VA Gaming": "VA Gaming",
    Wazdan: "Wazdan",
    Winfast: "Winfast",
    Wonwon: "Wonwon",
    "World Match": "World Match",
    YGGDrasil: "YGGDrasil",
};

/**
 * A slot provider's own character, found the same way as its logo (lobby name
 * first, then provider code — see `getLogoImages`). Undefined when the provider
 * has no own art, so the caller falls back to the numbered pool.
 */
export function slotCharacterUrl(
    lobbyName?: string | null,
    providerCode?: string | number | null,
): string | undefined {
    const name = getProviderNameFromLobbyName(lobbyName) ?? getProviderName(providerCode);
    const file = name ? SLOT_CHARACTER_FILES[name] : undefined;
    return file ? cdn(`${SLOT_CHARACTER_BASE}/${encodeURIComponent(file)}.webp`) : undefined;
}

/**
 * Character-art URL for a lobby, in order: a per-lobby CMS override for
 * `lobbyId`; for slot lobbies, the provider's own character
 * (`slotCharacterUrl`); otherwise the cycled generic pool image
 * (`lobbyCharacterUrl`). Casino and sports keep the pool, as in jaeisol t3.
 */
export function resolveLobbyCharacter(
    charBase: string,
    gameType: string,
    index: number,
    lobbyId: string | number,
    overrides?: Record<string, string>,
    provider?: { name?: string | null; code?: string | number | null },
): string {
    const custom = overrides?.[String(lobbyId)];
    if (custom && custom.length > 0) return custom;
    const own = gameType === "slot" ? slotCharacterUrl(provider?.name, provider?.code) : undefined;
    return own ?? lobbyCharacterUrl(charBase, gameType, index);
}
