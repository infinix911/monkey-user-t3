<template>
  <section id="provider-games" class="w-full max-w-[1152px] mb-[2rem]">
    <header v-if="logo || showSearch !== false" class="flex justify-between gap-2 mb-5 lg:mb-7"
      :class="logo ? 'flex-row items-end px-2 pt-4' : 'flex-col items-end px-2 sm:flex-row'">
      <!-- Left: provider logo (lobby pages). TrimmedImage alpha-scans the asset,
           crops away its transparent margins, and fills the box height at the
           content's real aspect — width auto-follows (no distortion, no surrounding
           whitespace) — the equivalent of object-cover for these tall, mostly-
           transparent logos whose wordmark sits in the bottom ~25%. Height is
           68px for Pragmatic (compact wordmark) and 48px otherwise. Falls back to
           the provider name, then a spacer (e.g. /hot). -->
      <div v-if="logo" class="w-1/2 sm:w-[260px] flex items-end">
        <TrimmedImage v-if="!logoError" :src="logo" :alt="providerName || ''" fit="contain" align="left"
          :class="[logoHeightClass, 'w-full']" @error="logoError = true" />
        <span v-else class="text-white font-bold text-sm sm:text-base truncate max-w-[130px]">{{ providerName }}</span>
      </div>
      <div v-else class="hidden sm:block flex-shrink-0 w-[200px]" />
      <!-- Outer div carries the mobile side padding (no-logo / hot page). The
           inner `relative` wrapper is the icon's positioning context, so the icon
           aligns with the input's edge regardless of that outer padding (on /hot
           the padding otherwise pushed the input in while the icon stayed put). -->
      <div v-if="showSearch !== false" class="flex-shrink-0" :class="logo ? 'w-1/2 sm:w-auto' : 'w-1/2 sm:w-auto mt-2'">
        <div class="relative">
          <div class="pointer-events-none absolute left-[10px] sm:left-3 top-1/2 -translate-y-1/2 text-[#D4AF37]">
            <!-- Spinner while a search/page refetch is in flight; magnifier otherwise. -->
            <svg v-if="isLoading" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" class="h-4 w-4 animate-spin"
              aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-4 w-4"
              aria-hidden="true">
              <path d="m21 21-4.34-4.34" />
              <circle cx="11" cy="11" r="8" />
            </svg>
          </div>
          <input v-model="searchQuery" :placeholder="$t('common.search')" type="text"
            class="w-full sm:min-w-[280px] sm:max-w-[400px] h-10 rounded-lg border border-[#C9A500] bg-[#1a1a1a] pl-10 pr-4 py-2 text-sm text-white placeholder:text-[#D4AF37] focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/30 focus:border-[#D4AF37] transition-all duration-200">
        </div>
      </div>
    </header>

    <!-- Games Grid — hot-games style cards in a responsive CSS grid. Column
         count (3 / 4 / 6 by breakpoint) is fixed in CSS so the layout is
         correct in the SSR HTML and never reflows on hydration; each fluid
         card fills its 1fr track and keeps the 200:250 aspect ratio. -->
    <div class="w-full" :class="(logo || showSearch !== false) ? '' : 'mt-[10px] sm:mt-[8px]'">
      <div class="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-[5px]">
        <div v-for="game in filteredGames" :key="game.id" class="cursor-pointer" @click="handleGameClick(game)">
          <HotGameCard :game="game" fluid />
        </div>
      </div>
    </div>

    <!-- Empty search result (local narrowing OR a server search that matched nothing) -->
    <div v-if="filteredGames.length === 0 && (games.length > 0 || searchQuery.trim())" class="py-12 text-center">
      <p class="text-gray-400 text-sm">{{ $t("common.noGamesFound") }}</p>
    </div>

    <!-- Pagination -->
    <div v-if="totalPages > 1" class="mt-6 sm:mt-8 relative flex flex-col items-center justify-center">
      <div
        class="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent z-0" />
      <div
        class="relative z-10 flex items-center gap-1 sm:gap-2 bg-[#1a1a1a] rounded-lg px-2 sm:px-4 py-2 border border-[#4a4a4a]">
        <!-- Prev -->
        <button :disabled="currentPage <= 1"
          class="cursor-pointer flex items-center gap-1 text-[#cecece] hover:text-white disabled:text-[#6b6b6b] disabled:cursor-not-allowed transition-colors px-1 sm:px-2 py-1"
          @click="emit('page-change', currentPage - 1)">
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"
            aria-hidden="true">
            <path d="m15 18-6-6 6-6" />
          </svg>
          <span class="text-xs sm:text-sm hidden sm:inline">{{
            $t("common.previous")
          }}</span>
        </button>

        <!-- Page numbers -->
        <div class="flex items-center gap-0.5 sm:gap-1">
          <template v-for="item in pageItems" :key="item">
            <span v-if="item === '...'" class="text-[#cecece] px-1 sm:px-2 text-xs sm:text-sm">...</span>
            <button v-else :class="[
              'min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
              item === currentPage
                ? 'bg-gradient-to-br from-[#D4AF37] to-[#C9A500] text-black shadow-md shadow-[#D4AF37]/30'
                : 'text-[#cecece] hover:text-white hover:bg-[#2a2a2a]',
            ]" @click="emit('page-change', item as number)">
              {{ item }}
            </button>
          </template>
        </div>

        <!-- Next -->
        <button :disabled="currentPage >= totalPages"
          class="cursor-pointer flex items-center gap-1 text-[#cecece] hover:text-white disabled:text-[#6b6b6b] disabled:cursor-not-allowed transition-colors px-1 sm:px-2 py-1"
          @click="emit('page-change', currentPage + 1)">
          <span class="text-xs sm:text-sm hidden sm:inline">{{
            $t("common.next")
          }}</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"
            aria-hidden="true">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { openGame } from "~~/utils/game-navigation";

