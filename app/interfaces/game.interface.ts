/**
 * Game interfaces
 * Migrated from banana-lucky-next/constants/index.ts
 */

import { z } from "zod";

// ===========================================================================
// Backend contracts + normalization (monkey-user-api /games, /games/lobbies)
//
// The API returns camelCase with UPPERCASE game types (e.g. "CASINO"). The
// wider app renders a mix of snake_case (game_name, game_img, lobby_id) and a
// few camelCase (gameType, lobbyId) fields. To avoid touching every template,
// the fetch points validate the wire shape with these zod schemas, then map to
// a normalized object that carries BOTH naming conventions and a lowercased
// game type. Anti-corruption boundary — keep schemas in lock-step with the
// server validators.
// ===========================================================================

/** Lowercase the (UPPERCASE) wire game type to the app's route convention. */
export const normalizeGameType = (v: string | null): string | null =>
  v == null ? v : v.toLowerCase();

/** Wire shape of a lobby row (getGameLobbiesSchema). */
export const gameLobbyWireSchema = z.object({
  id: z.string(),
  gameProvider: z.string().nullable(),
  gameType: z.string().nullable(),
  gameName: z.string().nullable(),
  hasSubGame: z.boolean(),
  sort: z.number().nullable(),
  isActive: z.boolean(),
});
export type GameLobbyWire = z.infer<typeof gameLobbyWireSchema>;
export const gameLobbiesResponseSchema = z.array(gameLobbyWireSchema);

/** Normalized lobby — snake_case + camelCase aliases the components read. */
export interface NormalizedLobby {
  id: string;
  sort: number | null;
  game_type: string | null;
  gameType: string | null;
  game_name: string | null;
  gameName: string | null;
  game_provider: string | null;
  gameProvider: string | null;
  has_sub_game: boolean;
  hasSubGame: boolean;
  is_active: boolean;
  isActive: boolean;
}

export const mapGameLobby = (w: GameLobbyWire): NormalizedLobby => {
  const gt = normalizeGameType(w.gameType);
  return {
    id: w.id,
    sort: w.sort,
    game_type: gt,
    gameType: gt,
    game_name: w.gameName,
    gameName: w.gameName,
    game_provider: w.gameProvider,
    gameProvider: w.gameProvider,
    has_sub_game: w.hasSubGame,
    hasSubGame: w.hasSubGame,
    is_active: w.isActive,
    isActive: w.isActive,
  };
};

/** Wire shape of a game-list row (getSubGamesSchema.data[]). */
export const gameListItemWireSchema = z.object({
  id: z.string(),
  lobby: z.string().nullable(),
  lobbyId: z.string().nullable(),
  gameType: z.string(),
  gameNameEn: z.string().nullable(),
  gameNameKo: z.string().nullable(),
  gameImg: z.string().nullable(),
  sort: z.number(),
  isNew: z.boolean(),
});
export type GameListItemWire = z.infer<typeof gameListItemWireSchema>;

/** Wire shape of the paginated games list response ({ data, meta }). */
export const gamesListResponseSchema = z.object({
  data: z.array(gameListItemWireSchema),
  meta: z.object({
    total: z.number(),
    page: z.number(),
    limit: z.number(),
    totalPages: z.number(),
  }),
});
export type GamesListWire = z.infer<typeof gamesListResponseSchema>;

/** Normalized game row — snake_case + camelCase aliases the components read. */
export interface NormalizedGame {
  id: string;
  lobby: string | null;
  lobby_id: string | null;
  lobbyId: string | null;
  game_type: string;
  gameType: string;
  game_name_en: string | null;
  game_name_ko: string | null;
  game_img: string | null;
  sort: number;
  is_new: boolean;
}

export const mapGameListItem = (w: GameListItemWire): NormalizedGame => {
  const gt = normalizeGameType(w.gameType) ?? w.gameType;
  return {
    id: w.id,
    lobby: w.lobby,
    lobby_id: w.lobbyId,
    lobbyId: w.lobbyId,
    game_type: gt,
    gameType: gt,
    game_name_en: w.gameNameEn,
    game_name_ko: w.gameNameKo,
    game_img: w.gameImg,
    sort: w.sort,
    is_new: w.isNew,
  };
};

export interface Game {
  id: number;
  lobby: string;
  lobby_id: number;
  game_type: string;
  game_name_en: string;
  game_name_ko: string;
  game_img: string;
  sort: number;
  is_new?: boolean;
}

export interface GamesResponse {
  pages: number;
  rows: number;
  data: Game[];
}

export interface GameItem {
  code: string;
  name: string;
  name_en: string;
  name_ko: string;
  provider: string;
  lobbyId?: number;
  type: "SLOT" | "LIVE" | "CASINO" | "SPORTS" | "HOTEL" | string;
  subgames: boolean;
  sort: number;
  game_img?: string;
}

export interface TopEntry {
  member: string;
  amount: string;
  currency: string;
}

export interface TopWinnersResponse {
  data: TopEntry[];
}

export interface TopWithdrawalsResponse {
  data: TopEntry[];
}

export interface TopDepositsResponse {
  data: TopEntry[];
}

export interface Banner {
  id: number | string;
  image: string;
  link?: string | null;
  sort: number;
  title?: string | null;
  overlay_image?: string | null;
  has_overlay?: boolean;
}
