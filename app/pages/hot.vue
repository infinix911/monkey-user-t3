<template>
  <GamePageLayout>
    <h1 class="sr-only">{{ $t('home.seo.pageTitles.hot') }} - {{ siteConfig.identity.siteName }}</h1>

    <!-- Loading State -->
    <div v-if="isLoading" class="w-full py-8 text-white text-center">
      <p class="text-lg text-gray-400">{{ $t("common.loading") }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="w-full py-8 text-white text-center">
      <p class="text-lg text-red-400">{{ error }}</p>
      <button
        class="mt-4 px-6 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 transition-colors"
        @click="fetchGames()"
      >
        {{ $t("common.retry") }}
      </button>
    </div>

    <!-- Empty / No Games State -->
    <div
      v-else-if="games.length === 0"
      class="w-full flex items-center justify-center py-20 px-4 min-h-[calc(100vh-300px)]"
    >
      <div class="flex flex-col items-center gap-4 max-w-sm text-center">
        <div
          class="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-10 h-10 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            stroke-width="1.5"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              d="M14.25 6.087c0-.355.186-.676.401-.959.221-.29.349-.634.349-1.003 0-1.036-1.007-1.875-2.25-1.875S10.5 3.09 10.5 4.125c0 .369.128.713.349 1.003.215.283.401.604.401.959v0a.64.64 0 0 1-.657.643 48.4 48.4 0 0 1-4.163-.3c.186 1.613.293 3.25.315 4.907a.656.656 0 0 1-.658.663v0c-.355 0-.676-.186-.959-.401a1.647 1.647 0 0 0-1.003-.349c-1.036 0-1.875 1.007-1.875 2.25s.84 2.25 1.875 2.25c.369 0 .713-.128 1.003-.349.283-.215.604-.401.959-.401v0c.31 0 .555.26.532.57a48.039 48.039 0 0 1-.642 5.056c1.518.19 3.058.309 4.616.354a.64.64 0 0 0 .657-.643v0c0-.355-.186-.676-.401-.959a1.647 1.647 0 0 1-.349-1.003c0-1.035 1.008-1.875 2.25-1.875 1.243 0 2.25.84 2.25 1.875 0 .369-.128.713-.349 1.003-.215.283-.4.604-.4.959v0c0 .333.277.599.61.58a48.1 48.1 0 0 0 5.427-.63 48.05 48.05 0 0 0 .582-4.717.532.532 0 0 0-.533-.57v0c-.355 0-.676.186-.959.401-.29.221-.634.349-1.003.349-1.035 0-1.875-1.007-1.875-2.25s.84-2.25 1.875-2.25c.37 0 .713.128 1.003.349.283.215.604.401.959.401v0a.656.656 0 0 0 .658-.663 48.422 48.422 0 0 0-.37-5.36c-1.886.342-3.81.574-5.766.689a.578.578 0 0 1-.61-.58v0Z"
            />
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

    <!-- Games + search + pagination (shared with the slot games list) -->
    <SubGames
      v-else
      :games="games"
      :is-loading="isLoading"
      :current-page="currentPage"
      :total-pages="totalPages"
      :show-search="false"
      @page-change="onPageChange"
    />
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

definePageMeta({
  layout: "default",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameRow = any;
interface HotGamesResponse {
  games: GameRow[];
  total: number;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const api = useApi();
const siteConfig = useSiteConfig();

useSeoHead({
  title: t("home.seo.pageTitles.hot"),
  description: t("home.seo.pageDescriptions.hot"),
});
useBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Hot Games", path: "/hot" },
]);

const GAMES_PER_PAGE = 24;

const currentPage = computed(() => Number(route.query.page) || 1);

type RemoteResponse =
  | GameRow[]
  | {
      data?: GameRow[];
      games?: GameRow[];
      rows?: number;
      total?: number;
    }
  | null;

// SSR fetch via useApi: pulls a single page of hot games on the server so the
// initial HTML already includes the grid. Page-number pagination (same UX as the
// slot games list) drives subsequent pages off the `page` route query.
const { data, error: fetchError, pending, refresh: fetchGames } = useAsyncData<HotGamesResponse>(
  "hot-games",
  async () => {
    const res = await api<RemoteResponse>("/games", {
      query: {
        game_type: "slot",
        category: "hot",
        page: currentPage.value,
        limit: GAMES_PER_PAGE,
      },
    }).catch(() => null);

    if (Array.isArray(res)) {
      return { games: res, total: res.length };
    }
    const list = res?.data || res?.games || [];
    const total = Number(res?.rows) || Number(res?.total) || list.length;
    return { games: list, total };
  },
  {
    watch: [currentPage],
    lazy: true,
    default: (): HotGamesResponse => ({ games: [] as GameRow[], total: 0 }),
  },
);

const games = computed<GameRow[]>(() => data.value?.games ?? []);
const totalGames = computed(() => data.value?.total ?? 0);

useItemListSchema(() =>
  games.value.map((g: GameRow) => ({
    name: g.game_name_en || g.game_name || g.name || "",
  })),
);
const isLoading = computed(() => pending.value);
const error = computed<string | null>(() => {
  if (!fetchError.value) return null;
  const err = fetchError.value as { data?: { message?: string }; message?: string };
  return err.data?.message || err.message || t("common.errorLoadingData");
});

const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalGames.value / GAMES_PER_PAGE)),
);

const onPageChange = (page: number) => {
  router.push({ query: page > 1 ? { page: String(page) } : {} });
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};
</script>
