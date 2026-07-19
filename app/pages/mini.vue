<template>
  <GamePageLayout>
    <h1 class="sr-only">{{ $t('home.seo.pageTitles.mini') }} - {{ siteConfig.identity.siteName }}</h1>

    <!-- Loading State -->
    <div v-if="isLoading" class="w-full py-8 text-white text-center">
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
import { computed } from "vue";
import { useI18n } from "vue-i18n";
import {
  mapGameLobby,
  mapGameListItem,
  type GameLobbyWire,
  type GameListItemWire,
} from "@/interfaces/game.interface";

const { t } = useI18n();
const authStore = useAuthStore();
const uiStore = useUiStore();

interface MiniLobby {
  game_name: string;
  [key: string]: unknown;
}
type LobbiesResponse = MiniLobby[] | { data?: MiniLobby[] };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GameRow = any;
type GamesResponse = GameRow[] | { data?: GameRow[] };

const api = useApi();
const siteConfig = useSiteConfig();

definePageMeta({
  layout: "default",
});

useSeoHead({
  title: t("home.seo.pageTitles.mini"),
  description: t("home.seo.pageDescriptions.mini"),
});
useBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Mini Games", path: "/mini" },
]);


// SSR fetch via useApi: pulls all mini-game lobbies + their games on the
// server so the initial HTML already includes the grid. Awaited so the
// setup suspends until the data is ready — keeps the lobbies call on the
// server boundary during client-side navigation too.
const { data: miniGames, pending } = await useAsyncData<GameRow[]>(
  "mini-games-bundle",
  async () => {
    // Best-effort (SSR-awaited): normalize the camelCase wire shapes via the
    // mappers rather than validateResponse, so a hiccup degrades to an empty
    // grid instead of a 500.
    const lobbiesRes = await api<LobbiesResponse>("/games/lobbies", {
      query: { gameType: "mini" },
    });
    const lobbiesRaw = Array.isArray(lobbiesRes)
      ? lobbiesRes
      : (lobbiesRes?.data ?? []);
    const lobbies = lobbiesRaw.map((l) => mapGameLobby(l as unknown as GameLobbyWire));
    if (lobbies.length === 0) return [];

    const gamesResults = await Promise.all(
      lobbies.map((lobby) =>
        api<GamesResponse>("/games", {
          query: { lobby: lobby.game_name, page: 1, limit: 50 },
        }),
      ),
    );

    const flat: GameRow[] = [];
    for (const res of gamesResults) {
      const raw = Array.isArray(res) ? res : (res?.data ?? []);
      if (Array.isArray(raw)) {
        flat.push(...raw.map((g) => mapGameListItem(g as GameListItemWire)));
      }
    }
    return flat;
  },
  { default: () => [] },
);

const isLoading = computed(() => pending.value);
const allGames = computed<GameRow[]>(() => miniGames.value ?? []);

useItemListSchema(() =>
  allGames.value.map((g: GameRow) => ({
    name: g.game_name_en || g.game_name || g.name || "",
  })),
);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const handleGameClick = (game: any) => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  const gameType = game.game_type || "mini";
  const lobbyId = game.lobby_id || "";
  authStore.setCurrentGame({
    id: String(game.id),
    name: game.game_name_en || game.name || "",
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
