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
 * `bg_casino`. A provider the API serves under ONE code points at that code's
 * `game.providers.<code>` entry, so each name is translated once. Brands the
 * API names identically for casino and slot (`Pragmatic`, `Skywind`, …) keep a
 * generic camelCase key, since the name alone cannot pick a lobby.
 *
 * Providers absent from this table have no localised trade name and
 * deliberately fall back to their Latin brand.
 */
const PROVIDER_NAME_KEYS: Record<string, string> = {
    AllBet: "allbet_casino",
    Asiangaming: "asianGaming",
    Betgames: "betgames",
    "Big Gaming": "bg_casino",
    "Big Time Gaming": "bigTimeGaming",
    Blueprint: "blueprint_slot",
    CQ9: "cq9_slot",
    "Dream Gaming": "dg_casino",
    EEAI: "eeai",
    "Emperor Gaming": "emperorGaming",
    Evolution: "evolution_casino",
    Ezugi: "ezugi",
    Habanero: "habanero_slot",
    Hacksaw: "hacksaw_slot",
    JiLi: "jili",
    "Live 88": "live88",
    Microgaming: "microgaming",
    Netent: "netent",
    "Nolimit City": "nolimit_slot",
    Oriental: "orientalGaming",
    "PG Soft": "pgsoft_slot",
    "Play N Go": "playngo_slot",
    Playtech: "playtech",
    Pragmatic: "pragmatic",
    "Pretty Gaming": "prettygaming_casino",
    Quickspin: "quickspin",
    "Red Tiger": "redTiger",
    Relax: "relax_slot",
    "SA Gaming": "sa_casino",
    "Sexy Gaming": "sexybaccarat_casino",
    Skywind: "skywind",
    Winfinity: "winfinity",
    WM: "wm_casino",
    YGGDrasil: "yggdrasil_slot",
    Pinnacle: "pinnacle",
    Saba: "saba",
    SBO: "sbo",
    "BTI Sports": "bt1_sports",
    CMD: "cmd",
    Bota: "bota_casino",
    CreedRoomz: "creedRoomz",
    Cyberbetx: "cyberbetx_casino",
    Dowinn: "dowinn_casino",
    GPI: "gpi",
    "HO Gaming": "hoGaming",
    "Miki World": "mikiWorld",
    Motivation: "motivation_casino",
    Alize: "alize",
    Aviator: "aviator",
    Aviatrix: "aviatrix",
    "Fast Game": "fastGame",
    Spribe: "spribe",
    "Turbo Games": "turboGames",
    "4 The Player": "4theplayer_slot",
    "Avatar UX": "avatarux_slot",
    BNG: "bng_slot",
    Booming: "booming_slot",
    CosmoPlay: "cosmoPlay",
    Evoplay: "evoplay_slot",
    Expanse: "expanse_slot",
    Fantasma: "fantasma_slot",
    Gameart: "gameart_slot",
    GMW: "gmw_slot",
    JDB: "jdb_slot",
    Joker: "joker",
    Naga: "naga_slot",
    NextSpin: "nextSpin",
    Octoplay: "octoplay_slot",
    OneTouch: "onetouch_slot",
    "Peter & Sons": "peterandsons_slot",
    Playstar: "ps_slot",
    Reelplay: "reelplay_slot",
    Slotmill: "slotmill_slot",
    Smartsoft: "smartsoft_slot",
    "Spade Slots": "spadeSlots",
    "VA Gaming": "vaGaming",
    Wazdan: "wazdan_slot",
    Winfast: "winfast",
    Wonwon: "wonwon",
    "World Match": "worldMatch",
    "Fulla.Bet": "fullaBet",
    "Illustrative Analytics": "illustrativeAnalytics",
    "WS Sports": "wsSports",
    "Spribe Aviator": "spribeAviator",
    // `MG` is the canonical name for the `mg_slot` code only.
    MG: "mg_slot",
    // Lobby display names as the backend spells them. They are more specific
    // than the canonical provider (slots vs live, Evolution's 1:10 lobby), so
    // `providerDisplayName` tries them first. Punctuation in these names is
    // safe: only the key on the right becomes an i18n path.
    "Pragmatic Slots": "pragmatic_slot",
    "Pragmatic Play Live": "pragmatic_casino",
    "Evolution 1:10": "evolution1to10",
    "Evolution 1:1": "evolution1to1",
    "Micro Gaming Slots": "mg_slot",
    "Micro Gaming Live": "mg_casino",
    "Skywind Slots": "skywind_slot",
    "Skywind Live": "skywind_casino",
    "Oriental Gaming": "orientalGaming",
    "Oriental Slots": "og_slot",
    "No Limity City": "nolimit_slot",
    // Current lobby names (`GET /games/lobbies` gameName) that differ from the
    // logo-map display names above. Wallet-log game rows and other name-only
    // call sites carry just this name, so without these they rendered in
    // English. Each points at the per-code key the approved Korean list fills.
    "Asia Gaming": "asianGaming",
    Thunderkick: "thunderkick_slot",
    "Slot Matrix": "slotmatrix_slot",
    "Funky Games": "funkygames_slot",
    Revolver: "revolver_slot",
    Rubyplay: "rubyplay_slot",
    "1x2 Gaming": "1x2_slot",
    Kalamba: "kalamba_slot",
    Dragoonsoft: "dragoonsoft_slot",
    Endorphina: "endorphina_slot",
    Ftg: "ftg_slot",
    Aspect: "aspect_slot",
    Advantplay: "advantplay_slot",
    Simpleplay: "simpleplay_slot",
    FC: "fc_slot",
    Reevo: "reevo_slot",
    Yellowbat: "yellowbat_slot",
    Croco: "croco_slot",
    Belatra: "belatra_slot",
    "BT1 Sports": "bt1_sports",
};

