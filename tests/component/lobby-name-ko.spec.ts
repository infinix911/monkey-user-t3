/**
 * Every lobby name a bet / lobby row can carry must render in Korean.
 *
 * The betting report's 룸 column, the game cards' lobby line and the lobby
 * fallback card all pass the API's English lobby name through
 * `providerDisplayName(t, te, null, name)`. This runs that against the real
 * `ko.json`, so a lobby without a Korean entry fails here instead of showing
 * English to a member.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { providerDisplayName } from "~/utils/gameProviderLogo";

const ko = JSON.parse(
  readFileSync(resolve(__dirname, "../../i18n/locales/ko.json"), "utf8"),
) as Record<string, unknown>;

/** Look up a dotted key in the locale tree. */
function get(key: string): unknown {
  return key
    .split(".")
    .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], ko);
}
const te = (key: string): boolean => typeof get(key) === "string";
const t = (key: string): string => String(get(key));

/** Lobby names seen in bet / wallet data (demomonkey, 2026-10-01). */
const SEEN_IN_DATA = [
  "BNG", "CQ9", "Evolution", "Evoplay", "JDB", "Joker", "Micro Gaming Slots",
  "Oriental Gaming", "Oriental Slots", "PG Soft", "Play N Go", "Pragmatic Play Live",
  "Pragmatic Slots", "Wazdan", "World Match", "YGGDrasil", "Evolution 1:1", "Evolution 1:10",
];

/** Current lobby names (`GET /api/games/lobbies`, 2026-10-01). */
const CURRENT_LOBBIES = [
  "Pragmatic", "Dream Gaming", "Asia Gaming", "Big Gaming", "Microgaming", "Playtech", "Bota",
  "WM", "Sexy Gaming", "AllBet", "Skywind", "Motivation", "SA Gaming", "GPI", "Pretty Gaming",
  "Dowinn", "Cyberbetx", "Habanero", "GMW", "Blueprint", "Nolimit City", "Relax", "Gameart",
  "Playstar", "Hacksaw", "Booming", "Expanse", "Octoplay", "Avatar UX", "Slotmill",
  "Peter & Sons", "Reelplay", "Fantasma", "4 The Player", "Thunderkick", "Slot Matrix",
  "Funky Games", "OneTouch", "Revolver", "Rubyplay", "1x2 Gaming", "Kalamba", "Smartsoft",
  "Dragoonsoft", "Endorphina", "Ftg", "Aspect", "Naga", "Advantplay", "Simpleplay", "FC",
  "IDG", "9G", "Reevo", "Yellowbat", "Croco", "Belatra", "BT1 Sports",
];

/** Brands the approved Korean list writes in Latin letters. */
const SAME_IN_KOREAN = new Set(["JDB", "WM", "GPI", "GMW", "IDG", "9G", "FTG", "BNG", "CQ9"]);

/** A label is Korean when it contains Hangul (`PG소프트`, `BT1 스포츠` count). */
const HANGUL = /[가-힣]/;

describe("lobby names under ko", () => {
  it("has a Korean name for every lobby name", () => {
    const untranslated = [...SEEN_IN_DATA, ...CURRENT_LOBBIES]
      .map((name) => [name, providerDisplayName(t, te, null, name)] as const)
      .filter(([, label]) => !HANGUL.test(label) && !SAME_IN_KOREAN.has(label.toUpperCase()))
      .map(([name, label]) => `${name} → ${label}`);
    expect(untranslated).toEqual([]);
  });

  it("names both Evolution stake lobbies", () => {
    expect(providerDisplayName(t, te, null, "Evolution 1:1")).toBe("에볼루션 1:1");
    expect(providerDisplayName(t, te, null, "Evolution 1:10")).toBe("에볼루션 1:10");
  });

  it("translates the names the betting report shows most", () => {
    expect(providerDisplayName(t, te, null, "Pragmatic Slots")).toBe("프라그마틱 슬롯");
    expect(providerDisplayName(t, te, null, "Evolution")).toBe("에볼루션");
  });
});
