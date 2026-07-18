<template>
  <div class="w-full">
    <div
      class="bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(139,117,0,0.05)] rounded-lg p-4 sm:p-6 border border-[#C9A500]/50"
    >
      <!-- Loading skeleton -->
      <template v-if="loading">
        <h3 class="text-white text-lg sm:text-xl font-bold mb-4">
          {{ t("home.recentlyPlayed") }}
        </h3>
        <div class="flex gap-2 sm:gap-4 overflow-x-auto">
          <div
            v-for="i in gamesPerPage"
            :key="i"
            class="animate-pulse flex-shrink-0"
          >
            <div
              class="bg-[rgba(212,175,55,0.1)] rounded-lg w-24 sm:w-28 md:w-32 h-32 sm:h-36 md:h-40 border border-[#C9A500]/20"
            />
          </div>
        </div>
      </template>

      <!-- Content -->
      <template v-else>
        <div class="flex items-center justify-between mb-6">
          <h3 class="text-white text-lg sm:text-xl font-bold">
            {{ t("home.recentlyPlayed") }}
          </h3>
          <div class="flex items-center gap-1 sm:gap-2">
            <button
              :disabled="!hasPrevious || isTransitioning"
              :class="[
                'p-1.5 sm:p-2 rounded-lg transition-all duration-200 cursor-pointer',
                hasPrevious && !isTransitioning
                  ? 'bg-[rgba(212,175,55,0.2)] hover:bg-[rgba(212,175,55,0.3)] text-white'
                  : 'bg-gray-600/30 text-gray-500 cursor-not-allowed',
                isTransitioning ? 'animate-pulse' : '',
              ]"
              @click="handlePrevious"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="sm:w-5 sm:h-5"
              >
                <polyline points="15 18 9 12 15 6"/>
              </svg>
            </button>
            <button
              :disabled="!hasNext || isTransitioning"
              :class="[
                'p-1.5 sm:p-2 rounded-lg transition-all duration-200 cursor-pointer',
                hasNext && !isTransitioning
                  ? 'bg-[rgba(212,175,55,0.2)] hover:bg-[rgba(212,175,55,0.3)] text-white'
                  : 'bg-gray-600/30 text-gray-500 cursor-not-allowed',
                isTransitioning ? 'animate-pulse' : '',
              ]"
              @click="handleNext"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="sm:w-5 sm:h-5"
              >
                <polyline points="9 18 15 12 9 6"/>
              </svg>
            </button>
          </div>
        </div>

        <div
          :class="[
            'flex gap-2 sm:gap-4 overflow-x-auto transition-all duration-300 ease-in-out',
            isTransitioning
              ? 'opacity-0 scale-95 translate-x-2'
              : 'opacity-100 scale-100 translate-x-0',
          ]"
        >
          <div
            v-for="game in currentGames"
            :key="game.code"
            class="flex-shrink-0 w-24 sm:w-28 md:w-32 cursor-pointer"
            @click="handleGameClick(game)"
          >
            <GameCard :game="gameItemToCard(game)" :show-provider="false" />
          </div>
        </div>

        <div v-if="currentGames.length === 0" class="text-center py-8">
          <p class="text-white/60 text-sm">
            {{ t("home.noRecentlyPlayedGames") }}
          </p>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameItem } from "~/interfaces/game.interface";
import { getRecentlyPlayedGames } from "~~/utils/recently-played";
import { openGame } from "~~/utils/game-navigation";

const authStore = useAuthStore();
const uiStore = useUiStore();

const props = withDefaults(
  defineProps<{
    currentGameId?: string;
    navigateWithReplace?: boolean;
  }>(),
  {
    currentGameId: undefined,
    navigateWithReplace: false,
  },
);

const { t } = useI18n();

const recentlyPlayedGames = ref<GameItem[]>([]);
const loading = ref(true);
const currentPage = ref(0);
const isTransitioning = ref(false);
const gamesPerPage = ref(8);

// Responsive games per page
const updateGamesPerPage = () => {
  const width = window.innerWidth;
  if (width < 640) {
    gamesPerPage.value = 2;
  } else if (width < 768) {
    gamesPerPage.value = 3;
  } else if (width < 1024) {
    gamesPerPage.value = 5;
  } else if (width < 1280) {
    gamesPerPage.value = 6;
  } else {
    gamesPerPage.value = 8;
  }
};

const loadRecentlyPlayedGames = () => {
  try {
    const games = getRecentlyPlayedGames();
    const filtered = props.currentGameId
      ? games.filter((g) => g.code !== props.currentGameId)
      : games;
    recentlyPlayedGames.value = filtered;
  } catch (error) {
    console.error("Error loading recently played games:", error);
    recentlyPlayedGames.value = [];
  }
  loading.value = false;
};

// Pagination computed
const totalPages = computed(() =>
  Math.ceil(recentlyPlayedGames.value.length / gamesPerPage.value),
);
const hasPrevious = computed(() => currentPage.value > 0);
const hasNext = computed(() => currentPage.value < totalPages.value - 1);
const currentGames = computed(() => {
  const start = currentPage.value * gamesPerPage.value;
  return recentlyPlayedGames.value.slice(start, start + gamesPerPage.value);
});

const handlePrevious = () => {
  if (!hasPrevious.value || isTransitioning.value) return;
  isTransitioning.value = true;
  setTimeout(() => {
    currentPage.value = Math.max(0, currentPage.value - 1);
    setTimeout(() => {
      isTransitioning.value = false;
    }, 50);
  }, 150);
};

const handleNext = () => {
  if (!hasNext.value || isTransitioning.value) return;
  isTransitioning.value = true;
  setTimeout(() => {
    currentPage.value = Math.min(totalPages.value - 1, currentPage.value + 1);
    setTimeout(() => {
      isTransitioning.value = false;
    }, 50);
  }, 150);
};

// Convert GameItem to the shape GameCard expects
const gameItemToCard = (game: GameItem) => ({
  id: Number(game.code) || 0,
  game_name_en: game.name || game.name_en,
  game_img: game.game_img,
  lobby: game.provider,
});

const handleGameClick = (game: GameItem) => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }

  const gameType = game.type.toLowerCase().replace(/^game_/i, "");
  const gameCode = game.code.replace(/^GAME_/i, "");
  const lobbyId = game.lobbyId != null ? String(game.lobbyId) : "";
  const url = lobbyId
    ? `/${gameType}/${gameCode}?lobbyId=${encodeURIComponent(lobbyId)}`
    : `/${gameType}/${gameCode}`;
  openGame(url);
};

// Storage event listener for cross-tab updates
const handleStorageChange = (e: StorageEvent) => {
  if (e.key === "recentlyPlayedGames") {
    loadRecentlyPlayedGames();
  }
};

const handleRecentlyPlayedUpdate = () => {
  loadRecentlyPlayedGames();
};

onMounted(() => {
  updateGamesPerPage();
  window.addEventListener("resize", updateGamesPerPage);
  window.addEventListener("storage", handleStorageChange);
  window.addEventListener("recentlyPlayedUpdated", handleRecentlyPlayedUpdate);
  loadRecentlyPlayedGames();
});

onUnmounted(() => {
  window.removeEventListener("resize", updateGamesPerPage);
  window.removeEventListener("storage", handleStorageChange);
  window.removeEventListener(
    "recentlyPlayedUpdated",
    handleRecentlyPlayedUpdate,
  );
});
</script>
