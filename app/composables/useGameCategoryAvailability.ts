import { computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useGameCatalogStore } from "@/stores/game-catalog";
import { normalizeGameType } from "@/interfaces/game.interface";

/** Shared category availability derived from the single unfiltered lobby list. */
export function useGameCategoryAvailability() {
  const authStore = useAuthStore();
  const catalog = useGameCatalogStore();
  const allLobbies = computed(() => catalog.lobbyEntry(null));

  // loadLobbies(null) waits for the initial session probe itself. Calling it
  // from multiple layout surfaces is harmless because the store de-dupes it.
  void catalog.loadLobbies(null).catch(() => undefined);

  // Later member transitions need one authoritative member-scoped refresh.
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated, wasAuthenticated) => {
      if (authStore.sessionReady && isAuthenticated !== wasAuthenticated) {
        void catalog.loadLobbies(null, true).catch(() => undefined);
      }
    },
  );

  const loaded = computed(() => allLobbies.value.status === "success");
  const types = computed(() => new Set(
    allLobbies.value.data
      .map((lobby) => normalizeGameType(lobby.gameType))
      .filter((type): type is string => Boolean(type)),
  ));

  function hasLobbies(gameType: string): boolean {
    return !loaded.value || types.value.has(normalizeGameType(gameType) ?? gameType);
  }

  return { hasLobbies, lobbyTypes: types, loaded };
}
