<template>
  <div class="w-full xl:w-[1152px] mx-auto">
    <div id="banner-container" class="bg-black w-full relative overflow-hidden z-10">
      <!-- Loading State -->
      <div v-if="isLoading" class="w-full flex items-center justify-center bg-black" :style="bannerBoxStyle">
        <span class="text-white/50 text-sm">{{ $t('common.loadingBanners') }}</span>
      </div>

      <!-- Empty State -->
      <div v-else-if="banners.length === 0" class="w-full flex items-center justify-center bg-black"
        :style="bannerBoxStyle">
        <span class="text-white/50 text-sm">{{ $t('common.noBanners') }}</span>
      </div>

      <!-- Carousel -->
      <template v-else>
        <div class="overflow-hidden w-full relative touch-pan-y" @pointerdown="onPointerDown"
          @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerCancel"
          @click.capture="onClickCapture">
          <div class="flex w-full ease-in-out" :class="{ 'transition-transform duration-500': !isDragging }"
            :style="{ transform: trackTransform }">
            <div v-for="(banner, index) in banners" :key="index" class="shrink-0 w-full relative">
              <!-- Desktop Banner — v-if (not CSS hidden) so the off-viewport
                   <video>/<img decoding="async"> is not in the DOM and the browser doesn't
                   fetch its src. UA-based detection: see useIsMobileSSR. -->
              <div v-if="!isMobile" class="relative w-full" :style="{ aspectRatio: BANNER_AR_DESKTOP }">
                <!-- Main media — first slide is LCP, others should not stream
                     bytes upfront (preload="metadata" only fetches headers). -->
                <video v-if="isVideo(banner.main_url)" :src="banner.main_url"
                  class="absolute inset-0 w-full h-full object-cover" loop muted playsinline autoplay
                  :preload="index === 0 ? 'auto' : 'metadata'" />
                <img v-else :src="optimize(banner.main_url, BANNER_W.desktop)" :alt="`Banner ${index + 1}`"
                  class="absolute inset-0 w-full h-full object-cover" :loading="index === 0 ? 'eager' : 'lazy'"
                  :fetchpriority="index === 0 ? 'high' : undefined" draggable="false" decoding="async">

                <!-- Desktop Overlay — first slide's overlay is the LCP element,
                     so hint the browser to fetch it with high priority. -->
                <img v-if="banner.overlay_url" :src="optimize(banner.overlay_url, BANNER_W.desktop)" alt="Overlay"
                  class="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none overlay-zoom"
                  :loading="index === 0 ? 'eager' : 'lazy'" :fetchpriority="index === 0 ? 'high' : undefined"
                  draggable="false" decoding="async">

                <!-- Gradient overlays -->
                <!-- <div class="pointer-events-none absolute inset-y-0 left-0 w-[150px] bg-gradient-to-r from-black to-transparent"></div>
                <div class="pointer-events-none absolute inset-y-0 right-0 w-[150px] bg-gradient-to-l from-black to-transparent"></div> -->
              </div>

              <!-- Mobile Banner -->
              <div v-else class="relative w-full" :style="{ aspectRatio: BANNER_AR_MOBILE }">
                <!-- Main media -->
                <video v-if="isVideo(banner.main_url_mobile)" :src="banner.main_url_mobile"
                  class="absolute inset-0 w-full h-full object-cover" loop muted playsinline autoplay
                  :preload="index === 0 ? 'auto' : 'metadata'" />
                <img v-else :src="optimize(banner.main_url_mobile, BANNER_W.mobile)" :alt="`Banner ${index + 1}`"
                  class="absolute inset-0 w-full h-full object-cover" :loading="index === 0 ? 'eager' : 'lazy'"
                  :fetchpriority="index === 0 ? 'high' : undefined" draggable="false" decoding="async">

                <!-- Mobile Overlay — LCP candidate on mobile viewports. -->
                <img v-if="banner.overlay_url_mobile" :src="optimize(banner.overlay_url_mobile, BANNER_W.mobile)"
                  alt="Overlay"
                  class="absolute inset-0 w-full h-full object-contain z-10 pointer-events-none overlay-zoom"
                  :loading="index === 0 ? 'eager' : 'lazy'" :fetchpriority="index === 0 ? 'high' : undefined"
                  draggable="false" decoding="async">

                <!-- Gradient overlays -->
                <!-- <div class="pointer-events-none absolute inset-y-0 left-0 w-[80px] bg-gradient-to-r from-black to-transparent"></div>
                <div class="pointer-events-none absolute inset-y-0 right-0 w-[80px] bg-gradient-to-l from-black to-transparent"></div> -->
              </div>
            </div>
          </div>

          <!-- Navigation Dots -->
          <div v-if="banners.length > 1" class="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
            <button v-for="(_, index) in banners" :key="index" :class="[
              'transition-all duration-300 rounded-full',
              index === selectedIndex
                ? 'bg-white w-6 h-2'
                : 'bg-white/50 w-2 h-2 hover:bg-white/70',
            ]" :aria-label="`Go to slide ${index + 1}`" @click="scrollTo(index)" />
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useApi } from "@/composables/useApi";
import { useCarouselSwipe } from "@/composables/useCarouselSwipe";
import { validateResponse } from "@/lib/validateResponse";
import {
  bannersCarouselResponseSchema,
  mapBannersCarouselResponse,
  type BannerCarouselItem as BannerPreviewItem,
} from "@/interfaces/site.interface";

