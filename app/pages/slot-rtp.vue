<template>
  <GamePageLayout>
    <h1 class="sr-only">{{ $t("navbar.rtp") }} - {{ siteConfig.identity.siteName }}</h1>

    <!-- Provider tabs — pinned under the header on scroll.
         From lg up this is real `position: sticky`, which needs NO scroll
         container between here and the document: main.css drops body's
         `overflow-x` at that width, and default.vue's <main> adds
         `lg:overflow-visible` (it is `overflow-x-auto overflow-y-hidden`
         otherwise, which silently disables sticky for every page inside it).
         The bar then stays inside the content column at the column's width,
         identical pinned or not. It used to go `fixed left-0 right-0`, which
         tore it out of the column and stretched it across the viewport.
         Below lg body is still a scroll container, so sticky cannot engage and
         the JS fixed+spacer path remains: the anchor reserves the bar's height
         so the grid underneath does not jump.
         `providerStuck` drives the pinned BACKGROUND at both breakpoints — CSS
         alone cannot tell whether a sticky element is currently pinned. Same
         framed look as the slot cards (selected = orange highlight).

         The sticky sits on THIS element, not the bar inside it. A sticky element
         only travels within its parent's box, and the inner bar's parent is this
         wrapper — which is exactly the bar's own height, so it would have no
         distance to travel and would appear not to stick at all. Here the parent
         is GamePageLayout's games container, which spans the whole grid. -->
    <div v-if="providers.length" ref="providerAnchor" class="lg:sticky lg:z-40"
      :style="[
        { top: STICKY_TOP },
        providerStuck && !isLgUp ? { height: providerBarH + 'px' } : {},
      ]">
      <div class="w-full"
        :class="providerStuck && !isLgUp ? 'fixed left-0 right-0 z-30' : ''"
        :style="providerStuck && !isLgUp ? { top: STICKY_TOP } : {}">
        <!-- Padding only needs rewriting on the FIXED path (below lg), where the
             bar escapes GamePageLayout and must reproduce its ancestors'
             effective padding: game-page-bg px-1.5 + providerBar px-1.5 = 12px.
             The lg+ sticky path never leaves the column, so it keeps the normal
             padding and stays identical pinned or not. -->
        <div ref="providerBar" class="w-full mx-auto"
          :class="providerStuck && !isLgUp ? 'px-3' : 'px-1.5 lg:px-0'"
          :style="providerStuck ? { backgroundColor: bodyBg, boxShadow: '0 6px 12px rgba(0,0,0,0.45)' } : {}">
          <div class="relative mb-1">
            <!-- Scrollable strip -->
            <div ref="stripRef" @scroll="updateState"
              class="rtp-tabs carousel-scroll flex gap-2 overflow-x-auto overflow-y-hidden cursor-grab active:cursor-grabbing select-none"
              :class="providerStuck ? 'pb-1.5' : 'py-1.5'">
              <button v-for="p in providers" :key="p.id" type="button"
                class="prov-tab cursor-grab active:cursor-grabbing shrink-0 relative flex flex-col items-center h-[70px] sm:h-[84px] w-[calc((100%-1rem)/3)] max-w-[150px] sm:w-[calc((100%-2rem)/5)] sm:max-w-none lg:w-[calc((100%-2.5rem)/6)] rounded-lg overflow-hidden border-2 transition-all duration-200"
                :style="selectedLobby === p.id
                  ? { borderColor: cardFrame.borderColor, boxShadow: `0 0 12px ${cardFrame.borderColor}66` }
                  : { borderColor: 'rgba(255,255,255,0.1)' }" @click="selectedLobby = p.id">
                <!-- Slot background (the character/avatar is intentionally dropped —
                 the provider logo below stands in for it). -->
                <img :src="slotBg" alt="" aria-hidden="true" class="absolute inset-0 w-full h-full object-cover">
                <span class="absolute inset-0 pointer-events-none" :style="{ background: cardFrame.bandGradient }"
                  aria-hidden="true" />
                <!-- Dim everything for the unselected state — sits above the logos
                 (z-10) so the brand + provider logos are dimmed too, not just the
                 background. -->
                <span v-if="selectedLobby !== p.id" class="absolute inset-0 z-20 bg-black/20 pointer-events-none"
                  aria-hidden="true" />

                <!-- Brand logo (white) — an absolute overlay pinned to the top so it
                 doesn't consume flex space; that lets the provider logo center in the
                 FULL tab rather than only the region below it. -->
                <img :src="brandLogo" alt=""
                  class="absolute top-1 left-1/2 -translate-x-1/2 z-10 h-2.5 w-auto max-w-[64px] object-contain"
                  style="filter: brightness(0) invert(1)">
                <!-- Provider logo (main image). The assets are uniform 480x627
                 portrait canvases whose wordmark is a small band near the
                 bottom, so any plain object-fit renders it tiny: `contain` fits
                 the WHOLE empty canvas into the tab, and `cover` only works
                 with a per-logo object-position that crops to the band.

                 TrimmedImage instead measures the opaque bounding box on a
                 canvas and SCALES that content to fill the tab — the wordmark
                 comes out large at its natural aspect, with nothing cropped.
                 `fit="contain"` fits it inside both the height and the tab
                 width, so a wide wordmark renders shorter rather than losing
                 its ends.

                 This was previously ruled out because the logos came from the
                 Linode bucket, which sends no CORS headers and taints the
                 canvas. They are served same-origin from `public/` now (see
                 `providers` below), so the measurement works. -->
                <!-- The box is deliberately smaller than the tab: `fit="contain"`
                     scales the wordmark to fill whatever box it is given, so the
                     tab's breathing room has to come from here. ~45% of the tab
                     height, inset `px-3`, and pushed just below centre (`pt-3`)
                     to clear the JAE|SOLUTION strip pinned at the top. -->
                <div class="absolute inset-0 z-10 flex items-center justify-center px-3 pt-3 w-full">
                  <TrimmedImage v-if="!failedLogos[p.id]" :src="p.logo" :alt="p.name" fit="contain" loading="eager"
                    class="h-8 sm:h-10 w-full" @error="failedLogos[p.id] = true" />
                  <span v-else class="text-xs font-bold text-center leading-tight whitespace-nowrap text-white">
                    {{ p.name }}
                  </span>
                </div>
                <!-- Hover shimmer sweep (like the slot cards). -->
                <span class="prov-shimmer" aria-hidden="true" />
              </button>
            </div>

            <!-- Arrows follow scroll position: left hidden at the start (already
                 fully left), right hidden once scrolled to the end. -->
            <CarouselArrow v-show="!isAtLeft" direction="left" @click="scrollLeft" />
            <CarouselArrow v-show="!isAtRight" direction="right" @click="scrollRight" />
          </div>
        </div>
      </div>
    </div>

    <div class="w-full mx-auto px-1.5 lg:px-0">
      <!-- Loading -->
      <div v-if="isLoading" class="w-full py-12 text-center text-gray-400 text-sm">
        {{ $t("common.loading") }}
      </div>

      <!-- Game grid -->
      <template v-else-if="games.length">
        <div class="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-2">
          <div v-for="g in games" :key="g.id" class="cursor-pointer" @click="handleGameClick(g)">
            <RtpGameCard :game="g" />
          </div>
        </div>
        <PaginationBar :current-page="currentPage" :total-pages="totalPages" @page-change="onPageChange" />
      </template>

      <!-- Empty -->
      <div v-else class="w-full py-12 text-center text-gray-400 text-sm">
        {{ $t("common.noGamesFound") }}
      </div>
    </div>
  </GamePageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onBeforeUnmount } from "vue";
