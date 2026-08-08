<template>
  <!-- No fixed width here: the layout's banner container sizes this, and pinning
       to 1152px would re-cap the banner inside the wider content column. -->
  <div class="w-full mx-auto">
    <div id="banner-container" class="bg-black w-full relative overflow-hidden z-10">
      <!-- Empty State. There is no loading state: every page's banners arrive
           in the one SSR fetch behind the banner store, so by the time this
           renders the list for this page is already known (possibly empty). -->
      <div v-if="banners.length === 0" class="banner-box w-full flex items-center justify-center bg-black"
        :style="bannerBoxStyle">
        <span class="text-white/50 text-sm">{{ $t('common.noBanners') }}</span>
      </div>

      <template v-else>
        <div class="banner-swap overflow-hidden w-full relative touch-pan-y"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerCancel"
          @click.capture="onClickCapture">
          <div class="flex w-full ease-in-out" :class="{ 'transition-transform duration-500': !isDragging }"
            :style="{ transform: trackTransform }">
            <div v-for="(banner, index) in banners" :key="index" class="shrink-0 w-full relative">
              <!-- Desktop Banner — v-if (not CSS hidden) so the off-viewport
                   <video>/<img decoding="async"> is not in the DOM and the browser doesn't
                   fetch its src. UA-based detection: see useIsMobileSSR. -->
              <div v-if="!isMobile" class="banner-box relative w-full" :style="{ aspectRatio: BANNER_AR_DESKTOP }">
                <!-- Main media — first slide is LCP, others should not stream
                     bytes upfront (preload="metadata" only fetches headers). -->
                <video v-if="isVideo(banner.main_url)" :src="banner.main_url"
                  class="absolute inset-0 w-full h-full object-cover" loop muted playsinline autoplay
                  :preload="index === 0 ? 'auto' : 'metadata'" />
                <img v-else :src="optimize(banner.main_url, BANNER_W.desktop)" :alt="`Banner ${index + 1}`"
                  class="absolute inset-0 w-full h-full object-cover" :loading="index === 0 ? 'eager' : 'lazy'"
                  :fetchpriority="index === 0 ? 'high' : undefined" draggable="false" decoding="async">

                <!-- Desktop Overlay — first slide's overlay is the LCP element,
                     so hint the browser to fetch it with high priority.
                     `object-cover` matches the main media above: the pair is
                     drawn as one composition, so they must be fitted the same
                     way. Under `contain` the overlay shrank to fit whenever the
                     slot's ratio differed from the artwork's while the main
                     image cropped to fill, which pulled the two apart. -->
                <img v-if="banner.overlay_url" :src="optimize(banner.overlay_url, BANNER_W.desktop)" alt="Overlay"
                  class="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none overlay-zoom"
                  :loading="index === 0 ? 'eager' : 'lazy'" :fetchpriority="index === 0 ? 'high' : undefined"
                  draggable="false" decoding="async">

                <!-- Gradient overlays -->
                <!-- <div class="pointer-events-none absolute inset-y-0 left-0 w-[150px] bg-gradient-to-r from-black to-transparent"></div>
                <div class="pointer-events-none absolute inset-y-0 right-0 w-[150px] bg-gradient-to-l from-black to-transparent"></div> -->
              </div>

              <!-- Mobile Banner -->
              <div v-else class="banner-box relative w-full" :style="{ aspectRatio: BANNER_AR_MOBILE }">
                <!-- Main media -->
                <video v-if="isVideo(banner.main_url_mobile)" :src="banner.main_url_mobile"
                  class="absolute inset-0 w-full h-full object-cover" loop muted playsinline autoplay
                  :preload="index === 0 ? 'auto' : 'metadata'" />
                <img v-else :src="optimize(banner.main_url_mobile, BANNER_W.mobile)" :alt="`Banner ${index + 1}`"
                  class="absolute inset-0 w-full h-full object-cover" :loading="index === 0 ? 'eager' : 'lazy'"
                  :fetchpriority="index === 0 ? 'high' : undefined" draggable="false" decoding="async">

                <!-- Mobile Overlay — LCP candidate on mobile viewports.
                     `object-cover` for the same reason as the desktop one. -->
                <img v-if="banner.overlay_url_mobile" :src="optimize(banner.overlay_url_mobile, BANNER_W.mobile)"
                  alt="Overlay"
                  class="absolute inset-0 w-full h-full object-cover z-10 pointer-events-none overlay-zoom"
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
import type { ResolvableLink } from "@unhead/vue";
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useCarouselSwipe } from "@/composables/useCarouselSwipe";
import type { BannerCarouselItem as BannerPreviewItem } from "@/interfaces/site.interface";
import { useBannerStore } from "@/stores/banner";
import type { BannerPageKey } from "@/utils/pageBanner";

