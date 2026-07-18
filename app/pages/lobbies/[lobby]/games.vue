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
    <SubGames
      v-else
      :games="games"
      :is-loading="isLoading"
      :current-page="currentPage"
      :total-pages="totalPages"
      :logo="providerLogo"
      :provider-name="providerName"
      :show-search="true"
      :initial-search="searchQuery"
      @page-change="onPageChange"
      @search="onSearch"
    />
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  mapGameListItem,
  type GameListItemWire,
} from "@/interfaces/game.interface";

definePageMeta({
  layout: "default",
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameRow = any;
interface LobbyGamesResponse {
  games: GameRow[];
  total: number;
}

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const siteConfig = useSiteConfig();

const GAMES_PER_PAGE = 24;

// Route slug is now the lobby UUID — `gameLobbies.game_name` and
// `gameSubGames.lobby` drift apart (e.g. CMD), so the UUID is the only
// reliable join.
const lobbyId = computed(() => route.params.lobby as string);
const currentPage = computed(() => Number(route.query.page) || 1);
// Search term is server-side: it's forwarded to the backend `game_name` filter
// (fuzzy ilike across the WHOLE lobby, not just the current page) so results and
// pagination span the full catalog. Kept in the URL so a searched view is
// shareable and survives refresh/SSR.
const searchQuery = computed(() => (route.query.q as string) || "");

type RemoteResponse =
  | GameRow[]
  | {
      data?: GameRow[];
      games?: GameRow[];
      rows?: number;
      total?: number;
      meta?: { total?: number };
    }
  | null;

// Fetched via useAsyncData so the backend `/games?lobby_id=...` call runs on
// the Worker during SSR and the result is embedded in the HTML payload. On
// SPA navigation the client refires the fetch (watch: [lobbyId, currentPage]).
// `lazy: true` prevents the route transition from suspending — the page
// renders immediately with the loading state instead of blocking.
const api = useApi();
const { data, error: fetchError, pending, refresh: fetchGames } = useAsyncData<LobbyGamesResponse>(
  // Unique per lobby + page so different lobbies don't share one SSR payload
  // (the old generic "lobby-games" key let one lobby's data hydrate another).
  () => `lobby-games-${lobbyId.value}-${currentPage.value}-${searchQuery.value}`,
  async () => {
    const lobby = lobbyId.value;
    if (!lobby) return { games: [], total: 0 };
    const res = await api<RemoteResponse>("/games", {
      query: {
        lobbyId: lobby,
        page: currentPage.value,
        limit: GAMES_PER_PAGE,
        // Only send when non-empty — an empty string would still be a valid
        // (match-all) filter but needlessly fragments the backend cache key.
        ...(searchQuery.value ? { gameName: searchQuery.value } : {}),
      },
    }).catch(() => null);

    if (Array.isArray(res)) {
      return { games: res.map((it) => mapGameListItem(it as GameListItemWire)), total: res.length };
    }
    const raw = res?.data || res?.games || [];
    const list = raw.map((it) => mapGameListItem(it as GameListItemWire));
    const total = Number(res?.meta?.total) || Number(res?.rows) || Number(res?.total) || list.length;
    return { games: list, total };
  },
  {
    watch: [lobbyId, currentPage, searchQuery],
    lazy: true,
    default: (): LobbyGamesResponse => ({ games: [] as GameRow[], total: 0 }),
  },
);

const games = computed<GameRow[]>(() => data.value?.games ?? []);
const totalGames = computed(() => data.value?.total ?? 0);

// Provider logo (left of the games header) — local /designs/<type>-logo/<id>.webp
// keyed by the lobby UUID, with the type taken from the first game.
const providerName = computed<string>(() => games.value[0]?.lobby ?? "");
const providerLogo = computed<string>(() => {
  const type = String(games.value[0]?.game_type ?? "slot").toLowerCase();
  const logos = siteConfig.assets.homepage.gameLogos as Record<string, string>;
  const base = logos[type] ?? logos.slot;
  // sameOrigin: the header logo is alpha-trimmed via canvas (TrimmedImage), which
  // is blocked for cross-origin CDN images (no CORS). Serve same-origin so the
  // trim works and the logo isn't tiny.
  return sameOrigin(lobbyLogoUrl(base, lobbyId.value));
});
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
  const query: Record<string, string> = {};
  if (page > 1) query.page = String(page);
  if (searchQuery.value) query.q = searchQuery.value;
  router.push({ query });
  if (import.meta.client) {
    window.scrollTo({ top: 0, behavior: "smooth" });
  }
};

// New search term → always land on page 1 (the old page number is meaningless
// against a freshly-filtered, shorter result set). Writing `q` to the URL
// triggers the searchQuery-watched refetch above.
const onSearch = (q: string) => {
  const query: Record<string, string> = {};
  if (q) query.q = q;
  router.push({ query });
};
</script>