import { openGame } from "~~/utils/game-navigation";
import {
  mapGameListItem,
  type GameListItemWire,
  type NormalizedGame,
} from "@/interfaces/game.interface";

definePageMeta({
  layout: "default",
});

const authStore = useAuthStore();
const uiStore = useUiStore();

interface Game {
  id: string | number;
  game_name_en: string;
  game_img?: string;
  lobby?: string;
}
type RemoteResponse =
  | Game[]
  | {
      data?: Game[];
      games?: Game[];
      rows?: number;
      total?: number;
      meta?: { total?: number };
    }
  | null;

const { t } = useI18n();
const siteConfig = useSiteConfig();
const api = useApi();

// Slot providers (lobbies) feed the tab row; a lobby_id is required to list
// games, so the first provider is auto-selected.
const { lobbies } = useLobbyPage("slot");
// Provider logos are the /designs/slot-logo/<id>.webp files built by
// lobbyLogoUrl — the same source the homepage slot cards, /slots, /casino and
// /sports use (not the CMS/API logo_path).
const slotLogoBase = computed(() => siteConfig.assets.homepage.gameLogos.slot);
const providers = computed(() =>
  (lobbies.value ?? []).map((l) => {
    const id = String(l.id);
    return {
      id,
      name: l.game_name ?? "",
      // Served same-origin from `public/`, NOT through cdn(). This page was the
      // only one wrapping the path in cdn(), and the Linode bucket is behind:
      // it holds 41 slot logos against the 112 in `public/`, so 71 of the 108
      // slot lobbies 404'd and fell back to their text name. The four other
      // pages that render these logos never went to the bucket.
      logo: lobbyLogoUrl(slotLogoBase.value, l.id),
    };
  }),
);
// Per-provider logo load failures → fall back to the text name.
const failedLogos = ref<Record<string, boolean>>({});

