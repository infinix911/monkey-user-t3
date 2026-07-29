import { computed } from "vue";
import { useAuthStore } from "@/stores/auth";
import {
  normalizeGameType,
  type GameLobbyWire,
} from "@/interfaces/game.interface";

type LobbyApiResponse =
  | GameLobbyWire[]
  | { data?: GameLobbyWire[] }
  | null
  | undefined;

/**
 * Which lobby-backed game categories actually have something to show.
 *
 * `GET /games/lobbies` with no `gameType` returns every lobby the member may
 * see, each carrying its own type — so one request answers the question for all
 * categories at once. That matters because this runs from the left rail, which
 * the layout renders on every page: per-category requests would multiply by six.
 *
 * The read is member-scoped (the backend applies that member's game blocks), so
 * it re-runs on login exactly as `useLobbyPage` does.
 *
 * @returns Helpers for testing category availability.
 */
export function useGameCategoryAvailability() {
  const api = useApi();

  const { data, refresh } = useAsyncData<string[]>(
    "game-lobby-types",
    async () => {
      const res = await api<LobbyApiResponse>("/games/lobbies").catch(
        () => null,
      );
      const arr = Array.isArray(res)
        ? res
        : res && typeof res === "object" && Array.isArray(res.data)
          ? res.data
          : [];
      const types = new Set<string>();
      for (const lobby of arr) {
        const type = normalizeGameType(lobby?.gameType ?? null);
        if (type) types.add(type);
      }
      return [...types];
    },
    { default: () => [] as string[] },
  );

  // Blocked providers are filtered server-side per member, so a category can
  // appear or disappear on login. Same watch useLobbyPage runs.
  const authStore = useAuthStore();
  watch(
    () => authStore.isAuthenticated,
    (isAuth) => {
      if (isAuth) refresh();
    },
  );

  /** Null until the read resolves — used to stay optimistic while loading. */
  const loaded = computed(() => data.value != null);
  const types = computed(() => new Set(data.value ?? []));

  /**
   * Whether a lobby-backed category has at least one lobby.
   *
   * Returns true while the read is still in flight: hiding a row and then
   * bringing it back reads as a glitch, whereas showing it and then removing it
   * once is what the CMS already does with every other config-driven row.
   *
   * @param gameType - Lowercase lobby type, e.g. "casino" / "sport".
   * @returns {boolean} True when the category should be shown.
   */
  function hasLobbies(gameType: string): boolean {
    if (!loaded.value) return true;
    return types.value.has(gameType);
  }

  return { hasLobbies, lobbyTypes: types, loaded };
}
