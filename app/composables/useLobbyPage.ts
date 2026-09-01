import { computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useGameCatalogStore } from "@/stores/game-catalog";
import type { NormalizedLobby } from "@/interfaces/game.interface";

export function useLobbyPage(gameType: string) {
  const catalog = useGameCatalogStore();
  const authStore = useAuthStore();
  const cached = computed(() => catalog.lobbyEntry(gameType));

  const fetchLobbies = (force = false) => catalog.loadLobbies(gameType, force);
  void fetchLobbies().catch(() => undefined);

  // The initial client probe is deliberately not treated as a login transition;
  // its first request is already correctly member-scoped once it settles.
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated, wasAuthenticated) => {
      if (authStore.sessionReady && isAuthenticated !== wasAuthenticated) {
        void fetchLobbies(true).catch(() => undefined);
      }
    },
  );

  const lobbies = computed<NormalizedLobby[]>(() => cached.value.data);
  const isLoading = computed(() => cached.value.status === "idle" || cached.value.status === "loading");
  const error = computed(() => cached.value.error);

  return { isLoading, error, lobbies, fetchLobbies };
}