// Card frame tokens (orange border / dark bg) shared with the slot cards.
const cardFrame = computed(() => siteConfig.theme.cardFrame);
// Slot thumbnail background + brand logo, reused for the provider tabs.
const slotBg = computed(() => siteConfig.assets.homepage.gameBg.slot);
const brandLogo = computed(() => siteConfig.identity.logo);

// Provider strip scrolling — reuses the game-carousel arrow behaviour
// (CarouselArrow + useCarouselScroll), so the arrows match the rest of the app
// and auto-hide at the ends.
const stripRef = ref<HTMLElement | null>(null);
const { isAtLeft, isAtRight, scrollLeft, scrollRight, updateState } =
  useCarouselScroll(stripRef, {
    step: 124,
    perPage: 2,
  });

// Body background painted behind the provider bar while it's stuck, so game
// cards scrolling underneath it are covered.
const bodyBg = computed(() => siteConfig.theme.bodyBgColor);

// Provider bar pinning.
//
// lg and up: CSS `position: sticky` does the positioning (main.css drops body's
// `overflow-x` at that width so sticky can engage), and `providerStuck` is used
// ONLY to paint the pinned background — CSS cannot report whether a sticky
// element is currently pinned.
//
// Below lg: body is still a scroll container, so sticky cannot engage and the
// JS fixed+spacer path runs, with the anchor reserving the bar's flow height.
const providerAnchor = ref<HTMLElement | null>(null);
const providerBar = ref<HTMLElement | null>(null);
const providerStuck = ref(false);
const providerBarH = ref(0);
const isLgUp = ref(false);

// Where the bar pins: the bottom of the header, PLUS the signed-in mobile user
// bar when that is itself pinned there. Both CSS vars are written to <html> by
// the layout (`--mh-header-height` also pre-paint by app.vue); the user-bar one
// is 0px for guests, at lg+ and whenever that bar is not pinned, so the same
// expression is correct at every breakpoint and session state. Without the
// second term this bar pinned at the header's bottom edge and landed straight
// on top of the user bar on mobile.
const STICKY_TOP = "calc(var(--mh-header-height, 60px) + var(--mh-userbar-height, 0px))";

// The px twin of STICKY_TOP, used as the scroll threshold — the bar must pin at
// the exact moment its flow position reaches that line, or it jumps.
const stickyTopPx = () => {
  if (typeof window === "undefined") return 60;
  const cs = getComputedStyle(document.documentElement);
  const read = (name: string, fallback: number) => {
    const n = parseInt(cs.getPropertyValue(name), 10);
    return Number.isFinite(n) ? n : fallback;
  };
  return read("--mh-header-height", 60) + read("--mh-userbar-height", 0);
};

let stickyRaf: number | null = null;
const onStickyScroll = () => {
  if (stickyRaf !== null) return;
  stickyRaf = requestAnimationFrame(() => {
    stickyRaf = null;
    const anchor = providerAnchor.value;
    if (!anchor) return;
    isLgUp.value = window.innerWidth >= 1024;
    const top = anchor.getBoundingClientRect().top;
    const stickyTop = stickyTopPx();
    if (!providerStuck.value) {
      if (top <= stickyTop) {
        // Measure before pinning so the spacer keeps the exact flow height.
        // Only the fixed path uses it, but measuring here keeps it correct if
        // the viewport crosses lg while pinned.
        providerBarH.value = providerBar.value?.offsetHeight ?? anchor.offsetHeight;
        providerStuck.value = true;
      }
    } else if (top > stickyTop) {
      providerStuck.value = false;
    }
    // The strip's usable width can change when it goes fixed — refresh arrows.
    updateState();
  });
};

