<template>
  <GamePageLayout>
    <h1 class="sr-only">{{ $t("navbar.rtp") }} - {{ siteConfig.identity.siteName }}</h1>

    <!-- Provider tabs — sticky under the header on scroll. The anchor stays in
         flow and reserves the bar's height (spacer) while the bar is fixed, so
         the grid below doesn't jump. CSS position:sticky is unavailable here
         (html/body have overflow-x:auto — see default.vue), so this uses the
         same JS fixed+spacer approach as the category navbar. Same framed look
         as the slot cards (selected = orange highlight). -->
    <div v-if="providers.length" ref="providerAnchor" :style="providerStuck ? { height: providerBarH + 'px' } : {}">
      <div :class="['w-full', providerStuck ? 'fixed left-0 right-0 z-40' : '']"
        :style="providerStuck ? { top: 'var(--mh-header-height, 60px)' } : {}">
        <!-- When stuck the bar is position:fixed and escapes GamePageLayout's
             padding, so it must reproduce the ancestors' effective padding at
             every breakpoint to stay identical to the non-stuck state:
               mobile (<lg): game-page-bg px-1.5 + providerBar px-1.5 = 12px → px-3
               lg (1024–1279): inner container lg:px-3            = 12px → px-3
               xl (≥1280):     inner container xl:px-0            = 0    → xl:px-0
             Non-stuck keeps px-1.5 lg:px-0 because the ancestors supply the rest. -->
        <div ref="providerBar" class="w-full max-w-[1152px] mx-auto"
          :class="providerStuck ? 'px-3 xl:px-0' : 'px-1.5 lg:px-0'"
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
                <!-- Provider logo (main image), served from the S3 CDN. Rendered
                 as a plain <img> (not TrimmedImage) — the bucket sends no CORS
                 headers, so canvas trimming can't run cross-origin. The assets are
                 uniform 480×627 portrait canvases with the wordmark in a bottom band;
                 object-cover in a fixed 5:2 box scales that band up (AppFooter's ratio,
                 so nothing clips), and a BAKED per-logo object-position-y (p.posY)
                 centres each wordmark — a single fixed position left whitespace above
                 the lower-sitting logos. Logos with no baked position fall back to a
                 never-cropped object-contain. Fixed height (not h-full) leaves slack
                 so flex items-center centres the box in the full tab. -->
                <div class="absolute inset-0 z-10 flex items-center justify-center px-2 w-full">
                  <img v-if="!failedLogos[p.id]" :src="p.logo" :alt="p.name" loading="eager" decoding="async"
                    class="h-11 sm:h-14 w-auto max-w-full aspect-[5/2]"
                    :class="p.posY != null ? 'object-cover' : 'object-contain object-center'"
                    :style="p.posY != null ? { objectPosition: `50% ${p.posY}%` } : undefined"
                    @error="failedLogos[p.id] = true">
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

    <div class="w-full max-w-[1152px] mx-auto px-1.5 lg:px-0">
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
// Provider logos are served from the Linode CDN — cdn() rewrites the
// /designs/slot-logo/<id>.webp path (built by lobbyLogoUrl, same source the
// homepage slot cards use, not the CMS/API logo_path) to the CDN host.
const slotLogoBase = computed(() => siteConfig.assets.homepage.gameLogos.slot);
const providers = computed(() =>
  (lobbies.value ?? []).map((l) => {
    const id = String(l.id);
    return {
      id,
      name: l.game_name ?? "",
      // Provider logos served from the Linode (S3) CDN. The bucket sends no CORS
      // headers, so TrimmedImage's canvas alpha-trim can't run cross-origin.
      logo: cdn(lobbyLogoUrl(slotLogoBase.value, l.id)),
      // Baked per-logo vertical object-position (%) that centres this logo's
      // wordmark in its 5:2 object-cover box (see SLOT_LOGO_POS_Y). Undefined for
      // any logo not in the map → falls back to a plain, never-cropped contain.
      posY: SLOT_LOGO_POS_Y[id],
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

// Sticky provider bar. CSS position:sticky is unavailable (html/body have
// overflow-x:auto — see default.vue), so mirror the category navbar's JS
// fixed+spacer approach: the anchor stays in flow and reserves the bar height
// while the bar is pinned under the header.
const providerAnchor = ref<HTMLElement | null>(null);
const providerBar = ref<HTMLElement | null>(null);
const providerStuck = ref(false);
const providerBarH = ref(0);

// Header height in px, from the CSS var app.vue/default.vue keep in sync.
const headerPx = () => {
  if (typeof window === "undefined") return 60;
  const n = parseInt(
    getComputedStyle(document.documentElement).getPropertyValue("--mh-header-height"),
    10,
  );
  return Number.isFinite(n) ? n : 60;
};

let stickyRaf: number | null = null;
const onStickyScroll = () => {
  if (stickyRaf !== null) return;
  stickyRaf = requestAnimationFrame(() => {
    stickyRaf = null;
    const anchor = providerAnchor.value;
    if (!anchor) return;
    const top = anchor.getBoundingClientRect().top;
    if (!providerStuck.value) {
      if (top <= headerPx()) {
        // Measure before pinning so the spacer keeps the exact flow height.
        providerBarH.value = providerBar.value?.offsetHeight ?? anchor.offsetHeight;
        providerStuck.value = true;
      }
    } else if (top > headerPx()) {
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
