<template>
  <component :is="navigateAsLink ? nuxtLink : 'div'"
    :to="navigateAsLink ? `/lobbies/${game.id}/games` : undefined"
    class="casino-card relative cursor-pointer group block" :class="fluid ? 'w-full' : 'flex-shrink-0'"
    :style="{
      ...(fluid ? { aspectRatio: aspect } : { width: '186px', height: '250px' }),
      containerType: 'inline-size',
    }"
    @click="onCardClick">
    <!-- Rounded surface — clips the content and carries the corner radius, which
         scales with the card width (container query units; the .casino-card root
         is the query container). -->
    <div class="casino-surface absolute inset-0 overflow-hidden"
      :style="{ backgroundColor: siteConfig.theme.cardFrame.bgColor }">
    <!-- 1. Background gradient (per-section, via prop). Plain <img>: provider
         CDN images aren't routed through IPX (see HotGameCard). Guarded with
         v-if + @error so a missing/failed bg doesn't render the browser's
         broken-image glyph — the card's dark surface (bgColor) shows instead. -->
    <img v-if="game.bgImage && !bgError" :src="game.bgImage" alt="" aria-hidden="true"
      :loading="eager ? 'eager' : 'lazy'"
      class="absolute inset-0 w-full h-full z-0 object-cover object-top pointer-events-none"
      @error="bgError = true">

    <!-- 2. Character art — sits above the gradient, below the frame.
         object-top + slight inset keeps face/body in the visible upper area
         (the bottom strip is covered by the frame's dark band). -->
    <img v-if="game.character && !charError" :src="game.character" :alt="game.name" width="240" height="311"
      :loading="eager ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : undefined"
      class="absolute z-10 object-cover object-top transition-transform duration-300 group-hover:scale-[1.03]"
      style="inset: 0; width: 100%; height: 100%;" @error="charError = true">

    <!-- 3. Decorative frame overlay — pure CSS (see .casino-frame-band below).
         Reproduces the old frame.png: a bottom black→orange gradient band that
         darkens the character's lower third so the provider logo reads. The
         orange border + rounded corners live on .casino-card itself.
         pointer-events-none so the underlying card stays clickable. -->
    <span class="casino-frame-band" :style="{ background: siteConfig.theme.cardFrame.bandGradient }"
      aria-hidden="true" />

    <!-- 4. Brand logo — top-center, above the frame, filtered to white. -->
    <div v-if="siteConfig.identity.logo && (gameType === 'casino' || gameType === 'slot' || gameType === 'sports')"
      class="absolute inset-x-0 flex items-center justify-center z-30 pointer-events-none"
      style="top: 2px; height: 9%;">
      <img :src="siteConfig.identity.logo" :alt="siteConfig.identity.siteName" :loading="eager ? 'eager' : 'lazy'"
        class="object-contain h-full" style="width: auto; max-width: 48%; filter: brightness(0) invert(1);">
    </div>

    <!-- 5. Provider logo — sits on the dark gradient band of the frame
         (or the bottom of the bg when no frame is used). A few slot logos are
         tall/stacked (Pragmatic, Octoplay, Oriental Game) and look dwarfed at
         the default band height, so those specific ids get a taller band. All
         other logos keep the default size. -->
    <div class="flex items-center justify-center z-30 pointer-events-none" :style="logoBoxStyle">
      <img v-if="game.logo && !logoError" :src="game.logo" :alt="game.name" :loading="eager ? 'eager' : 'lazy'"
        class="w-full h-full object-cover" @error="logoError = true">
      <p v-else class="text-white text-[13px] font-bold leading-tight truncate text-center" :title="game.name">
        {{ game.name }}
      </p>
    </div>

    <!-- Hover effects: dim overlay + shimmer sweep (character keeps its scale) -->
    <span class="casino-dim" aria-hidden="true" />
    <span class="casino-shimmer" aria-hidden="true" />

    <!-- Frame ring — drawn as a top overlay rather than a real border on the
         clipping element, so the border never seams against the overflow-clipped
         content at the rounded corners (that seam showed as a thin black line). -->
    <span class="absolute inset-0 z-40 pointer-events-none"
      :style="{ border: `2.5px solid ${siteConfig.theme.cardFrame.borderColor}`, borderRadius: 'inherit' }"
      aria-hidden="true" />
    </div>
  </component>
</template>

<script setup lang="ts">
import { resolveComponent } from "vue";
import { openGame } from "~~/utils/game-navigation";
import { useApi } from "@/composables/useApi";

const authStore = useAuthStore();
const uiStore = useUiStore();

const nuxtLink = resolveComponent("NuxtLink");

interface CasinoProvider {
  id: string | number;
  name: string;
  logo?: string;
  character?: string;
  bgImage: string;
  frameImage?: string;
}

const logoError = ref(false);
const charError = ref(false);
const bgError = ref(false);

const props = withDefaults(
  defineProps<{
    game: CasinoProvider;
    gameType?: "casino" | "sports" | "slot";
    eager?: boolean;
    priority?: boolean;
    // When true the card fills its grid cell and keeps the `aspect` ratio
    // (used by the responsive /casino and /sports pages). When false
    // (default) it renders at the fixed 186×250 size used in homepage rows.
    fluid?: boolean;
    // Fluid aspect ratio. Defaults to the card art's native 186:250; the
    // homepage rows pass 200:250 so these cards match the Hot cards' box
    // (3-per-row + identical height).
    aspect?: string;
  }>(),
  {
    gameType: "casino",
    eager: false,
    priority: false,
    fluid: false,
    aspect: "186 / 250",
  },
);

const siteConfig = useSiteConfig();

// Slot lobbies have sub-games: the card is a link to the lobby's game list
// (mirrors LobbyCard subGames behaviour) rather than launching directly.
const isSubGames = computed(() => props.gameType === "slot");

// Only render the slot card as a navigating <NuxtLink> for logged-in users.
// Guests fall through to the click handler, which opens the login modal.
const navigateAsLink = computed(
  () => isSubGames.value && authStore.isAuthenticated,
);

// Unified click: guests always get the login modal; authenticated slot cards
// navigate via the NuxtLink (no work here); casino/sports launch the game.
function onCardClick() {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  if (isSubGames.value) return;
  handleClick();
}

// Provider logo box fills the whole card (100% × 100%); object-contain keeps
// the logo undistorted.
const logoBoxStyle = {
  position: "absolute" as const,
  inset: 0,
};

// Mirrors LobbyCard.openGamePopup so homepage cards launch identically to
// the /casino and /sports lobby pages. Casino lobbies launch by lobby id
// directly; sports lobbies require a sub-game lookup (backend rejects
// lobby-only launch for non-casino types with GAME_REQUIRED_FOR_NON_CASINO).
async function handleClick() {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }

  try {
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
      openGame(
        `/${props.gameType}/${firstGame.id}?lobbyId=${encodeURIComponent(String(props.game.id))}`,
      );
      return;
    }

    openGame(`/${props.gameType}/${props.game.id}`);
  } catch (err) {
    console.error("Failed to open game:", err);
  }
}
</script>