onMounted(() => {
  window.addEventListener("scroll", onStickyScroll, { passive: true });
  window.addEventListener("resize", onStickyScroll, { passive: true });
  onStickyScroll();
});
onBeforeUnmount(() => {
  window.removeEventListener("scroll", onStickyScroll);
  window.removeEventListener("resize", onStickyScroll);
  if (stickyRaf !== null) cancelAnimationFrame(stickyRaf);
});


const selectedLobby = ref("");
watch(
  providers,
  (list) => {
    const firstProvider = list[0];
    if (!selectedLobby.value && firstProvider) selectedLobby.value = firstProvider.id;
  },
  { immediate: true },
);

// Clicking a game launches it — but guests get the login modal first (same flow
// as the lobby games grid).
const handleGameClick = (game: NormalizedGame) => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  const lobbyId = selectedLobby.value || "";
  authStore.setCurrentGame({
    id: String(game.id),
    name: game.game_name_en ?? "",
    provider: game.lobby || "",
    type: "slot",
    lobby_id: lobbyId,
  });
  const url = lobbyId
    ? `/slot/${game.id}?lobbyId=${encodeURIComponent(lobbyId)}`
    : `/slot/${game.id}`;
  openGame(url);
};

// Games for the selected provider — fetched imperatively whenever the tab or
// page changes (client-side). Done with a plain watch + ref rather than
// useAsyncData because the lobby id is only known after the lobbies load, which
// doesn't play well with useAsyncData's hydration keying. The RTP bars are
// placeholder values rendered per card.
const GAMES_PER_PAGE = 24;
const games = ref<NormalizedGame[]>([]);
const gamesLoading = ref(false);
const currentPage = ref(1);
const totalGames = ref(0);
const totalPages = computed(() =>
  Math.max(1, Math.ceil(totalGames.value / GAMES_PER_PAGE)),
);
async function loadGames() {
  if (!selectedLobby.value) {
    games.value = [];
    totalGames.value = 0;
    return;
  }
  gamesLoading.value = true;
  try {
    const res = await api<RemoteResponse>("/games", {
      query: { lobbyId: selectedLobby.value, page: currentPage.value, limit: GAMES_PER_PAGE },
    });
    const raw = Array.isArray(res) ? res : res?.data || res?.games || [];
    // Normalize each row's camelCase wire shape to the snake_case the cards read.
    games.value = raw.map((g) => mapGameListItem(g as unknown as GameListItemWire));
    totalGames.value = Array.isArray(res)
      ? raw.length
      : Number(res?.meta?.total) || Number(res?.rows) || Number(res?.total) || raw.length;
  } catch {
    games.value = [];
    totalGames.value = 0;
  } finally {
    gamesLoading.value = false;
  }
}
// Reset to page 1 when switching providers, then load.
watch(selectedLobby, () => {
  currentPage.value = 1;
  loadGames();
}, { immediate: true });

function onPageChange(page: number) {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  currentPage.value = page;
  loadGames();
  if (import.meta.client) window.scrollTo({ top: 0, behavior: "smooth" });
}

const isLoading = computed(() => gamesLoading.value || !providers.value.length);

useSeoHead({
  title: t("navbar.rtp"),
});
</script>

<style scoped>
/* Hide the scrollbar on the provider strip. */
.rtp-tabs {
  scrollbar-width: none;
}

.rtp-tabs::-webkit-scrollbar {
  display: none;
}

/* Diagonal shimmer sweep on provider-tab hover (like the slot cards). */
.prov-shimmer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
  border-radius: inherit;
}

.prov-shimmer::before {
  content: "";
  position: absolute;
  top: -25%;
  left: -75%;
  width: 50%;
  height: 150%;
  transform: skewX(-20deg);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.45) 50%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
}

.prov-tab:hover .prov-shimmer::before {
  animation: prov-shimmer 1.6s ease;
}

@keyframes prov-shimmer {
  0% {
    left: -75%;
    opacity: 0;
  }

  10% {
    opacity: 1;
  }

  60% {
    left: 125%;
    opacity: 0;
  }

  100% {
    left: 125%;
    opacity: 0;
  }
}
</style>
