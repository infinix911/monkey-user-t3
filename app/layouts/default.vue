<template>
  <div>
    <!-- Fixed Background (separate element so it doesn't break position:sticky).
         Always pinned to the viewport so only page content scrolls.
         On mobile the desktop background is normally hidden, but it IS shown
         while the notice/warning popup is open (nicer backdrop than the bare
         mobile page). -->
    <div v-if="
      siteConfig.assets.images.mainBackground &&
      (!uiStore.isMobile || siteConfig.assets.images.mainBackgroundMobile || uiStore.showNoticeModal)
    " class="fixed inset-0 -z-10 bg-no-repeat mx-auto" :style="{
      backgroundImage: `url(${siteConfig.assets.images.mainBackground})`,
      backgroundSize: 'cover',
      backgroundPosition: 'top center',
      maxWidth: '2000px',
      left: '0',
      right: '0',
    }" />

    <!-- Partner focus dim — darkens the site background so the partner section
         becomes the visual focus. -->
    <div v-if="isPartnerPage" class="fixed inset-0 -z-[5] pointer-events-none"
      style="background: radial-gradient(120% 90% at 50% 0%, rgba(0,0,0,0.55) 0%, rgba(0,0,0,0.86) 70%, rgba(0,0,0,0.94) 100%);" />

    <!-- `site-zoom` renders this page at 110% on wide desktops (main.css).
         Opt-in per page — see isZoomPage. Modals that Teleport to body sit
         outside this wrapper and stay 1:1. -->
    <div class="flex flex-col w-full min-w-0" :class="{ 'site-zoom': isZoomPage }">
      <!-- Header — spacer height comes from the --mh-header-height CSS var
           (set pre-paint by app.vue's inline script) so it matches the fixed
           header on the very first paint with no hydration flash. -->
      <div :style="{ height: 'var(--mh-header-height, 83px)' }">
        <AppHeader />
      </div>

      <!-- Notice Section — overlays the main content. Main content stays
           mounted behind it (v-show, not v-if) so dismissing the notice
           doesn't remount the slot and retrigger client-side useAsyncData. -->
      <NoticeSection v-if="uiStore.showNoticeModal" />

      <!-- Normal page content — always mounted; hidden with v-show while
           the notice is pending. -->
      <div v-show="!uiStore.showNoticeModal">
        <!-- Announcement Bar (desktop lg+: above the banner). Hidden on the RTP + partner pages. -->
        <div v-if="!isRtpPage && !isPartnerPage" class="hidden lg:block w-full xl:w-[1152px] mx-auto">
          <div
            class="w-full shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] max-h-[30px] md:max-h-[40px] md:min-h-[40px] min-h-[32px] md:h-[40px] flex justify-center"
            :style="{ background: brandSiteConfig.theme.announcement.desktopGradient }">
            <div
              class="w-full flex items-center justify-center gap-1.5 md:gap-4 pr-2 md:pr-6 pl-2 md:pl-3 overflow-visible">
              <AnnouncementMarquee
                :text="brandSiteConfig.theme.announcement.text"
                size-class="text-[16px] lg:text-[16px]"
                :text-stroke="brandSiteConfig.theme.announcement.textStroke"
                :text-fill="brandSiteConfig.theme.announcement.textFill" />
            </div>
          </div>
        </div>

        <!-- Banner (collapsed on sticky-navbar pages until scrolled past, so navbar sits under header). Hidden on partner pages. -->
        <div v-if="!isPartnerPage" id="banner-container" ref="bannerContainer"
          class="w-full xl:w-[1152px] mx-auto transition-[height,visibility] duration-200" :style="!initialScrollDone && isNavbarStickyPage
            ? { height: 0, overflow: 'hidden', visibility: 'hidden' }
            : {}
            ">
          <!-- RTP page shows a single static banner; every other page shows the
               rotating BannerPreview carousel. -->
          <img v-if="isRtpPage" :src="rtpBannerSrc" :alt="$t('navbar.rtp')"
            class="block w-full h-auto" >
          <BannerPreview v-else />
        </div>

        <!-- Announcement Bar (mobile/tablet < lg: below the banner). When the
             navbar sticks on scroll this pins below the header too, so the order
             stays header → announcement → navbar. Uses JS `fixed` + a spacer
             (NOT CSS sticky): html/body have `overflow-x: auto`, which disables
             position:sticky for descendants. The navbar's fixed top + stick
             trigger are offset by this bar's height (announcementHeight). -->
        <div v-if="!isRtpPage && !isPartnerPage" class="block lg:hidden w-full xl:w-[1152px] mx-auto">
          <div ref="announcementBar"
            class="w-full shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] max-h-[30px] md:max-h-[41px] md:min-h-[41px] min-h-[30px] md:h-[41px] flex justify-center"
            :class="effectiveNavFixed ? 'fixed left-0 right-0 z-40' : ''"
            :style="[{ background: brandSiteConfig.theme.announcement.mobileBg }, effectiveNavFixed ? { top: headerHeight + 'px' } : {}]">
            <div
              class="w-full flex items-center justify-center gap-1.5 md:gap-4 pr-2 md:pr-6 pl-2 md:pl-3 overflow-visible">
              <NuxtImg :src="brandSiteConfig.theme.announcement.mobileIcon" alt="" aria-hidden="true"
                class="flex-shrink-0 h-5 w-auto object-contain" />
              <AnnouncementMarquee
                :text="brandSiteConfig.theme.announcement.text"
                size-class="text-[14px] lg:text-[15px]"
                :text-stroke="brandSiteConfig.theme.announcement.textStroke"
                :text-fill="brandSiteConfig.theme.announcement.textFill" />
              <!-- Invisible spacer mirrors the leading icon so the marquee region
                   is symmetric and short (centered) text sits at the bar's true
                   centre rather than being pushed right by the icon. -->
              <NuxtImg :src="brandSiteConfig.theme.announcement.mobileIcon" alt="" aria-hidden="true"
                class="flex-shrink-0 h-5 w-auto object-contain invisible" />
            </div>
          </div>
          <!-- Spacer keeps the bar's flow space while it's fixed on scroll. -->
          <div v-if="effectiveNavFixed" :style="{ height: announcementHeight + 'px' }" aria-hidden="true" />
        </div>

        <!-- Auth Buttons Section (mobile only, guests) — sits below the
             announcement on a plain black background. Bottom padding is added
             only when the nav below has a background IMAGE (so the black strip
             reads separately from the image); when the nav is a solid colour it
             already blends into this black strip, so the padding is dropped to
             avoid a big undifferentiated gap. -->
        <div v-if="!authStore.isAuthenticated && !isRtpPage && !isPartnerPage"
          class="block min-[690px]:hidden w-full xl:w-[1152px] mx-auto flex items-center justify-center gap-2 pt-3"
          :class="brandSiteConfig.assets.navIcons.background ? 'pb-3' : 'pb-0'"
          :style="{ background: '#000000' }">
          <!-- Login: gold gradient border + gold gradient text -->
          <button type="button"
            class="cursor-pointer h-[37px] w-[125px] px-3 rounded-[4px] flex items-center justify-center font-extrabold italic uppercase text-[15px] tracking-tight transition-transform hover:scale-[1.03]"
            :style="{ background: brandSiteConfig.theme.authButton.loginBg, border: brandSiteConfig.theme.authButton.loginBorder, boxShadow: '0 5px 5px rgba(0,0,0,0.25)' }"
            @click="uiStore.setShowLoginModal(true)">
            <span class="block w-full text-center truncate"
              :style="{ background: brandSiteConfig.theme.authButton.loginTextGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }">{{
                $t('header.login') }}</span>
          </button>
          <!-- Sign up: blue gradient border + white text -->
          <button type="button"
            class="cursor-pointer h-[37px] w-[125px] px-3 rounded-[4px] flex items-center justify-center font-extrabold italic uppercase text-[15px] tracking-tight text-white transition-transform hover:scale-[1.03]"
            :style="{ background: brandSiteConfig.theme.authButton.signupBg, border: '1.5px solid transparent', boxShadow: '0 5px 5px rgba(0,0,0,0.25)' }"
            @click="uiStore.setShowSignupModal(true)">
            <span class="block w-full text-center truncate">{{ $t('header.signUp') }}</span>
          </button>
        </div>

        <!-- Navbar + Main Content wrapper with optional game section bg -->
        <div ref="gameBgAnchor" class="relative">
          <!-- Game Section Background (starts at navigation, extends behind content) -->
          <template
            v-if="siteConfig.assets.homepage.gameSectionBg.enabled || siteConfig.assets.homepage.gameSectionBg.mobileOnly">
            <!-- Mobile bg — always rendered when the gameSectionBg block is
                 active. Tailwind `lg:hidden` keeps it off desktop, so we no
                 longer need the `mobileOnly` flag to gate this branch. -->
            <div :class="[
              'lg:hidden z-0 pointer-events-none',
              effectiveNavFixed ? 'fixed inset-0' : 'absolute inset-0',
            ]">
              <div :style="{
                ...siteConfig.assets.homepage.gameSectionBg.mobileStyle,
                backgroundColor: siteConfig.theme.bodyBgColor,
                backgroundImage: `url('${siteConfig.assets.homepage.gameSectionBg.image}')`,
              }" />
            </div>
            <!-- Desktop bg — `mobileOnly: true` brands (Tiger / Dragon /
                 Space) still suppress this branch so we don't accidentally
                 render their mobile-only artwork stretched on desktop. -->
            <!-- Desktop game-section bg "stickies" via JS (CSS position:sticky is
                 unavailable — html/body have overflow-x, which breaks it): it stays
                 absolute and scrolls with the page until its wrapper reaches the
                 viewport top (isGameBgFixed), then switches to fixed top-0 so the
                 artwork stays pinned and never disappears at the bottom. The switch
                 happens exactly when it's already at the top, so there's no jump. -->
            <div v-if="!siteConfig.assets.homepage.gameSectionBg.mobileOnly" :class="[
              'hidden lg:block z-0 pointer-events-none',
              isGameBgFixed
                ? 'fixed left-1/2 -translate-x-1/2 top-0'
                : 'absolute left-1/2 -translate-x-1/2',
            ]" :style="{ width: '100%', maxWidth: '1152px' }">
              <div :style="{
                ...siteConfig.assets.homepage.gameSectionBg.desktopStyle,
                backgroundImage: `url('${siteConfig.assets.homepage.gameSectionBg.image}')`,
              }" />
            </div>
          </template>

          <!-- Navbar — hidden on the RTP page (own provider tabs) and partner
               pages (replaced by the partner nav below). -->
          <div v-if="!isRtpPage && !isPartnerPage" ref="navbarAnchor" class="relative z-20">
            <div :class="effectiveNavFixed ? 'fixed left-0 right-0 z-40' : ''"
              :style="effectiveNavFixed ? { top: (headerHeight + announcementHeight) + 'px' } : {}">
              <Navbar />
            </div>
            <div v-if="effectiveNavFixed" :style="{ height: navbarHeight + 'px' }" />
          </div>

          <!-- Partner nav — partner-section navigation in place of the game nav. -->
          <div v-if="isPartnerPage" class="relative z-20">
            <PartnerNav />
          </div>

          <!-- Main Content -->
          <main ref="mainContent" class="relative overflow-y-hidden overflow-x-auto mt-0 z-10">
            <div class="relative z-10 w-full">
              <!-- Partner body — its own themed container, visually separate
                   from the partner nav container above it. Desktop (lg+) only:
                   on mobile the panel chrome is dropped (no bg/border/padding)
                   so the page doesn't feel crowded on small screens. -->
              <div v-if="isPartnerPage" class="w-full px-0 lg:px-4 pt-3 pb-10">
                <div class="partner-body relative lg:rounded-2xl lg:border overflow-hidden"
                  :style="{ '--pb-bg': siteConfig.theme.partner.panelBgColor, '--pb-border': siteConfig.theme.partner.borderColor, '--pb-accent': siteConfig.theme.partner.accentColor }">
                  <!-- Cosmo artwork — top-right of the panel, clipped by the
                       panel's rounded corners + overflow-hidden, masked so it
                       melts into the dark toward the bottom-left. -->
                  <div class="partner-cosmos" aria-hidden="true" />
                  <div class="relative z-[1]">
                    <slot />
                  </div>
                </div>
              </div>
              <slot v-else />
            </div>
          </main>
        </div>

        <!-- Mobile Bottom Navigation — shown for guests too (the bar renders a
             public BERANDA · RTP · MASUK · PROMOSI · MENU set when logged out).
             Shown on every page, including the RTP page. -->
        <BottomNav />

        <!-- Custom SEO footer — admin-managed HTML from /api/site/custom-seo.
             Only rendered when a row matches this hostname and supplies a
             non-empty footer string. -->
        <div v-if="customSeoFooter" class="w-full bg-black/70">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <footer
            class="custom-seo-footer w-full xl:w-[1152px] mx-auto px-4 py-6 text-sm text-white text-center [&_*]:!text-center"
            v-html="customSeoFooter" />
        </div>

        <!-- Premium site footer -->
        <AppFooter />
      </div>
    </div>

    <!-- Decorative side media — fixed behind content, desktop (lg+) only. An
         mp4 (or image fallback) on each flank of the centred 1152px column,
         masked to fade out toward the bottom. Gated by deferredReady so the
         autoplay <video> codec setup never competes with LCP. -->
    <div v-if="siteConfig.assets.decorativeImages?.enabled && deferredReady"
      class="pointer-events-none fixed left-0 right-0 top-0 -z-10" style="height: 100vh">
      <div v-if="siteConfig.assets.images.leftDecor && leftDecorLoaded" class="absolute hidden lg:block h-full"
        :style="siteConfig.assets.decorativeImages.leftContainerStyle">
        <video v-if="siteConfig.assets.images.leftDecor.endsWith('.mp4')" :src="siteConfig.assets.images.leftDecor"
          autoplay loop muted playsinline preload="none" :style="siteConfig.assets.decorativeImages.leftMediaStyle" />
        <img v-else :src="siteConfig.assets.images.leftDecor" alt="" aria-hidden="true" loading="lazy" decoding="async"
          :style="siteConfig.assets.decorativeImages.leftMediaStyle" @error="leftDecorLoaded = false">
      </div>
      <div v-if="siteConfig.assets.images.rightDecor && rightDecorLoaded" class="absolute hidden lg:block h-full"
        :style="siteConfig.assets.decorativeImages.rightContainerStyle">
        <video v-if="siteConfig.assets.images.rightDecor.endsWith('.mp4')" :src="siteConfig.assets.images.rightDecor"
          autoplay loop muted playsinline preload="none" :style="siteConfig.assets.decorativeImages.rightMediaStyle" />
        <img v-else :src="siteConfig.assets.images.rightDecor" alt="" aria-hidden="true" loading="lazy" decoding="async"
          :style="siteConfig.assets.decorativeImages.rightMediaStyle" @error="rightDecorLoaded = false">
      </div>
    </div>

    <!-- Decorative Girl GIF - Bottom Right (lucky site only). Gated by
         deferredReady so the GIF download/decode never competes with LCP. -->
    <div v-if="siteConfig.identity.slug === 'lucky' && deferredReady" :class="[
      'z-0 pointer-events-none hidden md:block bottom-[-0%] right-0 md:right-[-10%] xl:right-[-11%]',
      isImagesFixed ? 'fixed' : 'absolute',
    ]">
      <NuxtImg :src="siteConfig.assets.images.girlGif" :alt="$t('common.decorativeImage')" width="1200" height="798"
        class="object-contain w-[600px] h-auto lg:w-[700px] 2xl:w-[800px]" />
    </div>

    <!-- Banner Popup — also post-hydration; promotional overlay, no LCP impact.
         Data is fetched at the layout level so it lands in the SSR payload
         and the browser never has to call /site/banners/popup. Guests only —
         hidden once the user is authenticated. -->
    <BannerPopup v-if="deferredReady && !authStore.isAuthenticated" :banners="popupBanners ?? []" />

    <!-- Shared modal hosts (single instance, layout-level) — Promotion, Inquiry
         and FAQ. Triggered from anywhere via the ui store (footer quick links,
         etc.) so the same modal component is reused, never duplicated. -->
    <PromotionModal v-if="uiStore.showPromotionModal" :is-open="uiStore.showPromotionModal"
      @close="uiStore.setShowPromotionModal(false)" />
    <InquiryModal v-if="uiStore.showInquiryModal" :is-open="uiStore.showInquiryModal"
      @close="uiStore.setShowInquiryModal(false)" />
    <FaqModal v-if="uiStore.showFaqModal" :is-open="uiStore.showFaqModal" @close="uiStore.setShowFaqModal(false)" />
    <ContactModal v-if="uiStore.showContactModal" :is-open="uiStore.showContactModal"
      @close="uiStore.setShowContactModal(false)" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted, onUnmounted, defineAsyncComponent } from "vue";