const props = withDefaults(
  defineProps<{
    /**
     * Which page's banners to render. Defaults to the homepage so existing
     * usage — and the API, whose `page` query defaults the same way — is
     * unchanged.
     */
    page?: BannerPageKey;
  }>(),
  { page: "homepage" },
);

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

// `blob:` (admin theme-preview object URLs) and `data:` sources exist only in
// the visitor's browser, so IPX cannot fetch them — it would emit an /_ipx/
// URL that 404s. They are already local and need no optimizing, so they are
// handed to the <img> untouched.
const isLocalObjectUrl = (url: string): boolean =>
  url.startsWith("blob:") || url.startsWith("data:");

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
// Both are config-driven (theme.desktopBannerAspectRatio /
// theme.mobileBannerAspectRatio, from /api/site/config/theme) with the bundled
// defaults below as fallback. The desktop ratio is expressed against the content
// column so it resolves to a round height at full width: 1202 / 300 is exactly
// 300px in the 1202px column (layouts/default.vue). Re-derive it if that column
// width changes, or the banner height drifts. Placeholder/loading states reuse
// the active box style so there is no layout jump when banners resolve.
const siteConfig = useSiteConfig();
// Theme values are the FALLBACK now: the ratio travels with each banner record
// (see `aspect_ratio_*`), so it can never disagree with the artwork it
// describes. These remain for banners saved without one, and for the
// loading/empty boxes that must reserve space before any record exists.
const THEME_AR_DESKTOP =
  siteConfig.theme.desktopBannerAspectRatio || "1202 / 300";
const THEME_AR_MOBILE = siteConfig.theme.mobileBannerAspectRatio || "375 / 190";

