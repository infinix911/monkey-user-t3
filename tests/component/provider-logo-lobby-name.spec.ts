// @vitest-environment node
/**
 * Provider logos resolve from the lobby NAME before the numeric code.
 *
 * A backend can number slot providers from 1 while the casino list already
 * owns those numbers (demo backend: slot 2 = CQ9, casino 2 = Big Gaming), so a
 * code-only lookup put another provider's logo on the card.
 */
import { describe, expect, it } from "vitest";
import {
  EVOLUTION_HIGH_STAKES_LOBBY_ID,
  getLogoImages,
  getProviderNameFromLobbyName,
} from "../../app/utils/gameProviderLogo";

const logo = (name: string) => `/designs/game_logo/${encodeURIComponent(name)}.webp`;

describe("provider logo by lobby name", () => {
  it.each([
    ["2", "CQ9", "CQ9"],
    ["3", "PG Soft", "PG Soft"],
    ["9", "JiLi", "JiLi"],
    ["23", "NolimitCity", "Nolimit City"],
    ["25", "RedTiger", "Red Tiger"],
    ["10", "DreamGaming", "Dream Gaming"],
    ["4", "Booongo", "BNG"],
    ["1", "Pragmatic Slots", "Pragmatic"],
    ["27", "Micro Gaming Slots", "MG"],
    ["26", "Reel Studio", "Reel Studio"],
  ])("slot code %s named %s uses the %s logo", (code, name, expected) => {
    expect(getLogoImages(code, "lobby", true, name)).toBe(logo(expected));
  });

  it("never borrows another provider's logo through a colliding code", () => {
    // casino 11 = Live 88, casino 19 = Skywind on the same backend.
    expect(getLogoImages("11", "lobby", true, "PlayAce")).toBe(logo("PlayAce"));
    expect(getLogoImages("19", "lobby", true, "Amatic")).toBe(logo("Amatic"));
  });

  it("falls back to the code when the name is unknown", () => {
    expect(getLogoImages("28", "lobby", true, "Pragmatic Play Live")).toBe(logo("Pragmatic"));
    expect(getLogoImages("44", "lobby", true, "Some New Lobby")).toBe(logo("SA Gaming"));
  });

  it("keeps the code-only behaviour when no name is passed", () => {
    expect(getLogoImages("2")).toBe(logo("Big Gaming"));
  });

  it("returns nothing for an unknown name and code", () => {
    expect(getLogoImages("999", "lobby", true, "Unknown Studio")).toBe("");
    expect(getProviderNameFromLobbyName("")).toBeUndefined();
  });

  it("keeps the Evolution stakes variants", () => {
    expect(getLogoImages("31", EVOLUTION_HIGH_STAKES_LOBBY_ID, true, "Evolution 1:10")).toBe(logo("Evolution10"));
    expect(getLogoImages("31", "other", true, "Evolution")).toBe(logo("Evolution1"));
    expect(getLogoImages("31", "other", false, "Evolution")).toBe(logo("Evolution"));
  });
});