import { getApiBase, getHostname, forwardHostHeaders } from "@/lib/domain";
import { withServerCache } from "@/lib/serverCache";
import { cdn } from "@/utils/assetUrl";
import { sanitizeHtml } from "@/utils/sanitizeHtml";

const authStore = useAuthStore();
const uiStore = useUiStore();

// Non-critical components — async-loaded so their JS/CSS stays out of the
// initial bundle. `v-if` guards in the template below keep the chunks from
// even being requested until the right moment (modal opens, user authed,
// or hydration settles). Component names match the auto-import tags so the
// template doesn't need to change.

// Reserve layout space the instant `showNoticeModal` flips true so the
// page can't paint an empty hole between the main slot being hidden
// (v-show) and the notice chunk arriving. See PLAN-LOGIN-RELOAD-BLINK.md.
const NoticeSection = defineAsyncComponent({
  loader: () => import("@/components/NoticeSection.vue"),
  loadingComponent: { template: '<div class="min-h-[60vh]" aria-hidden="true" />' },
  delay: 0,
});

const BottomNav = defineAsyncComponent(() => import("@/components/layout/BottomNav.vue"));

const BannerPopup = defineAsyncComponent(() => import("@/components/banner/BannerPopup.vue"));

// Shared, layout-level modal hosts (one instance each), driven by the ui store.
const PromotionModal = defineAsyncComponent(() => import("@/components/promotion/PromotionModal.vue"));
const InquiryModal = defineAsyncComponent(() => import("@/components/inquiry/InquiryModal.vue"));
const FaqModal = defineAsyncComponent(() => import("@/components/faq/FaqModal.vue"));
const ContactModal = defineAsyncComponent(() => import("@/components/contact/ContactModal.vue"));

