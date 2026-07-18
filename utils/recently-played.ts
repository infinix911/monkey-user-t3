import type { GameItem } from "~/interfaces/game.interface";

const MAX_RECENTLY_PLAYED = 20; // Maximum number of recently played games to store

export const saveGameToRecentlyPlayed = (game: GameItem): void => {
  try {
    const stored = localStorage.getItem("recentlyPlayedGames");
    let recentlyPlayedGames: GameItem[] = stored ? JSON.parse(stored) : [];

    // Remove the game if it already exists to avoid duplicates
    recentlyPlayedGames = recentlyPlayedGames.filter(
      (g) => g.code !== game.code,
    );

    // Add the new game to the beginning of the array
    recentlyPlayedGames.unshift(game);

    // Keep only the most recent games (limit to MAX_RECENTLY_PLAYED)
    recentlyPlayedGames = recentlyPlayedGames.slice(0, MAX_RECENTLY_PLAYED);

    // Save back to localStorage
    localStorage.setItem(
      "recentlyPlayedGames",
      JSON.stringify(recentlyPlayedGames),
    );

    // Dispatch custom event to notify components of the update
    window.dispatchEvent(new CustomEvent("recentlyPlayedUpdated"));
  } catch (error) {
    console.error("Error saving game to recently played:", error);
  }
};

export const getRecentlyPlayedGames = (): GameItem[] => {
  try {
    const stored = localStorage.getItem("recentlyPlayedGames");
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading recently played games:", error);
    return [];
  }
};

export const clearRecentlyPlayedGames = (): void => {
  try {
    localStorage.removeItem("recentlyPlayedGames");
  } catch (error) {
    console.error("Error clearing recently played games:", error);
  }
};
