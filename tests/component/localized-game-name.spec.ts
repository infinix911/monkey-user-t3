import { describe, expect, it } from "vitest";
import { localizedGameName } from "~/utils/localized-game-name";

describe("localizedGameName", () => {
  const game = {
    game_name_en: "English Game",
    game_name_ko: "한국 게임",
  };

  it("uses Korean only when the active locale is Korean", () => {
    expect(localizedGameName(game, "ko")).toBe("한국 게임");
    expect(localizedGameName(game, "en")).toBe("English Game");
  });

  it("falls back to English when the Korean name is missing or blank", () => {
    expect(localizedGameName({ ...game, game_name_ko: null }, "ko")).toBe("English Game");
    expect(localizedGameName({ ...game, game_name_ko: "  " }, "ko")).toBe("English Game");
  });

  it("supports legacy rows that expose only name", () => {
    expect(localizedGameName({ name: "Legacy Game" }, "en")).toBe("Legacy Game");
  });
});