// Fetched here (layout setup) instead of inside BannerPopup.vue so the call
// runs on the Worker during SSR. BannerPopup itself is loaded post-hydration
// via defineAsyncComponent above — putting useAsyncData inside it would mean
// the request always fired client-side. Hoisting up means /site/banners/popup
// lands in the SSR payload and never appears in the browser network tab.
interface IPopupBanner {
  id: number;
  title: string;
  image: string;
  sort: number;
  updated_at: string;
}
// Resolve the API base + cache key SYNCHRONOUSLY here in setup, where the Nuxt
// context is available. getApiBase()/getHostname() call useRuntimeConfig()/
// useRequestURL(), which THROW once we're past an `await` (e.g. inside the
// withServerCache fetcher, which awaits Redis first). Resolving them lazily in
// the fetcher made getApiBase() silently fall back to its hardcoded
// `localhost:4000`, so the popup fetch always hit a dead host and returned [].
const popupApiBase = getApiBase();
const popupCacheKey = `banners-popup:${getHostname()}`;
// Forward the visitor's host so the multi-tenant backend returns THIS site's
// popup banners on SSR. This raw $fetch hits NUXT_API_URL directly (bypassing
// the Nitro proxy that normally sets x-forwarded-host), so without this the
// backend resolves the default tenant. Resolved synchronously in setup —
// forwardHostHeaders/useRequestHeaders need the request context, lost past an await.
const popupHeaders = forwardHostHeaders();
const { data: popupBanners } = await useAsyncData<IPopupBanner[]>(
  "site-banners-popup",
  () =>
    withServerCache<IPopupBanner[]>(
      popupCacheKey,
      60 * 1000,
      async () => {
        // Per-isolate cache (60 s) — see PLAN-PER-ISOLATE-SSR-CACHE.md.
        // Raw $fetch (no cookie) — popup banners are public CMS content.
        try {
          const res = await $fetch<
            { data?: IPopupBanner[] } | IPopupBanner[]
          >(`${popupApiBase}/site/banners/popup`, { headers: popupHeaders });
          if (Array.isArray(res)) return res;
          if (res && typeof res === "object" && Array.isArray(res.data))
            return res.data;
          return [];
        } catch {
          return [];
        }
      },
    ),
  { default: () => [] },
);

