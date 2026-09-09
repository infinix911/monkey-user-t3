/**
 * Provider-logo resolution by provider code (auto-imported).
 *
 * Logos under `public/designs/game_logo/` are named after the provider's
 * DISPLAY name (`AllBet.webp`), not its code — one asset serves every code the
 * backend uses for that provider. The backend hands out several codes per
 * provider (a slug per game type plus numeric ids that differ per integration),
 * so `app/data/gameProviderLogos.json` maps display name -> all known codes and
 * this module inverts it into a code -> name lookup.
 *
 * Deliberately separate from `lobbyLogoUrl` (homepageLobbyAssets.ts), which
 * resolves the older `<base>/<lobby-uuid>.webp` scheme still used by /sports.
 * ⚠ Those legacy `casino-logo/`, `slot-logo/` and `sport-logo/` folders no
 * longer exist — 8f0ae6f renamed their art into `game_logo/`. The bases in
 * `assets.homepage.gameLogos` (useDefaultThemeConfig.ts) still point at them, so
 * `lobbyLogoUrl` only ever resolves as a FALLBACK for codes this module cannot
 * map, and that fallback 404s. Cards degrade to the provider name as text.
 */
import providerLogos from "~/data/gameProviderLogos.json";

/** Public folder holding the display-name-keyed `.webp` provider logos. */
export const GAME_LOGO_BASE = "/designs/game_logo";

/** provider code (lowercased) -> display name, built once at module load. */
const CODE_TO_NAME: Record<string, string> = Object.fromEntries(
    (providerLogos as { name: string; codes: string[] }[]).flatMap((p) =>
        p.codes.map((code) => [code.trim().toLowerCase(), p.name] as const),
    ),
);

/**
 * Display name for a provider code, or `undefined` when the code is unknown.
 */
export function getProviderName(
    providerCode?: string | number | null,
): string | undefined {
    if (providerCode === null || providerCode === undefined) return undefined;
    return CODE_TO_NAME[String(providerCode).trim().toLowerCase()];
}

/**
 * Evolution ships two lobbies behind ONE provider code, so the code -> name
 * lookup alone gives both cards the same logo. The `Evolution1` / `Evolution10`
 * assets carry the stakes distinction in the artwork itself (the pill above the
 * wordmark), replacing the corner badge that used to mark them apart.
 *
 * That pill only earns its place while BOTH lobbies are on the board. When 1:10
 * is switched off the 1:1 card is the only Evolution card on screen, so a "1:1"
 * pill labels a distinction the player cannot see and invites them to hunt for
 * a sibling that is not there — `Evolution.webp`, the unpilled wordmark, is the
 * honest art for that case. See `useEvolutionStakes()`.
 */
export const EVOLUTION_PROVIDER_NAME = "Evolution";
export const EVOLUTION_HIGH_STAKES_LOBBY_ID =
    "8f02de81-9fdd-44b0-9115-1e8e96268a41";
const EVOLUTION_HIGH_STAKES_LOGO = "Evolution10"; // 고액배팅 (1:10)
const EVOLUTION_LOW_STAKES_LOGO = "Evolution1"; // 소액배팅 (1:1)
const EVOLUTION_PLAIN_LOGO = "Evolution"; // no stakes pill

/**
 * Logo URL for a provider code — e.g. `allbet_casino` -> `AllBet.webp`.
 * `lobbyId` is only consulted for Evolution, which needs a per-lobby variant.
 *
 * Returns `""` for unknown codes so callers can fall back (the game cards render
 * the provider name as text when the logo URL is empty or fails to load).
 * The name is URL-encoded because several display names contain spaces or `&`.
 *
 * @param {string | number | null} [providerCode] - Backend provider code.
 * @param {string | number | null} [lobbyId] - Lobby id; only read for Evolution.
 * @param {boolean} [highStakesVisible] - Whether Evolution's 1:10 lobby is also
 *   on the board. Defaults to `true`, which keeps the piled 1:1 art for callers
 *   that do not know — the previous behaviour.
 * @returns {string} Logo URL, or `""` when the code maps to no provider.
 */
export function getLogoImages(
    providerCode?: string | number | null,
    lobbyId?: string | number | null,
    highStakesVisible = true,
): string {
    const name = getProviderName(providerCode);
    if (!name) return "";

    // Scoped to Evolution on purpose: every other provider keeps the plain
    // display-name asset, so an unrecognised lobby id changes nothing.
    if (name === EVOLUTION_PROVIDER_NAME) {
        if (String(lobbyId) === EVOLUTION_HIGH_STAKES_LOBBY_ID) {
            return `${GAME_LOGO_BASE}/${EVOLUTION_HIGH_STAKES_LOGO}.webp`;
        }
        // The 1:1 card drops its pill when it has no sibling to contrast with.
        const variant = highStakesVisible
            ? EVOLUTION_LOW_STAKES_LOGO
            : EVOLUTION_PLAIN_LOGO;
        return `${GAME_LOGO_BASE}/${variant}.webp`;
    }

    return `${GAME_LOGO_BASE}/${encodeURIComponent(name)}.webp`;
}