const optimize = (url: string | null | undefined, width: number): string => {
  if (!url || isVideo(url) || isLocalObjectUrl(url)) return url ?? "";
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

/**
 * This page's banners, read from the store — no fetching here.
 *
 * Every active banner for every page arrives in a single SSR request (see
 * `fetchBanners`, invoked from app.vue), so switching pages is a re-filter of
 * already-hydrated state rather than a network round trip.
 */
const bannerStore = useBannerStore();

/**
 * The page currently ON SCREEN, which deliberately lags `props.page` until the
 * incoming creative can actually paint.
 *
 * Having the records in memory is not the same as having the artwork decoded:
 * swapping `src` the instant the route changed left the slot showing its black
 * background for as long as the new image took to decode (measured at ~340ms on
 * a first visit), which read as a flicker. So the swap waits for the incoming
 * image, and the previous creative stays up until then.
 */
const displayPage = ref<BannerPageKey>(props.page);
const banners = computed<BannerPreviewItem[]>(() =>
  bannerStore.bannersByPage(displayPage.value),
);

/** The URL that will actually render for a banner at the current viewport. */
const mediaUrls = (banner: BannerPreviewItem | undefined): string[] => {
  if (!banner) return [];
  const width = isMobile.value ? BANNER_W.mobile : BANNER_W.desktop;
  const main = isMobile.value ? banner.main_url_mobile : banner.main_url;
  const overlay = isMobile.value
    ? banner.overlay_url_mobile
    : banner.overlay_url;
  return [main, overlay]
    .filter((url): url is string => !!url && !isVideo(url))
    .map((url) => optimize(url, width));
};

/**
 * Fetch and DECODE a banner's images, so a later render paints immediately.
 * `decode()` (not just `load`) is the part that matters — an image can be
 * downloaded and still cost a frame to decode. Failures are ignored: this is a
 * pure optimisation, never a gate on showing the banner.
 */
const warm = async (banner: BannerPreviewItem | undefined): Promise<void> => {
  if (!import.meta.client) return;
  await Promise.all(
    mediaUrls(banner).map(async (url) => {
      const image = new Image();
      image.src = url;
      await image.decode().catch(() => {});
    }),
  );
};

/**
 * Hold the old creative until the new one is ready, then swap both the artwork
 * and the slot height together.
 *
 * Capped: a slow CDN must not strand the visitor on the previous page's banner,
 * so after the timeout the swap happens regardless (the pre-existing behaviour).
 * Videos resolve instantly — there is nothing to decode ahead of time.
 */
const SWAP_DECODE_BUDGET_MS = 600;
watch(
  () => props.page,
  async (next) => {
    await Promise.race([
      warm(bannerStore.bannersByPage(next)[0]),
      new Promise((resolve) => setTimeout(resolve, SWAP_DECODE_BUDGET_MS)),
    ]);
    // Ignore a swap that a faster subsequent navigation has already overtaken.
    if (props.page === next) displayPage.value = next;
  },
);

/**
 * The slot is ONE box, but the ratio is per record: if each slide sized itself
 * the box would resize mid-rotation and shunt the page around. So the first
 * active banner (lowest `sort`, i.e. the one that renders first) sets the box
 * for the whole carousel, and the rest fill it with object-cover as before.
 * Falls back to the theme value for banners saved without a ratio, and for the
 * loading/empty boxes, which must reserve space before any record exists.
 */
const BANNER_AR_DESKTOP = computed(
  () => banners.value[0]?.aspect_ratio_desktop || THEME_AR_DESKTOP,
);
const BANNER_AR_MOBILE = computed(
  () => banners.value[0]?.aspect_ratio_mobile || THEME_AR_MOBILE,
);
const bannerBoxStyle = computed(() =>
  isMobile.value
    ? { aspectRatio: BANNER_AR_MOBILE.value }
    : { aspectRatio: BANNER_AR_DESKTOP.value },
);

// Preload the first banner's overlay image — this is the LCP element on the
// homepage. Without `<link rel="preload">` the browser only discovers the URL
// after Vue hydrates, costing several hundred ms of LCP. We emit both desktop
// and mobile URLs gated by `media` so the browser fetches only the relevant
// one. Runs at SSR time so the hint lands in the initial HTML.
useHead(() => {
  const first = banners.value[0];
  if (!first) return {};
  const link: ResolvableLink[] = [];
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

/**
 * Decode the FIRST banner of every other page once the browser is idle.
 *
 * The whole set is already in the store, so this costs no extra requests
 * against the API — it just moves each page's first paint off the navigation
 * and into idle time, which is what makes the swap above resolve instantly
 * rather than spending its decode budget. Deferred to idle so it never competes
 * with the current page's LCP.
 */
const warmOtherPages = (): void => {
  const seen = new Set<string>([displayPage.value]);
  for (const banner of bannerStore.banners) {
    if (seen.has(banner.page)) continue;
    seen.add(banner.page);
    void warm(banner);
  }
};

onMounted(() => {
  // Switch from the SSR/UA seed to the real viewport, then keep it in sync as
  // the window is resized across the 767px boundary.
  mobileMql = window.matchMedia("(max-width: 767px)");
  syncIsMobile();
  mobileMql.addEventListener("change", syncIsMobile);
  startAutoPlay();

  const idle =
    window.requestIdleCallback ??
    ((cb: IdleRequestCallback) => window.setTimeout(cb, 300));
  idle(() => warmOtherPages());
});

onUnmounted(() => {
  mobileMql?.removeEventListener("change", syncIsMobile);
  stopAutoPlay();
});
</script>

<style scoped>
/* Page-to-page banner swap.
   The two pages' ratios differ (e.g. 4/1 vs 2.67/1), so the slot's height
   changes on navigation. Animating `aspect-ratio` glides that instead of
   snapping — browsers without interpolation for it simply land on the new
   value, which is the old behaviour and no worse. */
.banner-box {
  transition: aspect-ratio 0.3s ease;
}

/* Kept for the opacity transition on the slot; the `is-loading` dim it used to
   pair with is gone, because banners no longer load per page — the whole set
   is in the store before the swap happens. */
.banner-swap {
  transition: opacity 0.3s ease;
}

@media (prefers-reduced-motion: reduce) {

  .banner-box,
  .banner-swap {
    transition: none;
  }
}

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
