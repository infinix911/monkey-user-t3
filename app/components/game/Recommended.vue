<template>
  <div class="w-full max-w-xs min-w-[320px]">
    <!-- Loading skeleton -->
    <div
      v-if="loading"
      class="relative rounded-2xl overflow-hidden shadow-2xl bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(139,117,0,0.05)] border border-[#C9A500]/50 p-3"
    >
      <h3 class="text-white text-lg font-semibold mb-4">
        {{ t("home.recommendedGames") }}
      </h3>
      <div class="space-y-3">
        <div v-for="i in 3" :key="i" class="animate-pulse">
          <div class="bg-gray-700 rounded-lg h-20 w-full"/>
        </div>
      </div>
    </div>

    <!-- Content -->
    <div
      v-else
      class="relative rounded-lg overflow-hidden shadow-2xl bg-gradient-to-br from-[rgba(212,175,55,0.1)] to-[rgba(139,117,0,0.05)] border border-[#C9A500]/50 p-3"
    >
      <div class="flex items-center justify-between mb-4">
        <h3 class="text-white text-lg font-semibold">
          {{ t("home.recommendedGames") }}
        </h3>
        <div class="flex items-center gap-2">
          <button
            :disabled="!hasPrevious || isTransitioning"
            :class="[
              'p-1.5 rounded-lg transition-all duration-200 cursor-pointer',
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
            >
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          </button>
          <button
            :disabled="!hasNext || isTransitioning"
            :class="[
              'p-1.5 rounded-lg transition-all duration-200 cursor-pointer',
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
            >
              <polyline points="9 18 15 12 9 6"/>
            </svg>
          </button>
        </div>
      </div>

      <div
        :class="[
          'space-y-2 transition-all duration-300 ease-in-out',
          isTransitioning
            ? 'opacity-0 scale-95 translate-x-2'
            : 'opacity-100 scale-100 translate-x-0',
        ]"
      >
        <button
          v-for="game in currentGames"
          :key="game.code"
          class="block group w-full text-left cursor-pointer"
          @click="handleGameClick(game)"
        >
          <div
            class="bg-gradient-to-br from-[rgba(212,175,55,0.1)] via-[rgba(201,165,0,0.08)] to-[rgba(139,117,0,0.05)] hover:from-[rgba(212,175,55,0.15)] hover:via-[rgba(201,165,0,0.12)] hover:to-[rgba(139,117,0,0.08)] rounded-lg p-3 transition-all duration-300 group-hover:scale-[1.02] border border-[#C9A500]/30 hover:border-[#D4AF37]/50 shadow-lg hover:shadow-xl hover:shadow-[rgba(212,175,55,0.3)]"
          >
            <div class="flex items-center space-x-3">
              <div class="relative w-12 h-12 flex-shrink-0">
                <img
                  :src="
                    game.game_img || siteConfig.assets.images.defaultThumbnail
                  "
                  :alt="game.name"
                  loading="lazy"
                  class="rounded-lg object-cover w-full h-full"
                  @error="
                    (e) =>
                      (((e as Event).target as HTMLImageElement).src =
                        siteConfig.assets.images.defaultThumbnail)
                  "
                ></div>
              <div class="flex-1 min-w-0">
                <h4 class="text-white text-sm font-medium truncate">
                  {{ game.name }}
                </h4>
                <p v-if="game.provider" class="text-gray-400 text-xs truncate">
                  {{ game.provider }}
                </p>
              </div>
            </div>
          </div>
        </button>
      </div>

      <div v-if="currentGames.length === 0" class="text-center py-8">
        <p class="text-gray-400 text-sm">{{ t("home.noRecommendedGames") }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { GameItem } from "~/interfaces/game.interface";
import { openGame } from "~~/utils/game-navigation";

const authStore = useAuthStore();
const uiStore = useUiStore();

const siteConfig = useSiteConfig();

const props = withDefaults(
  defineProps<{
    currentGameId?: string;
    hotSlots?: GameItem[];
    navigateWithReplace?: boolean;
  }>(),
  {
    currentGameId: undefined,
    hotSlots: () => [],
    navigateWithReplace: false,
  },
);

const { t } = useI18n();

const loading = ref(true);
const currentPage = ref(0);
const isTransitioning = ref(false);
const gamesPerPage = 6;

const recommendedGames = ref<GameItem[]>([]);

// Filter out current game and populate list
watch(
  () => [props.currentGameId, props.hotSlots] as const,
  ([currentId, slots]) => {
    const filtered = currentId
      ? (slots || []).filter((g) => g.code !== currentId)
      : slots || [];
    recommendedGames.value = filtered;
    loading.value = false;
  },
  { immediate: true },
);

// Pagination computed
const totalPages = computed(() =>
  Math.ceil(recommendedGames.value.length / gamesPerPage),
);
const hasPrevious = computed(() => currentPage.value > 0);
const hasNext = computed(() => currentPage.value < totalPages.value - 1);
const currentGames = computed(() => {
  const start = currentPage.value * gamesPerPage;
  return recommendedGames.value.slice(start, start + gamesPerPage);
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

const handleGameClick = (game: GameItem) => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }

  // Save game info to localStorage
  if (game.game_img) {
    localStorage.setItem("selectedGameImage", game.game_img);
  }
  localStorage.setItem("selectedGameName", game.name);
  if (game.provider) {
    localStorage.setItem("selectedGameProvider", game.provider);
  }

  // Set current game in store
  const lobbyId = game.lobbyId != null ? String(game.lobbyId) : "";
  authStore.setCurrentGame({
    id: game.code,
    name: game.name,
    provider: game.provider,
    type: game.type,
    lobby_id: lobbyId,
  });

  const gameType = game.type.toLowerCase().replace(/^game_/i, "");
  const gameCode = game.code.replace(/^GAME_/i, "");
  const url = lobbyId
    ? `/${gameType}/${gameCode}?lobbyId=${encodeURIComponent(lobbyId)}`
    : `/${gameType}/${gameCode}`;
  openGame(url);
};
</script>