// Domains idr-demo2 … idr-demo11 drive their hero banner from the theme config
// (`/site/config/theme` → `banners`) instead of the `/site/banners-new/carousel`
// endpoint. SSR-safe host check (useRequestURL resolves on server and client).
function isThemeBannerHost(): boolean {
  try {
    const host = useRequestURL().hostname.toLowerCase();
    // Dev: localhost mirrors the demo domains so the theme-banner path (fed by
    // the /site/config/theme override) is testable locally.
    // if (host === "localhost" || host === "127.0.0.1") return true;
    const m = /^idr-demo(\d+)\./.exec(host);
    if (!m) return false;
    const n = Number(m[1]);
    return n >= 2 && n <= 11;
  } catch {
    return false;
  }
}

// Normalize the theme config's `banners` value (a single object, occasionally
// an array) into the carousel's BannerPreviewItem[] shape.
function themeBannersToCarousel(cfg: unknown): BannerPreviewItem[] {
  const raw = (cfg as { banners?: unknown } | null)?.banners;
  const list = Array.isArray(raw) ? raw : raw ? [raw] : [];
  return list
    .map((b) => b as Partial<BannerPreviewItem>)
    .filter((b) => typeof b.main_url === "string" && b.main_url.length > 0)
    .map((b) => ({
      main_url: b.main_url as string,
      overlay_url: b.overlay_url ?? null,
      main_url_mobile: b.main_url_mobile || (b.main_url as string),
      overlay_url_mobile: b.overlay_url_mobile ?? null,
      sort: b.sort ?? 0,
    }))
    .sort((a, b) => a.sort - b.sort);
}

// Mobile vs desktop is a *viewport* decision, but it must stay SSR-safe: render
// only one branch (the off-screen branch's <video>/<img> must not be in the DOM
// or the browser fetches its bytes) and avoid a hydration mismatch. So we seed
// from the UA-based SSR value (server HTML and first client render agree), then
// switch to the true viewport — and react to resize — after mount via
// matchMedia. The 767px boundary matches the LCP preload media queries below
// and the layout's uiStore mobile threshold. Using the UA value alone (the old
// behaviour) meant a desktop UA never flipped to mobile on resize.
const isMobileSSR = useIsMobileSSR();
const isMobile = ref(isMobileSSR.value);

let mobileMql: MediaQueryList | null = null;
const syncIsMobile = () => {
  if (mobileMql) isMobile.value = mobileMql.matches;
};

const isVideo = (url: string): boolean => {
  return url?.endsWith(".mp4") || url?.endsWith(".webm");
};

// Route banner stills through @nuxt/image (IPX) so the LCP banner ships as a
// sized WebP instead of a raw full-size Linode JPG. We generate the optimized
// URL ourselves (rather than <NuxtImg>) so the `<link rel=preload>` below can
// point at the EXACT same URL the <img> requests — a mismatch would double-
// download the LCP image. Videos and empty slots pass through untouched.
const img = useImage();
const BANNER_W = { desktop: 1280, mobile: 800 } as const;

// Both banners use a fixed *aspect ratio* (not a fixed pixel height) so the box
// scales proportionally with the container width and object-cover crops the same
// way at every size. A fixed height cropped inconsistently — the desktop banner
// stayed 450px tall even on a sub-1152 width (far too tall between 768–1152px),
// and the mobile banner was too tall on narrow phones / too short on wide ones.
// Mobile is config-driven (theme.mobileBannerAspectRatio, from
// /api/site/config/theme); desktop matches the canonical 1152×450 slot (still
// exactly 450px at the full 1152 width). Placeholder/loading states reuse the
// active box style so there is no layout jump when banners resolve.
const siteConfig = useSiteConfig();
const BANNER_AR_DESKTOP = "1152 / 450";
const BANNER_AR_MOBILE = siteConfig.theme.mobileBannerAspectRatio || "375 / 190";
const bannerBoxStyle = computed(() =>
  isMobile.value
    ? { aspectRatio: BANNER_AR_MOBILE }
    : { aspectRatio: BANNER_AR_DESKTOP },
);
const optimize = (url: string | null | undefined, width: number): string => {
  if (!url || isVideo(url)) return url ?? "";
  try {
    return img(url, { format: "webp", width });
  } catch {
    return url; // unknown domain / IPX hiccup — fall back to the raw URL.
  }
};

