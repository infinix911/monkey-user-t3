/**
 * Provider-logo resolution by provider code (auto-imported).
 *
 * Logos under `public/designs/game-logo/` are named after the provider's
 * DISPLAY name (`AllBet.webp`), not its code — one asset serves every code the
 * backend uses for that provider. The backend hands out several codes per
 * provider (a slug per game type plus numeric ids that differ per integration),
 * so `app/data/gameProviderLogos.json` maps display name -> all known codes and
 * this module inverts it into a code -> name lookup.
 *
 * Deliberately separate from `lobbyLogoUrl` (homepageLobbyAssets.ts), which
 * resolves the older `<base>/<lobby-uuid>.webp` scheme still used by /sports and
 * the legacy casino-logo/slot-logo folders.
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
 * Logo URL for a provider code — e.g. `allbet_casino` -> `AllBet.webp`.
 *
 * Returns `""` for unknown codes so callers can fall back (the game cards render
 * the provider name as text when the logo URL is empty or fails to load).
 * The name is URL-encoded because several display names contain spaces or `&`.
 */
export function getLogoImages(providerCode?: string | number | null): string {
    const name = getProviderName(providerCode);
    return name ? `${GAME_LOGO_BASE}/${encodeURIComponent(name)}.webp` : "";
}
