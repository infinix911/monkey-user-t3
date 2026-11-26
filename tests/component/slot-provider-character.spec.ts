// @vitest-environment node
/**
 * Slot cards show their provider's own character (CDN art, as in jaeisol t3), found
 * by lobby name first like the logos; everything else keeps the numbered pool.
 */
import { describe, expect, it } from "vitest";
import {
  SLOT_CHARACTER_BASE,
  resolveLobbyCharacter,
  slotCharacterUrl,
} from "../../app/utils/homepageLobbyAssets";
import { cdn } from "../../app/utils/assetUrl";

const own = (file: string) => cdn(`${SLOT_CHARACTER_BASE}/${encodeURIComponent(file)}.webp`);

/** Files in the CDN folder (same set banana-jaeisol-t3-nuxt serves). */
const CDN_FILES = new Set(["Big Time Gaming", "Blueprint", "BNG", "Booming", "CosmoPlay", "CQ9", "Evoplay", "Habanero", "Hacksaw", "JDB", "JILI", "Joker", "Micro Gaming Slots", "Naga", "Netent", "NextSpin", "No Limity City", "Octoplay", "OneTouch", "Oriental Slots", "PG Soft", "Play N Go", "Playtech", "Pragmatic Slots", "Quickspin", "Red Tiger", "Relax", "Skywind Slots", "Slotmill", "Smartsoft", "Spade Gaming", "VA Gaming", "Wazdan", "Winfast", "Wonwon", "World Match", "YGGDrasil"]);
const POOL = "/designs/template-3/slots-character";

describe("slot provider characters", () => {
  it.each([
    ["PG Soft", "3", "PG Soft"],
    ["CQ9", "2", "CQ9"],
    ["JiLi", "9", "JILI"],
    ["Pragmatic Slots", "1", "Pragmatic Slots"],
    ["NolimitCity", "23", "No Limity City"],
    ["Booongo", "4", "BNG"],
    ["Micro Gaming Slots", "27", "Micro Gaming Slots"],
  ])("%s (code %s) uses %s.webp", (name, code, file) => {
    expect(slotCharacterUrl(name, code)).toBe(own(file));
  });

  it("every mapped character is a file in the CDN folder", () => {
    for (const name of ["PG Soft", "JiLi", "Pragmatic Slots", "NolimitCity", "Spade Slots", "Skywind Slots", "Oriental Slots"]) {
      const url = slotCharacterUrl(name);
      expect(url, name).toBeTruthy();
      const file = decodeURIComponent(url!.split("/").pop()!.replace(/.webp$/, ""));
      expect(CDN_FILES.has(file), file).toBe(true);
    }
  });

  it("falls back to the pool for providers without own art", () => {
    expect(resolveLobbyCharacter(POOL, "slot", 0, "id", undefined, { name: "Amusnet", code: "18" })).toBe(`${POOL}/01.webp`);
  });

  it("never borrows a character through a colliding code", () => {
    // Slot code 19 is Amatic on the demo backend but Skywind's casino code.
    expect(slotCharacterUrl("Amatic", "19")).toBeUndefined();
  });

  it("a CMS override still wins", () => {
    expect(resolveLobbyCharacter(POOL, "slot", 0, "id", { id: "/custom.webp" }, { name: "PG Soft" })).toBe("/custom.webp");
  });

  it("casino and sports keep the pool", () => {
    expect(resolveLobbyCharacter("/c", "casino", 1, "id", undefined, { name: "PG Soft" })).toBe("/c/02.webp");
  });
});
