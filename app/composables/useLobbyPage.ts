import { computed, watch } from "vue";
import { useAuthStore } from "@/stores/auth";
import { validateResponse } from "@/lib/validateResponse";
import {
  gameLobbiesResponseSchema,
  mapGameLobby,
  type NormalizedLobby,
} from "@/interfaces/game.interface";

export function useLobbyPage(gameType: string) {
  const api = useApi();
  const apiMessage = useApiMessage();

  // SSR fetch via useApi — runs on the server during initial render and
  // hydrates on the client without re-fetching. The backend returns a
  // camelCase array; validate it then normalize to the shape the components
  // render (see mapGameLobby).
  const {
    data,
    error: fetchError,
    pending,
    refresh: fetchLobbies,
  } = useAsyncData<NormalizedLobby[]>(
    `lobbies-${gameType}`,
    async () => {
      const raw = await api("/games/lobbies", { query: { gameType } });
      const wire = validateResponse(
        gameLobbiesResponseSchema,
        raw,
        "/games/lobbies",
      );
      return wire.map(mapGameLobby);
    },
    { default: () => [] },
  );

  // Restricted providers are filtered server-side per-member (the backend only
  // applies member blocks when the session cookie resolves a memberId). Re-fetch
  // on login so blocked lobbies disappear immediately without a manual refresh.
  // On logout the store redirects to "/", so no reload is needed here.
  const authStore = useAuthStore();
  watch(
    () => authStore.isAuthenticated,
    (isAuth) => {
      if (isAuth) fetchLobbies();
    },
  );

  const lobbies = computed<NormalizedLobby[]>(() => data.value ?? []);
  const isLoading = computed(() => pending.value);
  // Was `err.data?.message` — the raw backend token, rendered as the page's
  // inline error. apiMessage() translates known tokens and falls back to the
  // generic copy for anything unrecognised.
  const error = computed<string | null>(() =>
    fetchError.value
      ? apiMessage(fetchError.value, "game", "common.errorLoadingData")
      : null,
  );

  return {
    isLoading,
    error,
    lobbies,
    fetchLobbies,
  };
}
