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

/**
 * Locale-key segment for a provider display name, e.g. `Big Gaming` ->
 * `bigGaming`. Kept as an explicit table rather than a slug function because
 * the keys must match `game.providers.*` in the locale bundles exactly, and a
 * naive camelCase of `SA Gaming` gives `sAGaming`.
 *
 * Providers absent from this table have no localised trade name and
 * deliberately fall back to their Latin brand.
 */
const PROVIDER_NAME_KEYS: Record<string, string> = {
    AllBet: "allbet",
    Asiangaming: "asianGaming",
    Betgames: "betgames",
    "Big Gaming": "bigGaming",
    "Big Time Gaming": "bigTimeGaming",
    Blueprint: "blueprint",
    CQ9: "cq9",
    "Dream Gaming": "dreamGaming",
    EEAI: "eeai",
    "Emperor Gaming": "emperorGaming",
    Evolution: "evolution",
    Ezugi: "ezugi",
    Habanero: "habanero",
    Hacksaw: "hacksaw",
    JiLi: "jili",
    "Live 88": "live88",
    Microgaming: "microgaming",
    Netent: "netent",
    "Nolimit City": "nolimitCity",
    Oriental: "orientalGaming",
    "PG Soft": "pgSoft",
    "Play N Go": "playNGo",
    Playtech: "playtech",
    Pragmatic: "pragmatic",
    "Pretty Gaming": "prettyGaming",
    Quickspin: "quickspin",
    "Red Tiger": "redTiger",
    Relax: "relax",
    "SA Gaming": "saGaming",
    "Sexy Gaming": "sexyGaming",
    Skywind: "skywind",
    Winfinity: "winfinity",
    WM: "wm",
    YGGDrasil: "yggdrasil",
    Pinnacle: "pinnacle",
    Saba: "saba",
    SBO: "sbo",
    "BTI Sports": "btiSports",
    CMD: "cmd",
    Bota: "bota",
    CreedRoomz: "creedRoomz",
    Cyberbetx: "cyberbetx",
    Dowinn: "dowinn",
    GPI: "gpi",
    "HO Gaming": "hoGaming",
    "Miki World": "mikiWorld",
    Motivation: "motivation",
    Alize: "alize",
    Aviator: "aviator",
    Aviatrix: "aviatrix",
    "Fast Game": "fastGame",
    Spribe: "spribe",
    "Turbo Games": "turboGames",
    "4 The Player": "fourThePlayer",
    "Avatar UX": "avatarUx",
    BNG: "bng",
    Booming: "booming",
    CosmoPlay: "cosmoPlay",
    Evoplay: "evoplay",
    Expanse: "expanse",
    Fantasma: "fantasma",
    Gameart: "gameart",
    GMW: "gmw",
    JDB: "jdb",
    Joker: "joker",
    Naga: "naga",
    NextSpin: "nextSpin",
    Octoplay: "octoplay",
    OneTouch: "oneTouch",
    "Peter & Sons": "peterAndSons",
    Playstar: "playstar",
    Reelplay: "reelplay",
    Slotmill: "slotmill",
    Smartsoft: "smartsoft",
    "Spade Slots": "spadeSlots",
    "VA Gaming": "vaGaming",
    Wazdan: "wazdan",
    Winfast: "winfast",
    Wonwon: "wonwon",
    "World Match": "worldMatch",
    "Fulla.Bet": "fullaBet",
    "Illustrative Analytics": "illustrativeAnalytics",
    "WS Sports": "wsSports",
    "Spribe Aviator": "spribeAviator",
};

/**
 * Localised provider display name.
 *
 * Reuses the SAME `gameProviderLogos.json` map the logo lookup already uses —
 * one provider table for this repo, not two. Falls back to the canonical brand
 * when a provider has no locale entry, and to `fallback` when the code maps to
 * no provider at all, so a raw `game.providers.x` key can never render.
 *
 * @param {(key: string) => string} t - vue-i18n `t`.
 * @param {(key: string) => boolean} te - vue-i18n `te`.
 * @param {string | number | null} [providerCode] - Backend provider code.
 * @param {string} [fallback] - Text to show when the code is unknown.
 * @returns {string} Localised name, canonical brand, or `fallback`.
 */
export function providerDisplayName(
    t: (key: string) => string,
    te: (key: string) => boolean,
    providerCode?: string | number | null,
    fallback = "",
): string {
    const name = getProviderName(providerCode);
    if (!name) return fallback;
    const key = PROVIDER_NAME_KEYS[name];
    if (!key) return name;
    const full = `game.providers.${key}`;
    return te(full) ? t(full) : name;
}
