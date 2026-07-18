/**
 * Game interfaces
 * Migrated from banana-lucky-next/constants/index.ts
 */

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