const brandSiteConfig = useSiteConfig();
const siteConfig = brandSiteConfig;
const route = useRoute();
const localePath = useLocalePath();

// The Slot RTP page is a stripped-down variant: no announcement bar, no guest
// auth buttons, no bottom nav, and a single static promo banner (rtp-banner.png
// on the asset CDN) instead of the rotating BannerPreview carousel.
const isRtpPage = computed(() => route.path === localePath("/slot-rtp"));
const rtpBannerSrc = cdn("/designs/rtp-banner.png");

// Partner section (/partner, /partner-deposit, /partner-withdraw): no banner or
// announcement, and the game Navbar is replaced by the partner nav.
const isPartnerPage = computed(() =>
  route.path.startsWith(localePath("/partner")),
);

// Pages that render at 110% on wide desktops (the `site-zoom` class, main.css).
// Deliberately an allow-list rather than a global rule — every other page stays
// 1:1. Matched EXACTLY, so nested routes (e.g. /lobbies/{id}, GAME_* launches)
// are not zoomed even where they share this layout.
const ZOOM_PAGES = [
  "/",
  "/hot",
  "/slots",
  "/casino",
  "/sports",
  "/mini",
  "/fishing",
  "/virtual",
  "/slot-rtp",
];

const isZoomPage = computed(() =>
  ZOOM_PAGES.some((p) => route.path === localePath(p)),
);

