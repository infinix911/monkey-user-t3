import { computed, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useAuthStore } from "@/stores/auth";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Lobby = any;
type LobbyResponse = Lobby[] | { data?: Lobby[] };

export function useLobbyPage(gameType: string) {
  const { t } = useI18n();
  const api = useApi();

  // SSR fetch via useApi — runs on the server during initial render and
  // hydrates on the client without re-fetching.
  const {
    data,
    error: fetchError,
    pending,
    refresh: fetchLobbies,
  } = useAsyncData<Lobby[]>(
    `lobbies-${gameType}`,
    async () => {
      const res = await api<LobbyResponse>("/games/lobbies", {
        query: { game_type: gameType },
      });
      if (Array.isArray(res)) return res;
      return res?.data ?? [];
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

  const lobbies = computed<Lobby[]>(() => data.value ?? []);
  const isLoading = computed(() => pending.value);
  const error = computed<string | null>(() => {
    if (!fetchError.value) return null;
    const err = fetchError.value as {
      data?: { message?: string };
      message?: string;
    };
    return err.data?.message || err.message || t("common.errorLoadingData");
  });

  return {
    isLoading,
    error,
    lobbies,
    fetchLobbies,
  };
}