const selectedIndex = ref(0);
let autoPlayInterval: ReturnType<typeof setInterval> | null = null;

function scrollTo(index: number) {
  selectedIndex.value = index;
}

// Pointer swipe (mouse + touch) via the shared composable. The dots and the
// transform are both driven by `selectedIndex`, so they stay in sync. Autoplay
// pauses for the duration of the drag.
const {
  isDragging,
  trackTransform,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClickCapture,
} = useCarouselSwipe({
  count: () => banners.value.length,
  index: selectedIndex,
  onInteractStart: stopAutoPlay,
  onInteractEnd: startAutoPlay,
});

function startAutoPlay() {
  if (banners.value.length > 1) {
    autoPlayInterval = setInterval(() => {
      selectedIndex.value = (selectedIndex.value + 1) % banners.value.length;
    }, 5000);
  }
}

function stopAutoPlay() {
  if (autoPlayInterval) {
    clearInterval(autoPlayInterval);
    autoPlayInterval = null;
  }
}

const api = useApi();

const useThemeBanners = isThemeBannerHost();

const { data: bannersData, pending: isLoading } = await useAsyncData<
  BannerPreviewItem[]
>("banners-carousel", async () => {
  // idr-demo2 … idr-demo11: build the carousel from the theme config's
  // `banners` key (already loaded via /site/config/theme) — no extra API call.
  if (useThemeBanners) {
    return themeBannersToCarousel(siteConfig);
  }
  try {
    const raw = await api("/site/banners-new/carousel");
    const list = mapBannersCarouselResponse(
      validateResponse(bannersCarouselResponseSchema, raw, "/site/banners-new"),
    );
    return [...list].sort((a, b) => a.sort - b.sort);
  } catch (err) {
    if (import.meta.dev) console.error("Failed to fetch banners:", err);
    return [];
  }
});

const banners = computed<BannerPreviewItem[]>(() => bannersData.value ?? []);

// Preload the first banner's overlay image — this is the LCP element on the
// homepage. Without `<link rel="preload">` the browser only discovers the URL
// after Vue hydrates, costing several hundred ms of LCP. We emit both desktop
// and mobile URLs gated by `media` so the browser fetches only the relevant
// one. Runs at SSR time so the hint lands in the initial HTML.
useHead(() => {
  const first = banners.value[0];
  if (!first) return {};
  const link: Array<Record<string, string>> = [];
  if (first.overlay_url) {
    link.push({
      rel: "preload",
      as: "image",
      href: optimize(first.overlay_url, BANNER_W.desktop),
      fetchpriority: "high",
      media: "(min-width: 768px)",
    });
  }
  if (first.overlay_url_mobile) {
    link.push({
      rel: "preload",
      as: "image",
      href: optimize(first.overlay_url_mobile, BANNER_W.mobile),
      fetchpriority: "high",
      media: "(max-width: 767px)",
    });
  }
  return link.length ? { link } : {};
});

onMounted(() => {
  // Switch from the SSR/UA seed to the real viewport, then keep it in sync as
  // the window is resized across the 767px boundary.
  mobileMql = window.matchMedia("(max-width: 767px)");
  syncIsMobile();
  mobileMql.addEventListener("change", syncIsMobile);
  startAutoPlay();
});

onUnmounted(() => {
  mobileMql?.removeEventListener("change", syncIsMobile);
  stopAutoPlay();
});
</script>

<style scoped>
/* Block native image/media drag so a press-and-drag drives the carousel swipe
   instead of starting the browser's image drag (which would otherwise hijack
   the gesture and snap the slide back). */
#banner-container img,
#banner-container video {
  -webkit-user-drag: none;
  user-select: none;
}

/* `will-change: transform` removed intentionally — for an always-running
   animation it pins a compositor layer permanently, which costs GPU memory
   for no payoff. Transform-only animations composite on the GPU regardless. */
.overlay-zoom {
  animation: overlayZoom 4s ease-in-out infinite;
}

@keyframes overlayZoom {

  0%,
  100% {
    transform: scale(1);
  }

  50% {
    transform: scale(1.05);
  }
}
</style>