const customSeoMatch = useCustomSeoMatch();

const customSeoFooter = computed(() => {
  // Matched per-page row wins, then the brand config's default footer.
  // Userpage doesn't expose a footer field, so there is no userpage fallback.
  const rowFooter = customSeoMatch.value?.footer;
  const raw =
    (typeof rowFooter === "string" && rowFooter.trim() ? rowFooter : "") ||
    brandSiteConfig?.seo?.customSeo?.footer ||
    "";
  return sanitizeHtml(raw);
});

const bodyBgStyle = computed(() => {
  const hasImage = !!siteConfig.assets?.images?.mainBackground;
  const color = hasImage ? '#000000' : (siteConfig.theme?.bodyBgColor || '#000000');
  return `background-color: ${color};`;
});

useHead({
  bodyAttrs: {
    style: bodyBgStyle,
  },
});

// Pages where the banner is hidden and navbar is sticky from initial load
const NAVBAR_STICKY_PAGES: string[] = [];

// Category pages no longer auto-scroll past the banner — the boss wants the
// banner visible on first load (same UX as home). Kept as an empty list so the
// existing isAutoScrollPage / autoScrollPastBanner machinery short-circuits to
// "no page matches" without ripping it out.
const AUTO_SCROLL_PAGES: string[] = [];

