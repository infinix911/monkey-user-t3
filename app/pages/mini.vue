<template>
  <GamePageLayout>
    <h1 class="sr-only">{{ $t('home.seo.pageTitles.mini') }} - {{ siteConfig.identity.siteName }}</h1>

    <!-- Section title — same gradient bar the homepage puts above each row
         (app/pages/index.vue). Outside the state branches: the title belongs to
         the page, not to a particular fetch state. -->
    <GameSectionHeader name="mini" :label="$t('navbar.mini')" />

    <!-- Loading State — first page only; later pages load under the grid. -->
    <div v-if="isLoading && allGames.length === 0" class="w-full py-8 text-white text-center">
      <p class="text-lg text-gray-400">{{ $t("common.loading") }}</p>
    </div>

    <!-- Games Grid (same layout as hot/home page) — width capped to match the
         other category grids (casino/slots) so 6 columns stay a sensible size
         instead of stretching the full viewport on wide screens. -->
    <div v-else-if="allGames.length > 0" class="w-full max-w-[1300px] mx-auto relative z-10 mt-[10px] sm:mt-[8px]">
      <div class="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-[5px]">
        <div v-for="game in allGames" :key="game.id" class="cursor-pointer" @click="handleGameClick(game)">
          <HotGameCard :game="game" fluid />
        </div>
      </div>

      <!-- Infinite scroll, as on /lobbies/:lobby/games: the observer requests
           the next 24 shortly before this marker enters the viewport. It stays
           mounted on a failed page so the member can retry without losing the
           pages already shown. -->
      <div
        v-if="hasMore || isLoadingMore || loadMoreError"
        ref="loadMoreSentinel"
        data-testid="mini-games-sentinel"
        class="min-h-px w-full py-6 text-center"
        aria-live="polite"
      >
        <p v-if="isLoadingMore" class="text-sm text-gray-400">
          {{ $t("common.loading") }}
        </p>
        <div v-else-if="loadMoreError">
          <p class="text-sm text-red-400">{{ loadMoreError }}</p>
          <button
            type="button"
            class="mt-3 rounded bg-yellow-500 px-5 py-2 text-sm text-black transition-colors hover:bg-yellow-600"
            @click="retryLoadMore"
          >
            {{ $t("common.retry") }}
          </button>
        </div>
      </div>
    </div>

    <!-- Empty / No Games State -->
    <div v-else class="w-full flex items-center justify-center py-20 px-4 min-h-[calc(100vh-300px)]">
      <div class="flex flex-col items-center gap-4 max-w-sm text-center">
        <div class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 text-gray-500" fill="none" viewBox="0 0 24 24"
            stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round"
              d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875S10.5 3.09 10.5 4.125c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.4 48.4 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z" />
          </svg>
        </div>
        <h3 class="text-lg font-semibold text-white">
          {{ $t("common.noGamesFound") }}
        </h3>
        <p class="text-sm text-gray-400 leading-relaxed">
          {{ $t("common.noGamesDescription") }}
        </p>
      </div>
    </div>
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { localizedGameName } from "~/utils/localized-game-name";

const { t, locale } = useI18n();
const authStore = useAuthStore();
const uiStore = useUiStore();

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameRow = any;

const catalog = useGameCatalogStore();
const siteConfig = useSiteConfig();

definePageMeta({
  layout: "default",
});

useHead({
  title: () =>
    `${t("home.seo.pageTitles.mini")} — ${siteConfig.identity.siteName}`,
});


// Mini catalogue, 24 per page with infinite scroll — the same pattern as
// pages/lobbies/[lobby]/games.vue (the slot provider list). Page 1 comes from
// useAsyncData; later pages append client-side as the sentinel nears.
const GAMES_PER_PAGE = 24;
const PREFETCH_MARGIN_PX = 400;

const apiMessage = useApiMessage();

const { data: firstPage, pending } = useAsyncData<{ games: GameRow[]; total: number }>(
  "mini-games-page-1",
  () => catalog.loadGames({ gameType: "mini", page: 1, limit: GAMES_PER_PAGE }),
  { default: () => ({ games: [], total: 0 }), server: false },
);

const appendedGames = ref<GameRow[]>([]);
const loadedPage = ref(1);
const totalOverride = ref<number | null>(null);
const reachedEnd = ref(false);
const isLoadingMore = ref(false);
const loadMoreError = ref<string | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);

const isLoading = computed(() => pending.value);

/** Page 1 + appended pages, de-duplicated by id (pages can shift underneath). */
const allGames = computed<GameRow[]>(() => {
  const seen = new Set<string>();
  return [...(firstPage.value?.games ?? []), ...appendedGames.value].filter((game) => {
    const id = String(game.id);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
});

const totalGames = computed(() => totalOverride.value ?? firstPage.value?.total ?? 0);
const hasMore = computed(() =>
  !reachedEnd.value &&
  (firstPage.value?.games.length ?? 0) > 0 &&
  allGames.value.length < totalGames.value,
);

const loadNextPage = async (): Promise<void> => {
  if (pending.value || isLoadingMore.value || loadMoreError.value || !hasMore.value) return;

  const nextPage = loadedPage.value + 1;
  isLoadingMore.value = true;
  try {
    const result = await catalog.loadGames({ gameType: "mini", page: nextPage, limit: GAMES_PER_PAGE });
    appendedGames.value.push(...result.games);
    loadedPage.value = nextPage;
    totalOverride.value = result.total;
    if (result.games.length === 0) reachedEnd.value = true;
  } catch (err: unknown) {
    loadMoreError.value = apiMessage(err, "game", "common.errorLoadingData");
  } finally {
    isLoadingMore.value = false;
    // A tall viewport may still show the sentinel after the append.
    void nextTick(maybeLoadVisibleSentinel);
  }
};

const retryLoadMore = () => {
  loadMoreError.value = null;
  void loadNextPage();
};

function maybeLoadVisibleSentinel(): void {
  const sentinel = loadMoreSentinel.value;
  if (!sentinel || sentinel.getBoundingClientRect().top > window.innerHeight + PREFETCH_MARGIN_PX) return;
  void loadNextPage();
}

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

onBeforeUnmount(stopWatchingSentinel);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleGameClick = (game: any) => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  const gameType = game.game_type || "mini";
  const lobbyId = game.lobby_id || "";
  const gameName = localizedGameName(game, locale.value);
  authStore.setCurrentGame({
    id: String(game.id),
    name: gameName,
    provider: game.lobby || "",
    type: gameType,
    lobby_id: lobbyId,
  });
  const url = lobbyId
    ? `/${gameType}/${game.id}?lobbyId=${encodeURIComponent(lobbyId)}`
    : `/${gameType}/${game.id}`;
  window.open(url, "_blank", "width=1280,height=800,resizable=yes,scrollbars=yes");
};

</script>