const authStore = useAuthStore();
const uiStore = useUiStore();

const _router = useRouter();

interface Game {
  id: string | number;
  game_name_en: string;
  game_img?: string;
  game_type?: string;
  lobby?: string;
  lobby_id?: string;
}

const props = defineProps<{
  games: Game[];
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  // Optional provider logo (left of the header) + name fallback — used by the
  // lobby games page. Omitted elsewhere (e.g. /hot) to keep the original header.
  logo?: string;
  providerName?: string;
  // Show the search field. Defaults to on; /hot passes false to hide it.
  showSearch?: boolean;
  // Seeds the search input so a shared/refreshed URL (?q=...) shows its term.
  initialSearch?: string;
}>();

const logoError = ref(false);

// Pragmatic's wordmark is short/compact, so it needs a taller box than the wider
// provider logos to read at the same visual weight. Heights are smaller on mobile
// (the logo otherwise dwarfs the search bar) and grow at md.
const logoHeightClass = computed(() =>
  /pragmatic/i.test(props.providerName ?? "")
    ? "h-[44px] md:h-[68px]"
    : "h-[34px] md:h-[48px]",
);

const emit = defineEmits<{
  "page-change": [page: number];
  // Debounced search term — the parent forwards it to the backend `game_name`
  // filter so search spans the whole lobby, not just the loaded page.
  search: [query: string];
}>();

const searchQuery = ref(props.initialSearch ?? "");

// Debounce so we don't refetch on every keystroke — waits until typing pauses.
// Emits the trimmed term; the parent turns an empty string back into the
// unfiltered listing. `flush`-guarded so re-emitting the same term is a no-op.
let searchTimer: ReturnType<typeof setTimeout> | undefined;
let lastEmitted = props.initialSearch ?? "";
watch(searchQuery, (val) => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const term = val.trim();
    if (term === lastEmitted) return;
    lastEmitted = term;
    emit("search", term);
  }, 500);
});

const handleGameClick = (game: Game) => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  authStore.setCurrentGame({
    id: String(game.id),
    name: game.game_name_en,
    provider: game.lobby || "",
    type: game.game_type || "slot",
    lobby_id: game.lobby_id || "",
  });
  const gameType = game.game_type || "slot";
  const lobbyId = game.lobby_id || "";
  const url = lobbyId
    ? `/${gameType}/${game.id}?lobbyId=${encodeURIComponent(lobbyId)}`
    : `/${gameType}/${game.id}`;
  openGame(url);
};

const filteredGames = computed(() => {
  if (!searchQuery.value.trim()) return props.games;
  const q = searchQuery.value.toLowerCase();
  return props.games.filter((g) => g.game_name_en?.toLowerCase().includes(q));
});

const pageItems = computed<(number | "...")[]>(() => {
  const total = props.totalPages;
  const curr = props.currentPage;

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | "...")[] = [1];
  if (curr > 3) items.push("...");
  for (let p = Math.max(2, curr - 1); p <= Math.min(total - 1, curr + 1); p++) {
    items.push(p);
  }
  if (curr < total - 2) items.push("...");
  items.push(total);
  return items;
});
</script>