// State
const headerHeight = ref(97);
const isAtTop = ref(true);
const isImagesFixed = ref(true);
const isNavFixed = ref(false);
// Desktop game-section bg "sticky" state: false = absolute (scrolls with the
// page), true = fixed to the viewport top once the wrapper reaches it, so the
// artwork stays visible instead of scrolling away. Toggled in scrollWork.
const gameBgAnchor = ref<HTMLElement | null>(null);
const isGameBgFixed = ref(false);
const navbarHeight = ref(0);
const navbarAnchor = ref<HTMLElement | null>(null);
// Mobile announcement bar — measured so the sticky bar and the fixed navbar
// stack (navbar top + its trigger are offset by this). 0 on desktop (hidden).
const announcementBar = ref<HTMLElement | null>(null);
const announcementHeight = ref(0);
const bannerContainer = ref<HTMLElement | null>(null);
const isBannerVisible = ref(false);
const initialScrollDone = ref(false);
const mainContent = ref<HTMLElement | null>(null);
// Decorative side media — flipped to false if a src 404s so the broken
// element is removed rather than showing a missing-media placeholder.
const leftDecorLoaded = ref(true);
const rightDecorLoaded = ref(true);

// Flipped once the browser is idle after hydration — gates components that
// don't need to be in the initial paint (LiveChat, BannerPopup).
const deferredReady = ref(false);

// Pages where navbar is fixed from initial load (no scroll required)
const isNavbarStickyPage = computed(() =>
  NAVBAR_STICKY_PAGES.some(
    (p) => route.path === p || route.path.startsWith(`${p}/`),
  ),
);

// Pages where banner shows but we auto-scroll past it
const isAutoScrollPage = computed(() =>
  AUTO_SCROLL_PAGES.some(
    (p) => {
      const resolved = localePath(p);
      return route.path === resolved || route.path.startsWith(`${resolved}/`);
    },
  ),
);

// On sticky pages: fixed when banner not visible; on other pages: scroll-based.
// Applies to BOTH desktop and mobile — the Navbar renders a category bar at
// every breakpoint, so once the user scrolls past the banner the navbar pins
// under the header on desktop just like it does on mobile. (`handleResize` now
// re-runs the scroll math, so the spacer can't get stranded across a
// desktop↔mobile resize — the concern that previously gated this off desktop.)
const effectiveNavFixed = computed(() =>
  isNavbarStickyPage.value ? !isBannerVisible.value : isNavFixed.value,
);

// Side effect kept out of the computed so reactivity flushes don't fan out
// into the Pinia store mutation path during hydration.
watch(effectiveNavFixed, (fixed) => {
  uiStore.setNavSticky(fixed);
}, { immediate: true });

/**
 * Measure navbar height for the spacer
 */
const measureNavbarHeight = () => {
  if (navbarAnchor.value) {
    const navEl = navbarAnchor.value.querySelector("nav");
    if (navEl) navbarHeight.value = navEl.offsetHeight - 5;
  }
  // Mobile announcement bar height (0 when hidden at lg+). Drives the navbar's
  // sticky offset so the two pin without a gap/overlap.
  announcementHeight.value = announcementBar.value?.offsetHeight ?? 0;
};

/**
 * Handle scroll event — rAF-throttled. The native scroll event can fire dozens
 * of times per second; each invocation here calls getBoundingClientRect twice
 * (forced layout reads), so coalescing into one frame avoids long main-thread
 * tasks that hurt TBT/INP during scroll.
 */
let scrollRafId: number | null = null;
const scrollWork = () => {
  scrollRafId = null;
  if (typeof window === "undefined") return;

  const scrollY = window.scrollY || window.pageYOffset;

  if (scrollY > 0) initialScrollDone.value = true;

  if (isNavbarStickyPage.value) {
    if (!initialScrollDone.value) {
      isBannerVisible.value = false;
    } else if (bannerContainer.value) {
      const bannerRect = bannerContainer.value.getBoundingClientRect();
      isBannerVisible.value = bannerRect.bottom > headerHeight.value;
    }
  }

  isAtTop.value = scrollY < 10;
  isImagesFixed.value = scrollY > 100;

  // Desktop game-section bg: pin it once its wrapper's top reaches the viewport
  // top, so it sticks there instead of scrolling off. Switching at top<=0 means
  // the bg is already at 0 when it becomes fixed → no visual jump.
  if (gameBgAnchor.value) {
    isGameBgFixed.value = gameBgAnchor.value.getBoundingClientRect().top <= 0;
  }

  if (navbarAnchor.value) {
    const rect = navbarAnchor.value.getBoundingClientRect();
    // Fix the navbar once it reaches the bottom of the header + the sticky
    // announcement bar, so it pins directly below the bar (not under it).
    isNavFixed.value =
      isNavbarStickyPage.value ||
      rect.top <= headerHeight.value + announcementHeight.value;
  }
};