/**
 * `PROVIDER_NAME_KEYS` keyed by lower-cased name, so a lobby spelled with
 * different casing (`Rubyplay` / `RubyPlay`, `Ftg` / `FTG`) still resolves.
 */
const PROVIDER_NAME_KEYS_LC: Record<string, string> = Object.fromEntries(
    Object.entries(PROVIDER_NAME_KEYS).map(([name, key]) => [name.toLowerCase(), key]),
);

/** Localised name for a display name in `PROVIDER_NAME_KEYS`, else `undefined`. */
function localisedByName(
    t: (key: string) => string,
    te: (key: string) => boolean,
    name?: string | null,
): string | undefined {
    const key = name ? PROVIDER_NAME_KEYS_LC[name.trim().toLowerCase()] : undefined;
    if (!key) return undefined;
    const full = `game.providers.${key}`;
    return te(full) ? t(full) : undefined;
}

/**
 * Localised provider display name.
 *
 * Reuses the SAME `gameProviderLogos.json` map the logo lookup already uses —
 * one provider table for this repo, not two. Falls back to the canonical brand
 * when a provider has no locale entry, and to `fallback` when the code maps to
 * no provider at all, so a raw `game.providers.x` key can never render.
 * A `fallback` that is itself a known lobby display name is localised first.
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
    // A per-code name (`game.providers.pragmatic_slot`) is the most
    // specific label there is — it tells the casino and slot lobbies of one
    // provider apart — so it beats both the lobby name and the brand.
    if (providerCode !== null && providerCode !== undefined) {
        const byCode = `game.providers.${String(providerCode).trim().toLowerCase()}`;
        if (te(byCode)) return t(byCode);
    }
    // A lobby display name passed as `fallback` (e.g. "Pragmatic Slots") is
    // more specific than the provider the code resolves to, so it wins.
    const byLobby = localisedByName(t, te, fallback);
    if (byLobby) return byLobby;
    const name = getProviderName(providerCode);
    if (!name) return fallback;
    return localisedByName(t, te, name) ?? name;
}
