<template>
  <component
    :is="subGames ? nuxtLink : 'div'"
    :to="subGames ? `/lobbies/${game.id}/games` : undefined"
    class="relative w-full cursor-pointer hover:scale-105 transition-transform duration-300 overflow-hidden rounded-lg bg-black/30"
    style="aspect-ratio: 280 / 188"
    @click="!subGames ? openGamePopup() : undefined"
  >
    <template v-if="hasAssets">
      <!-- PNG mode: single static image, no layered GIF/borders/character/logo -->
      <template v-if="isPngMode">
        <div class="absolute inset-0 z-[2]">
          <img
            :src="pngSrc"
            :alt="`${game.game_name}`"
            loading="lazy"
            class="absolute inset-0 w-full h-full object-contain"
          >
        </div>
      </template>

      <!-- GIF mode (default): layered background + borders + character + logo -->
      <template v-else>
        <!-- Shimmer skeleton while the background GIF is downloading.
             Hidden as soon as the background image fires `load`. -->
        <div
          v-if="!bgLoaded"
          class="skeleton-card absolute inset-0 z-[1] pointer-events-none"
          aria-hidden="true"
        />

        <!-- Background GIF -->
        <div class="absolute inset-0 z-[2]">
          <img
            :src="thumbnailSrc"
            :alt="`${game.game_name} background`"
            loading="lazy"
            class="absolute inset-0 w-full h-full object-contain"
            @load="bgLoaded = true"
            @error="bgLoaded = true">
        </div>
        <!-- Top border -->
        <div class="absolute inset-0 z-10">
          <img
            :src="lobbyCard.topBorder"
            :alt="altFromSrc(lobbyCard.topBorder)"
            loading="lazy"
            class="absolute inset-0 w-full h-full object-contain object-top"
          >
        </div>
        <!-- Bottom border -->
        <div class="absolute inset-0 z-20">
          <img
            :src="lobbyCard.bottomBorder"
            :alt="altFromSrc(lobbyCard.bottomBorder)"
            loading="lazy"
            class="absolute inset-0 w-full h-full object-fill object-bottom"
          >
        </div>
        <!-- Character GIF/PNG -->
        <div class="absolute inset-0 z-[15]">
          <img
            :src="characterSrc"
            :alt="`${game.game_name} character`"
            loading="lazy"
            :class="[
              'absolute inset-0 w-full h-full object-contain',
              { 'character-zoom': usePng },
            ]"
          >
        </div>
        <!-- Logo PNG -->
        <div class="absolute inset-0 z-[21]">
          <img
            :src="game.logo_path"
            :alt="`${game.game_name} logo`"
            loading="lazy"
            class="absolute inset-0 w-full h-full object-contain"
          >
        </div>

        <!-- Ratio Badge -->
        <img
          v-if="showRatio"
          :src="siteConfig.assets.images.ratio"
          alt="Ratio"
          loading="lazy"
          class="absolute z-[22]"
          style="left: 6.43%; top: 35.1%; width: 41.4%"
        >
      </template>
    </template>

    <!-- Fallback card for types without full image assets -->
    <template v-else>
      <div
        class="w-full h-full bg-gray-800 flex flex-col items-center justify-center p-3"
      >
        <p class="text-white text-sm font-medium text-center line-clamp-2">
          {{ game.game_name }}
        </p>
      </div>
    </template>
  </component>
</template>

<script setup lang="ts">
import { computed, ref, resolveComponent } from "vue";
import { openGame } from "~~/utils/game-navigation";
import { useApi } from "@/composables/useApi";

const authStore = useAuthStore();
const uiStore = useUiStore();

const nuxtLink = resolveComponent("NuxtLink");
const siteConfig = useSiteConfig();
const { lobbyCard } = siteConfig.assets;

// Tracks whether the background GIF has finished loading (or errored). Used
// to hide the loading spinner overlay once the visual has come in.
const bgLoaded = ref(false);

interface GameLobby {
  id: string;
  game_name: string;
  game_type: string;
  character_gif_path: string | undefined;
  character_png_path: string | undefined;
  logo_path: string | undefined;
  image_path?: string | null;
}

const props = defineProps<{
  game: GameLobby;
  gameType: string;
  subGames?: boolean;
}>();

const SUPPORTED_TYPES = ["slot", "casino", "sports", "mini"];
const hasAssets = computed(() => SUPPORTED_TYPES.includes(props.gameType));

const isPngMode = computed(
  () => String((lobbyCard as { mode?: string }).mode ?? "GIF").toUpperCase() === "PNG",
);
const pngSrc = computed(() => props.game.image_path || props.game.logo_path || "");

const thumbnailSrc = computed(() => {
  const suffix = uiStore.isMobile ? "Mobile" : "Web";
  const key = `${props.gameType}${suffix}`;
  const fromApi = lobbyCard.thumbnail?.[key];
  if (fromApi) return fromApi;
  // fallback to path-based
  const basePath = uiStore.isMobile
    ? lobbyCard.thumbnailBgPathMobile
    : lobbyCard.thumbnailBgPathWeb;
  return `${basePath}/${props.gameType}.gif`;
});

const PNG_TYPES = ["casino", "mini", "sports"];
const usePng = computed(
  () => uiStore.isMobile && PNG_TYPES.includes(props.gameType),
);
const characterSrc = computed(() =>
  usePng.value ? props.game.character_png_path : props.game.character_gif_path,
);

const RATIO_IDS: Record<string, string[]> = {
  casino: ["12", "3", "1", "52"],
  sports: ["50", "56"],
  slot: ["17", "21", "20", "28"],
};
const showRatio = computed(() =>
  RATIO_IDS[props.gameType]?.includes(String(props.game.id)),
);

async function openGamePopup() {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }

  try {
    // Sports lobbies are non-casino on the backend, so /games/launch
    // requires both lobby + game (else 400 GAME_REQUIRED_FOR_NON_CASINO).
    // Resolve the first sub-game for this lobby and pass it via the
    // launcher's existing `lobbyId` query param. `limit` must be >= 10
    // per /games validator (game.validator.ts:62).
    if (props.gameType === "sports") {
      const api = useApi();
      type GameListItem = { id?: string | number };
      type GamesResponse =
        | GameListItem[]
        | { data?: GameListItem[]; games?: GameListItem[] };
      const body = await api<GamesResponse>(
        `/games?page=1&limit=10&lobby_id=${props.game.id}`,
      );
      const list = Array.isArray(body)
        ? body
        : (body?.data ?? body?.games ?? []);
      const firstGame = Array.isArray(list) ? list[0] : null;
      if (!firstGame?.id) {
        console.error("No sub-game found for sports lobby", props.game.id);
        return;
      }
      const url = `/${props.gameType}/${firstGame.id}?lobbyId=${encodeURIComponent(props.game.id)}`;
      openGame(url);
      return;
    }

    // Casino: lobby id IS the launchable id (backend treats CASINO type
    // specially and allows lobby-only launch).
    const url = `/${props.gameType}/${props.game.id}`;
    openGame(url);
  } catch (err) {
    console.error("Failed to open game:", err);
  }
}
</script>

<style scoped>
.character-zoom {
  animation: characterZoom 3s ease-in-out infinite;
}

@keyframes characterZoom {
  0%,
  100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

</style>
