import { defineStore } from "pinia";
import { ref, watch } from "vue";
import {
  gameLobbiesResponseSchema,
  gamesListResponseSchema,
  mapGameListItem,
  mapGameLobby,
  normalizeGameType,
  type NormalizedGame,
  type NormalizedLobby,
} from "@/interfaces/game.interface";
import { validateResponse } from "@/lib/validateResponse";
import { useAuthStore } from "@/stores/auth";

export type CacheStatus = "idle" | "loading" | "success" | "error";

/** Serializable state only; request promises deliberately stay outside Pinia. */
export interface CatalogEntry<T> {
  data: T;
  status: CacheStatus;
  error: string | null;
  fetchedAt: number | null;
}

export interface GameQuery {
  gameType?: string;
  category?: string;
  lobby?: string;
  lobbyId?: string;
  gameName?: string;
  page?: number;
  limit?: number;
}

export interface GameListResult {
  games: NormalizedGame[];
  total: number;
}

type GamesWireResponse = {
  data?: unknown[];
  games?: unknown[];
  rows?: number;
  total?: number;
  meta?: { total?: number };
} | unknown[] | null;

const entry = <T>(data: T): CatalogEntry<T> => ({
  data,
  status: "idle",
  error: null,
  fetchedAt: null,
});

const lobbyKey = (gameType?: string | null) =>
  normalizeGameType(gameType ?? null) ?? "all";

/** Stable key so equivalent query objects share the same request/cache entry. */
export const gameQueryKey = (query: GameQuery): string =>
  Object.entries({
    category: query.category ?? "",
    gameName: query.gameName ?? "",
    gameType: normalizeGameType(query.gameType ?? null) ?? "",
    limit: query.limit ?? 0,
    lobby: query.lobby ?? "",
    lobbyId: query.lobbyId ?? "",
    page: query.page ?? 1,
  })
    .map(([key, value]) => `${key}=${encodeURIComponent(String(value))}`)
    .join("&");

/**
 * Shared, memory-only game catalogue. Every API response is normalized at this
 * boundary; UI consumers only select serializable cached entries.
 */
export const useGameCatalogStore = defineStore("gameCatalog", () => {
  const lobbies = ref<Record<string, CatalogEntry<NormalizedLobby[]>>>({});
  const games = ref<Record<string, CatalogEntry<GameListResult>>>({});
  const lobbyRequests = new Map<string, Promise<NormalizedLobby[]>>();
  const gameRequests = new Map<string, Promise<GameListResult>>();

  const lobbyEntry = (gameType?: string | null) => {
    const key = lobbyKey(gameType);
    return (lobbies.value[key] ??= entry<NormalizedLobby[]>([]));
  };
  const gameEntry = (query: GameQuery) => {
    const key = gameQueryKey(query);
    return (games.value[key] ??= entry<GameListResult>({ games: [], total: 0 }));
  };

  const waitForSessionReady = async () => {
    if (import.meta.server) return;
    const auth = useAuthStore();
    if (auth.sessionReady) return;
    await new Promise<void>((resolve) => {
      const stop = watch(
        () => auth.sessionReady,
        (ready) => {
          if (ready) {
            stop();
            resolve();
          }
        },
      );
    });
  };

  const loadLobbies = async (
    gameType?: string | null,
    force = false,
  ): Promise<NormalizedLobby[]> => {
    // Every catalogue response is member-scoped: the backend filters both
    // providers and games for blocked members.  Do not cache an anonymous
    // answer just before the initial session probe authenticates this tab.
    await waitForSessionReady();
    const key = lobbyKey(gameType);
    const current = lobbyEntry(gameType);
    if (!force && current.status === "success") return current.data;

    // The layout always needs the unfiltered member-scoped response to decide
    // which categories exist. That response already carries every lobby's
    // gameType, so category pages and homepage rows can filter it locally
    // instead of repeating `/games/lobbies?gameType=...` for each type.
    if (gameType != null) {
      const targetType = normalizeGameType(gameType);
      const all = await loadLobbies(null, force);
      const data = all.filter(
        (lobby) => normalizeGameType(lobby.gameType) === targetType,
      );
      Object.assign(current, {
        data,
        status: "success" as const,
        error: null,
        fetchedAt: lobbyEntry(null).fetchedAt,
      });
      return data;
    }

    const active = lobbyRequests.get(key);
    if (active) return active;

    current.status = "loading";
    current.error = null;
    const request = useApi()("/games/lobbies", {
        ...(gameType == null ? {} : { query: { gameType: normalizeGameType(gameType) } }),
      })
      .then((raw) => validateResponse(gameLobbiesResponseSchema, raw, "/games/lobbies"))
      .then((wire) => wire.map(mapGameLobby))
      .then((data) => {
        Object.assign(current, { data, status: "success" as const, fetchedAt: Date.now() });
        return data;
      })
      .catch((error: unknown) => {
        current.status = "error";
        current.error = error instanceof Error ? error.message : "Unable to load game lobbies";
        throw error;
      })
      .finally(() => lobbyRequests.delete(key));
    lobbyRequests.set(key, request);
    return request;
  };

  const loadGames = async (
    query: GameQuery,
    force = false,
  ): Promise<GameListResult> => {
    // Game visibility follows the same member restrictions as lobbies.
    await waitForSessionReady();
    const key = gameQueryKey(query);
    const current = gameEntry(query);
    if (!force && current.status === "success") return current.data;
    const active = gameRequests.get(key);
    if (active) return active;

    current.status = "loading";
    current.error = null;
    const normalizedQuery = {
      ...query,
      ...(query.gameType ? { gameType: normalizeGameType(query.gameType) } : {}),
    };
    const request = useApi()<GamesWireResponse>("/games", { query: normalizedQuery })
      .then((raw) => {
        // Older deployments may return an array. Prefer the current paginated
        // contract when possible, while retaining the established fallback.
        if (Array.isArray(raw)) {
          return { games: raw.map((item) => mapGameListItem(item as never)), total: raw.length };
        }
        const list = raw?.data ?? raw?.games ?? [];
        const parsed = gamesListResponseSchema.safeParse({
          data: list,
          meta: {
            total: raw?.meta?.total ?? raw?.rows ?? raw?.total ?? list.length,
            page: query.page ?? 1,
            limit: query.limit ?? list.length,
            totalPages: 1,
          },
        });
        const normalized = parsed.success
          ? parsed.data.data.map(mapGameListItem)
          : list.map((item) => mapGameListItem(item as never));
        return {
          games: normalized,
          total: Number(raw?.meta?.total) || Number(raw?.rows) || Number(raw?.total) || normalized.length,
        };
      })
      .then((data) => {
        Object.assign(current, { data, status: "success" as const, fetchedAt: Date.now() });
        return data;
      })
      .catch((error: unknown) => {
        current.status = "error";
        current.error = error instanceof Error ? error.message : "Unable to load games";
        throw error;
      })
      .finally(() => gameRequests.delete(key));
    gameRequests.set(key, request);
    return request;
  };

  const clear = () => {
    lobbies.value = {};
    games.value = {};
    lobbyRequests.clear();
    gameRequests.clear();
  };

  return { lobbies, games, lobbyEntry, gameEntry, loadLobbies, loadGames, clear };
});
