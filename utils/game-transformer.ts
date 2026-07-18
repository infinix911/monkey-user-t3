import type { Game, GameItem } from "~/interfaces/game.interface";

/**
 * Transform a raw Game API response into a GameItem for display
 * @param game - Raw game data from API
 * @param backendUrl - Backend base URL for relative image paths (optional)
 * @param defaultImage - Fallback image path when game_img is missing (from siteConfig.assets.images.defaultThumbnail)
 */
export function transformGame(
  game: Game,
  backendUrl?: string,
  defaultImage: string = "/images/default.png",
): GameItem {
  // Convert relative image URLs to absolute URLs
  let gameImg = game.game_img;

  // Use default image if game_img is null, undefined, empty, or "NULL"/"null"
  if (
    !gameImg ||
    gameImg === "null" ||
    gameImg === "NULL" ||
    gameImg.trim() === ""
  ) {
    gameImg = defaultImage;
  } else if (!gameImg.startsWith("http")) {
    // If it's a relative URL, prepend the backend URL
    const base = backendUrl;
    gameImg = `${base}${gameImg.startsWith("/") ? "" : "/"}${gameImg}`;
  }

  return {
    code: String(game.id),
    name_en: game.game_name_en,
    name_ko: game.game_name_ko,
    name: game.game_name_en || game.game_name_ko,
    provider: game.lobby,
    lobbyId: game.lobby_id,
    type: game.game_type,
    subgames: false,
    sort: game.sort,
    game_img: gameImg,
  };
}
