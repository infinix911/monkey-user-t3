// Curated provider logos for the AppFooter marquees, grouped by category
// (12 casino / 12 slots / 8 sports, to keep the footer image count low).
//
// Keep these SAME-ORIGIN: AppFooter uses each image as a CSS mask for its shine
// effect, and the Linode bucket does not return the CORS headers CSS masks need.
//
// The assets are the display-name-keyed files under `public/designs/game_logo`
// — the same pool `getLogoImages()` resolves provider codes against, so there is
// one folder of provider art rather than two. This file used to list the old
// `casino-logo/`, `slot-logo/` and `sport-logo/` UUID filenames; commit 8f0ae6f
// renamed that art into `game_logo/<Display Name>.webp` and deleted the rest,
// which left every path here dead. A 404 does not fire the `load` event that
// AppFooter's `onLogoLoad` relies on to unhide a logo, so the rows rendered as
// blank bands — hence the names below rather than opaque ids: a missing file is
// now obvious on sight. AppFooter also hides any logo whose fetch fails, so a
// future rename degrades to a shorter row instead of empty space.
import { GAME_LOGO_BASE } from "~/utils/gameProviderLogo";

/** Display name -> URL. Encoded: several names contain spaces, which would
 *  otherwise break the unquoted `url()` in AppFooter's shine mask. */
const logoUrls = (names: readonly string[]): readonly string[] =>
  names.map((name) => `${GAME_LOGO_BASE}/${encodeURIComponent(name)}.webp`);

export const CASINO_LOGOS: readonly string[] = logoUrls([
  "Evolution",
  "Pragmatic",
  "Playtech",
  "Microgaming",
  "Ezugi",
  "AllBet",
  "Asiangaming",
  "Dream Gaming",
  "SA Gaming",
  "Sexy Gaming",
  "Big Gaming",
  "WM",
]);

export const SLOT_LOGOS: readonly string[] = logoUrls([
  "PG Soft",
  "Netent",
  "Play N Go",
  "Nolimit City",
  "Hacksaw",
  "Habanero",
  "Red Tiger",
  "Relax",
  "Quickspin",
  "Big Time Gaming",
  "YGGDrasil",
  "Blueprint",
]);

// Every sports logo the folder holds — there are only eight.
export const SPORT_LOGOS: readonly string[] = logoUrls([
  "BTI Sports",
  "CMD",
  "Fulla.Bet",
  "Illustrative Analytics",
  "Pinnacle",
  "Saba",
  "SBO",
  "WS Sports",
]);