const handleScroll = () => {
  if (scrollRafId !== null) return;
  scrollRafId = requestAnimationFrame(scrollWork);
};

/**
 * Update header height based on viewport width
 */
const updateHeaderHeight = () => {
  if (typeof window === "undefined") return;
  // The header is a fixed-height bar: the mobile design height (<690px) comes
  // from the brand/API config, desktop (>=690px) is 83px. No viewport scaling.
  if (window.innerWidth < 690) {
    headerHeight.value = siteConfig.theme.mobileHeaderHeight || 60;
  } else {
    headerHeight.value = 83;
  }
  // Keep --mh-header-height (set pre-paint by app.vue's inline script, and the
  // source of the header spacer's height) in sync on resize.
  document.documentElement.style.setProperty(
    "--mh-header-height",
    headerHeight.value + "px",
  );
};

/**
 * Handle resize event
 * Detects breakpoint changes and resets banner key to force re-render
 */
const handleResize = () => {
  if (typeof window === "undefined") return;

  updateHeaderHeight();
  measureNavbarHeight();

  // Recompute the scroll-driven fixed/sticky state for the new viewport. Header
  // height and the lg breakpoint change on resize, so the navbar's fix trigger
  // and its flow spacer must be re-evaluated — otherwise a fixed navbar (and its
  // spacer) can be left stranded across a desktop↔mobile resize.
  handleScroll();

  // Update mobile state in app store. BannerPreview reacts to viewport changes
  // on its own (matchMedia), so no forced re-render is needed here.
  uiStore.setMobile(window.innerWidth <= 768);
};

// Auto-scroll past banner so navbar becomes sticky
let bannerResizeObserver: ResizeObserver | null = null;

const autoScrollPastBanner = () => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      scrollToBannerEnd();
    });
  });
};

const scrollToBannerEnd = () => {
  if (bannerContainer.value) {
    const bannerHeight = bannerContainer.value.offsetHeight;
    if (bannerHeight > 0) {
      // Set min-height directly on DOM so scroll works immediately
      if (mainContent.value) {
        const needed =
          window.innerHeight - headerHeight.value - navbarHeight.value;
        mainContent.value.style.minHeight = needed + "px";
      }
      window.scrollTo(0, bannerHeight);
      handleScroll();
    }
  }
};

// Watch banner resize to re-scroll on auto-scroll pages (e.g. banner images load after initial scroll)
const startBannerResizeObserver = () => {
  stopBannerResizeObserver();
  if (!bannerContainer.value) return;
  bannerResizeObserver = new ResizeObserver(() => {
    if (isAutoScrollPage.value) {
      scrollToBannerEnd();
    }
  });
  bannerResizeObserver.observe(bannerContainer.value);
};

const stopBannerResizeObserver = () => {
  if (bannerResizeObserver) {
    bannerResizeObserver.disconnect();
    bannerResizeObserver = null;
  }
};

// Guest → authenticated without a page reload (login modal). The guest may have
// scrolled down (e.g. logging in from the bottom nav), leaving the page scrolled
// with the navbar + announcement bar stuck in their `fixed` state and their
// flow-space spacers (see the `effectiveNavFixed` spacers above) left behind as a
// black gap. Reset scroll + all sticky flags so the header/announcement/navbar
// snap back to their normal top-of-page layout. The open modal locks body scroll
// (`overflow: hidden`), which makes `scrollTo` a no-op, so clear that first.
watch(
  () => authStore.isAuthenticated,
  (isAuth, wasAuth) => {
    if (!isAuth || wasAuth || typeof window === "undefined") return;
    document.body.style.overflow = "";
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    initialScrollDone.value = false;
    isBannerVisible.value = false;
    isNavFixed.value = false;
    isAtTop.value = true;
    isImagesFixed.value = false;
    // Re-measure and recompute once the reflow (auth-only sections mount/unmount)
    // settles, so the spacers/flags reflect the final layout at the top.
    nextTick(() => {
      measureNavbarHeight();
      handleScroll();
    });
  },
);

// Ensure navbar is sticky on sticky pages when route changes (e.g. client-side nav)
watch(
  () => route.path,
  () => {
    if (isNavbarStickyPage.value) {
      initialScrollDone.value = false;
      isBannerVisible.value = false;
      isNavFixed.value = true;
    } else if (isAutoScrollPage.value) {
      // Scroll instantly on client-side nav (banner already rendered, no delay needed)
      scrollToBannerEnd();
      startBannerResizeObserver();
    } else {
      if (mainContent.value) mainContent.value.style.minHeight = "";
      stopBannerResizeObserver();
    }
  },
  { immediate: false },
);

