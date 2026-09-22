<template>
  <GamePageLayout>
    <!-- Loading / Error only replace the grid on the FIRST load (no data yet).
         Once games exist, SubGames stays mounted through search/page refetches
         so the search input never gets destroyed mid-type (focus + text loss). -->
    <div v-if="isLoading && games.length === 0" class="w-full py-8 text-white text-center">
      <p class="text-lg text-gray-400">{{ $t("common.loading") }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error && games.length === 0" class="w-full py-8 text-white text-center">
      <p class="text-lg text-red-400">{{ error }}</p>
      <button
        class="mt-4 px-6 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 transition-colors"
        @click="fetchGames()"
      >
        {{ $t("common.retry") }}
      </button>
    </div>

    <!-- Games -->
    <template v-else>
      <SubGames
        :games="games"
        :is-loading="isLoading || isLoadingMore"
        :current-page="loadedPage"
        :total-pages="totalPages"
        :logo="providerLogo"
        :provider-name="providerName"
        :show-search="true"
        :show-pagination="false"
        :initial-search="searchQuery"
        @search="onSearch"
      />

      <!-- The observer starts the next request shortly before this marker
           enters the viewport. It stays mounted while a request fails so the
           user can retry without losing the pages already on screen. -->
      <div
        v-if="hasMore || isLoadingMore || loadMoreError"
        ref="loadMoreSentinel"
        data-testid="lobby-games-sentinel"
        class="min-h-px w-full py-6 text-center"
        aria-live="polite"
      >
        <p v-if="isLoadingMore" class="text-sm text-gray-400">
          {{ $t("common.loading") }}
        </p>
        <div v-else-if="loadMoreError">
          <p class="text-sm text-red-400">{{ loadMoreError }}</p>
          <button
            class="mt-3 rounded bg-yellow-500 px-5 py-2 text-sm text-black transition-colors hover:bg-yellow-600"
            @click="retryLoadMore"
          >
            {{ $t("common.retry") }}
          </button>
        </div>
      </div>
    </template>
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { providerDisplayName } from "@/utils/gameProviderLogo";

definePageMeta({
  layout: "default",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameRow = any;
interface LobbyGamesResponse {
  games: GameRow[];
  total: number;
  scope: string;
}

// Backend error tokens -> localized copy (see composables/useApiMessage.ts).
const apiMessage = useApiMessage();
const route = useRoute();
const router = useRouter();
const siteConfig = useSiteConfig();

const GAMES_PER_PAGE = 24;
const PREFETCH_MARGIN_PX = 400;

// Route slug is now the lobby UUID — `gameLobbies.game_name` and
// `gameSubGames.lobby` drift apart (e.g. CMD), so the UUID is the only
// reliable join.
const lobbyId = computed(() => route.params.lobby as string);
// Search term is server-side: it's forwarded to the backend `game_name` filter
// (fuzzy ilike across the WHOLE lobby, not just the current page) so results and
// pagination span the full catalog. It remains in the URL so a searched view
// is shareable, while the old numbered `page` query is no longer part of the
// route state.
const searchQuery = computed(() => (route.query.q as string) || "");
const requestScope = computed(() => `${lobbyId.value}\u0000${searchQuery.value}`);

// Fetched via useAsyncData so the backend `/games?lobby_id=...` call runs on
// the Worker during SSR and the result is embedded in the HTML payload. On
// SPA navigation the client refires the fetch for a new lobby/search. Only the
// first page participates in async data; later pages append client-side.
// `lazy: true` prevents the route transition from suspending — the page
// renders immediately with the loading state instead of blocking.
const catalog = useGameCatalogStore();
const { data, error: fetchError, pending, refresh: fetchGames } = useAsyncData<LobbyGamesResponse>(
  () => `lobby-games-${lobbyId.value}-${searchQuery.value}`,
  async () => {
    const lobby = lobbyId.value;
    const scope = requestScope.value;
    if (!lobby) return { games: [], total: 0, scope };
    const result = await catalog.loadGames({
      lobbyId: lobby,
      page: 1,
      limit: GAMES_PER_PAGE,
      ...(searchQuery.value ? { gameName: searchQuery.value } : {}),
    });
    return { ...result, scope };
  },
  {
    watch: [lobbyId, searchQuery],
    lazy: true,
    default: (): LobbyGamesResponse => ({
      games: [] as GameRow[],
      total: 0,
      scope: requestScope.value,
    }),
  },
);

const { t, te } = useI18n();
const firstPage = computed<LobbyGamesResponse>(() => {
  const response = data.value;
  if (response?.scope === requestScope.value) return response;

  // Keep the current lobby's cards mounted during a server-side search so the
  // input does not lose focus while its replacement first page is in flight.
  // A lobby change must never flash the previous provider's catalogue.
  if (
    pending.value &&
    response?.scope.startsWith(`${lobbyId.value}\u0000`)
  ) return response;

  return { games: [], total: 0, scope: requestScope.value };
});
const appendedGames = ref<GameRow[]>([]);
const loadedPage = ref(1);
const totalOverride = ref<number | null>(null);
const reachedEnd = ref(false);
const isLoadingMore = ref(false);
const loadMoreError = ref<string | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);
let requestGeneration = 0;

const games = computed<GameRow[]>(() => {
  const seen = new Set<string>();
  return [...firstPage.value.games, ...appendedGames.value].filter((game) => {
    const id = String(game.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
});
const totalGames = computed(() => totalOverride.value ?? firstPage.value.total);
const hasMore = computed(() =>
  !reachedEnd.value &&
  firstPage.value.games.length > 0 &&
  games.value.length < totalGames.value,
);

// Provider logo (left of the games header) — local /designs/<type>-logo/<id>.webp
// keyed by the lobby UUID, with the type taken from the first game.
const providerName = computed<string>(() =>
    providerDisplayName(t, te, games.value[0]?.gameProvider, games.value[0]?.lobby ?? ""),
);
const providerLogo = computed<string>(() => {
  const type = String(games.value[0]?.game_type ?? "slot").toLowerCase();
  const logos = siteConfig.assets.homepage.gameLogos;
  const base = type === "casino"
    ? logos.casino
    : type === "sport" || type === "sports"
      ? logos.sports
      : logos.slot;
  // sameOrigin: the header logo is alpha-trimmed via canvas (TrimmedImage), which
  // is blocked for cross-origin CDN images (no CORS). Serve same-origin so the
  // trim works and the logo isn't tiny.
  return sameOrigin(lobbyLogoUrl(base, lobbyId.value));
});
const isLoading = computed(() => pending.value);
// Was `err.data?.message` — the raw backend token as the page's inline error.
const error = computed<string | null>(() =>
  fetchError.value
    ? apiMessage(fetchError.value, "game", "common.errorLoadingData")
    : null,
);

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalGames.value / GAMES_PER_PAGE)),
);

const loadNextPage = async (): Promise<void> => {
  if (
    !import.meta.client ||
    pending.value ||
    isLoadingMore.value ||
    loadMoreError.value ||
    !hasMore.value
  ) return;

  const generation = requestGeneration;
  const lobby = lobbyId.value;
  const query = searchQuery.value;
  const nextPage = loadedPage.value + 1;
  isLoadingMore.value = true;

  try {
    const result = await catalog.loadGames({
      lobbyId: lobby,
      page: nextPage,
      limit: GAMES_PER_PAGE,
      ...(query ? { gameName: query } : {}),
    });
    if (generation !== requestGeneration) return;

    appendedGames.value.push(...result.games);
    loadedPage.value = nextPage;
    totalOverride.value = result.total;
    if (result.games.length === 0) reachedEnd.value = true;
  } catch (loadError: unknown) {
    if (generation !== requestGeneration) return;
    loadMoreError.value = apiMessage(loadError, "game", "common.errorLoadingData");
  } finally {
    if (generation === requestGeneration) {
      isLoadingMore.value = false;
      // On an unusually tall viewport the sentinel may still be close enough
      // after append to need another page before the user can scroll.
      void nextTick(maybeLoadVisibleSentinel);
    }
  }
};

const retryLoadMore = () => {
  loadMoreError.value = null;
  void loadNextPage();
};

const maybeLoadVisibleSentinel = (): void => {
  const sentinel = loadMoreSentinel.value;
  if (!sentinel || sentinel.getBoundingClientRect().top > window.innerHeight + PREFETCH_MARGIN_PX) return;
  void loadNextPage();
};

let intersectionObserver: IntersectionObserver | null = null;
let fallbackScrollListener = false;

const stopWatchingSentinel = () => {
  intersectionObserver?.disconnect();
  intersectionObserver = null;
  if (fallbackScrollListener) {
    window.removeEventListener("scroll", maybeLoadVisibleSentinel);
    fallbackScrollListener = false;
  }
};

watch(loadMoreSentinel, (sentinel) => {
  if (!import.meta.client) return;
  stopWatchingSentinel();
  if (!sentinel) return;

  if (typeof IntersectionObserver !== "undefined") {
    intersectionObserver = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadNextPage();
      },
      { rootMargin: `${PREFETCH_MARGIN_PX}px 0px` },
    );
    intersectionObserver.observe(sentinel);
  } else {
    window.addEventListener("scroll", maybeLoadVisibleSentinel, { passive: true });
    fallbackScrollListener = true;
    void nextTick(maybeLoadVisibleSentinel);
  }
});

watch(requestScope, () => {
  requestGeneration += 1;
  appendedGames.value = [];
  loadedPage.value = 1;
  totalOverride.value = null;
  reachedEnd.value = false;
  isLoadingMore.value = false;
  loadMoreError.value = null;
});

onMounted(() => {
  // Canonicalize legacy numbered links without adding a history entry.
  if (route.query.page !== undefined) {
    const query = { ...route.query };
    delete query.page;
    void router.replace({ query });
  }
});

onBeforeUnmount(stopWatchingSentinel);

// New search term → always land on page 1 (the old page number is meaningless
// against a freshly-filtered, shorter result set). Writing `q` to the URL
// triggers the searchQuery-watched refetch above.
const onSearch = (q: string) => {
  const query: Record<string, string> = {};
  if (q) query.q = q;
  void router.push({ query });
};
</script>