<style scoped>
/* Top + bottom dark gradient bands — replaces frame.png's overlay. Sits above
   the character (z-10) but below hover/logo layers (z-25+). The gradient itself
   is injected via :style from siteConfig.theme.cardFrame.bandGradient so the
   colors are config-driven. */
/* Corner radius lives on the rounded surface; the frame ring + band inherit it
   so all corners stay aligned. */
.casino-surface {
  border-radius: 20.32px;
}

/* Smaller corner radius on mobile (the frame ring + band inherit this). */
@media (max-width: 767px) {
  .casino-surface {
    border-radius: 15px;
  }
}

.casino-frame-band {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  border-radius: inherit;
}

/* Hover: dim overlay + diagonal shimmer sweep. The character keeps its own
   group-hover scale — these overlays sit above it. */
.casino-dim {
  position: absolute;
  inset: 0;
  z-index: 25;
  pointer-events: none;
  background: #000;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.casino-card:hover .casino-dim {
  opacity: 0.18;
}

.casino-shimmer {
  position: absolute;
  inset: 0;
  z-index: 26;
  pointer-events: none;
  overflow: hidden;
}

.casino-shimmer::before {
  content: "";
  position: absolute;
  top: -25%;
  left: -75%;
  width: 50%;
  height: 150%;
  transform: skewX(-20deg);
  background: linear-gradient(90deg,
      rgba(255, 255, 255, 0) 0%,
      rgba(255, 255, 255, 0.5) 50%,
      rgba(255, 255, 255, 0) 100%);
  opacity: 0;
}

.casino-card:hover .casino-shimmer::before {
  animation: casino-shimmer 2s ease infinite;
}

@keyframes casino-shimmer {
  0% {
    left: -75%;
    opacity: 0;
  }

  8% {
    opacity: 1;
  }

  40% {
    left: 125%;
    opacity: 0;
  }

  100% {
    left: 125%;
    opacity: 0;
  }
}
</style>