// Lifecycle hooks
onMounted(() => {
  if (typeof window !== "undefined") {
    // Flip deferredReady after the browser is idle so low-priority UI
    // (LiveChat, BannerPopup) doesn't compete with LCP paint.
    type IdleWin = typeof window & {
      requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void;
    };
    const w = window as IdleWin;
    if (typeof w.requestIdleCallback === "function") {
      w.requestIdleCallback(() => { deferredReady.value = true; }, { timeout: 3000 });
    } else {
      setTimeout(() => { deferredReady.value = true; }, 1500);
    }

    // Initialize device detection
    uiStore.initDeviceDetection();

    // Set initial header height and measure navbar
    updateHeaderHeight();
    measureNavbarHeight();

    // Add event listeners
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("resize", handleResize, { passive: true });

    // Set initial state (isBannerVisible, isNavFixed, etc.)
    nextTick(() => {
      handleScroll();
      if (isAutoScrollPage.value) {
        autoScrollPastBanner();
        startBannerResizeObserver();
      }
    });

  }
});

onUnmounted(() => {
  if (typeof window !== "undefined") {
    window.removeEventListener("scroll", handleScroll);
    window.removeEventListener("resize", handleResize);
  }
  stopBannerResizeObserver();
});
</script>

<style scoped>
/* ---------------------------------------------------------------------------
   Partner cosmic backdrop — orange planet-glow + starfield, top-right, pure
   CSS. Sits behind the partner nav (z-20) and content (z-10) at z-0, masked so
   it dissolves into the dark page below.
   --------------------------------------------------------------------------- */
.partner-cosmos {
  position: absolute;
  top: 0;
  right: 0;
  z-index: 0;
  width: min(1000px, 68%);
  height: 230px;
  pointer-events: none;
  background: url("/designs/partner/cosmo.webp") right top / cover no-repeat;
  /* Radial mask keeps the planet (top-right) crisp and dissolves the artwork
     toward the bottom-left so it melts into the panel — no hard edges. */
  -webkit-mask-image: radial-gradient(145% 130% at 100% 0%, #000 42%, rgba(0, 0, 0, 0.5) 64%, transparent 84%);
  mask-image: radial-gradient(145% 130% at 100% 0%, #000 42%, rgba(0, 0, 0, 0.5) 64%, transparent 84%);
}

/* Smaller on phones/tablets so the header doesn't feel busy. */
@media (max-width: 1023px) {
  .partner-cosmos {
    width: 82%;
    height: 160px;
    opacity: 0.9;
  }
}

/* Partner body container — themed premium panel (theme.partner.*), a separate
   container from the partner nav bar above it. Panel chrome only at lg+; on
   mobile the content sits directly on the page. The cosmo artwork (.partner-cosmos)
   lives inside it, clipped to its rounded top-right. */
@media (min-width: 1024px) {
  .partner-body {
    background: var(--pb-bg);
    border-color: var(--pb-border);
    backdrop-filter: blur(16px) saturate(1.1);
    -webkit-backdrop-filter: blur(16px) saturate(1.1);
    /* Layered premium shadow: a tight contact shadow + a soft ambient drop. */
    box-shadow:
      0 1px 2px 0 rgba(0, 0, 0, 0.4),
      0 24px 60px -28px rgba(0, 0, 0, 0.9),
      inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
  }
}

.seo-link {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  color: #FF8533;
  background-color: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 106, 0, 0.25);
  text-decoration: none;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.seo-link:visited {
  color: #FF8533;
}

.seo-link:hover,
.seo-link:focus-visible {
  background-color: rgba(255, 106, 0, 0.15);
  border-color: rgba(255, 106, 0, 0.5);
  text-decoration: underline;
  outline: none;
}

.seo-links ::selection {
  background-color: rgba(255, 106, 0, 0.35);
  color: #000;
}

/* Admin-managed intro copy (v-html) — :deep() so scoped styles reach it. */
.seo-intro :deep(h1) {
  font-size: 1.5rem;
  font-weight: 700;
  color: #FF6A00;
  margin-bottom: 1rem;
}

.seo-intro :deep(h2),
.seo-intro :deep(h3) {
  font-size: 1.125rem;
  font-weight: 600;
  color: #FF6A00;
  margin-top: 2rem;
  margin-bottom: 0.75rem;
}

.seo-intro :deep(a) {
  color: #FF8533;
  text-decoration: underline;
}

.seo-intro :deep(ul),
.seo-intro :deep(ol) {
  padding-left: 1.5rem;
}

.seo-intro :deep(ul) {
  list-style-type: disc;
}

.seo-intro :deep(ol) {
  list-style-type: decimal;
}
</style>
