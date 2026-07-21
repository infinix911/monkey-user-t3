/**
 * Game interfaces
 * Migrated from banana-lucky-next/constants/index.ts
 */

import { z } from "zod";

// ===========================================================================
// Bet histories: GET /games/bet-histories/:gameType ({ data, meta }, camelCase)
// ===========================================================================

/** Wire shape of a bet-history row (getBetHistoriesSchema.data[]). */
export const betHistoryItemWireSchema = z.object({
  id: z.string(),
  memberId: z.string().optional(),
  member: z.string().optional(),
  gameProvider: z.string(),
  gameName: z.string(),
  gameRoom: z.string(),
  gameRound: z.string().optional(),
  gameTxn: z.string().optional(),
  betAmount: z.string(),
  winAmount: z.string(),
  betResult: z.string(),
  walletBefore: z.string().optional(),
  walletAfter: z.string().optional(),
  status: z.number().nullable(),
  createdAt: z.string(),
  updatedAt: z.string().optional(),
});

export const betHistoriesResponseWireSchema = z.object({
  data: z.array(betHistoryItemWireSchema),
  meta: z.object({
    total: z.number(),
    page: z.number().optional(),
    limit: z.number().optional(),
    totalPages: z.number(),
  }),
  summary: z.object({
    betAmount: z.string(),
    winAmount: z.string(),
    rollAmount: z.string(),
    netAmount: z.string(),
  }),
});
export type BetHistoriesResponseWire = z.infer<
  typeof betHistoriesResponseWireSchema
>;

/** Normalized bet-history row (snake_case) consumed by BettingReport. */
export interface BetHistoryRow {
  id: string;
  game_type?: string;
  game_provider: string;
  game_name: string;
  game_room: string;
  bet_amount: string;
  win_amount: string;
  bet_result: string;
  status: number;
  created_at: string;
}

/** Normalized bet-history response — the { pages, rows, data, summary } shape. */
export interface BetHistoryResponse {
  pages: number;
  rows: number;
  data: BetHistoryRow[];
  summary: {
    bet_amount: string;
    win_amount: string;
    roll_amount: string;
    net_amount: string;
  } | null;
}

export const mapBetHistoryItem = (
  w: z.infer<typeof betHistoryItemWireSchema>,
): BetHistoryRow => ({
  id: w.id,
  game_provider: w.gameProvider,
  game_name: w.gameName,
  game_room: w.gameRoom,
  bet_amount: w.betAmount,
  win_amount: w.winAmount,
  bet_result: w.betResult,
  status: w.status ?? 0,
  created_at: w.createdAt,
});

export const mapBetHistoriesResponse = (
  w: BetHistoriesResponseWire,
): BetHistoryResponse => ({
  pages: w.meta.totalPages,
  rows: w.meta.total,
  data: w.data.map(mapBetHistoryItem),
  summary: {
    bet_amount: w.summary.betAmount,
    win_amount: w.summary.winAmount,
    roll_amount: w.summary.rollAmount,
    net_amount: w.summary.netAmount,
  },
});

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
