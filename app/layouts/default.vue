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

    <!-- Pages render 1:1. The `site-zoom` 102% big-screen zoom used to be
         applied here for the game pages, but it scaled the content column past
         its stated 1202px (1202 x 1.02 = 1226 on screen) along with every card
         and label inside it. The CSS mechanism is still in main.css — re-add
         `:class="{ 'site-zoom': isZoomPage }"` here to bring it back, and
         restore the ZOOM_PAGES allow-list with it. -->
    <div class="flex flex-col w-full min-w-0">
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
        <!-- Signed-in user info, directly under the header (mobile only). It
             sits outside the two-column wrapper below so it spans the full
             viewport width rather than the content column.

             It is also the bar that PINS on scroll: balances are worth keeping
             on screen, an announcement marquee is not, so the announcement bar
             below stays in normal flow and this takes the slot under the header
             that it used to hold. Same JS `fixed` + spacer mechanism (NOT CSS
             sticky): html/body have `overflow-x: auto`, which disables
             position:sticky for descendants. `userBarHeight` measures 0 for
             guests and on desktop — the component renders nothing there — so
             `isUserBarPinned` is false and this is inert without needing its own
             viewport check. -->
        <!-- Zero-height sentinel, ALWAYS in flow. The bar pins the moment this
             reaches the bottom of the header, so it leaves and rejoins the flow
             at exactly the point it would have scrolled under — no jump, and no
             waiting for the navbar's trigger further down the page. Measuring
             the bar itself would not work: once fixed its rect.top is pinned to
             the header, which would latch the state on. -->
        <div ref="userBarSentinel" aria-hidden="true" />
        <div ref="userBarAnchor" :class="isUserBarPinned ? 'fixed left-0 right-0 z-40' : ''"
          :style="isUserBarPinned ? { top: headerHeight + 'px' } : {}">
          <MobileUserBar />
        </div>
        <!-- Spacer keeps the bar's flow space while it's fixed on scroll. -->
        <div v-if="isUserBarPinned" :style="{ height: userBarHeight + 'px' }" aria-hidden="true" />
        <!-- Two columns from lg: the left rail, then the existing content stack.
             Below lg this wrapper is inert (no flex), so the single-column
             mobile/tablet layout — and all the sticky/scroll machinery tuned to
             it — is untouched. The rail replaces the desktop category bar, so
             Navbar below is rendered with `:desktop="false"`. -->
        <!-- 1456px shell = the 1202px content column + 210px rail + 28px gap +
             16px `lg:px-2` gutters. Sized from the content column, so adjust it
             here if the rail, the gap or the gutters change. -->
        <div class="lg:flex lg:w-full lg:max-w-[1456px] lg:mx-auto lg:items-start gap-2 lg:gap-2 xl:gap-7 lg:px-2">
          <!-- The rail pins under the header on scroll with real `position:
               sticky` — main.css drops body's `overflow-x` from lg up so sticky
               can engage. Compositor-driven, so it does not trail the scroll the
               way a JS-positioned equivalent does.

               `lg:self-stretch` is what makes it release at the footer: it
               overrides the row's `items-start` so this column spans the full
               shell height, and a sticky element cannot travel past its own
               parent. The rail therefore rides up with the page exactly as the
               shell ends — no scroll handler, no second threshold. -->
          <div class="hidden lg:block lg:self-stretch lg:w-[210px] lg:flex-shrink-0 pt-0">
            <div class="lg:sticky" :style="railStyle">
              <AppSidebar />
            </div>
          </div>

          <!-- Content column. `lg:flex-1` takes the space the rail leaves;
               `lg:max-w-[1202px]` states the intended width outright so it is
               declared here rather than only implied by the shell arithmetic
               above, and cannot drift if the shell, rail or gap changes. -->
          <div class="min-w-0 lg:flex-1 lg:max-w-[1202px]">
            <!-- Announcement Bar (desktop lg+: above the banner). Hidden on the RTP page. -->
            <!-- Fills the content column rather than pinning to a fixed 1152px: the
             column is capped at 1202px by its wrapper, so a fixed width here
             would leave dead space either side and break alignment with the
             banner directly below. -->
            <div v-if="!isRtpPage" class="hidden lg:block w-full mx-auto">
              <div
                class="w-full rounded-t-[10px] shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] max-h-[30px] md:max-h-[40px] md:min-h-[40px] min-h-[32px] md:h-[40px] flex justify-center"
                :style="{ background: brandSiteConfig.theme.announcement.desktopGradient }">
                <div
                  class="w-full flex items-center justify-center gap-1.5 md:gap-4 pr-2 md:pr-6 pl-2 md:pl-3 overflow-visible">
                  <AnnouncementMarquee :text="brandSiteConfig.theme.announcement.text"
                    size-class="text-[16px] lg:text-[16px]" :text-stroke="brandSiteConfig.theme.announcement.textStroke"
                    :text-fill="brandSiteConfig.theme.announcement.textFill" />
                </div>
              </div>
            </div>

            <!-- Banner (collapsed on sticky-navbar pages until scrolled past, so navbar sits under header). -->
            <div id="banner-container" ref="bannerContainer"
              class="w-full mx-auto transition-[height,visibility] duration-200" :style="!initialScrollDone && isNavbarStickyPage
                ? { height: 0, overflow: 'hidden', visibility: 'hidden' }
                : {}
                ">
              <!-- Every page with a banner slot draws it from the CMS, scoped by
               its own page key — so a category page can carry its own creative
               instead of the single hardcoded image they used to share. Pages
               with no key (and pages whose key has no active banner) render
               nothing. /slot-rtp is the one exception: it keeps its own
               hardcoded creative and is deliberately not CMS-driven. -->
              <img v-if="isRtpPage" :src="rtpBannerSrc" :alt="$t('navbar.rtp')" class="block w-full h-auto">
              <!-- Deliberately NOT keyed, and no transition here. This layout
               survives client-side navigation, so one BannerPreview instance
               persists and simply re-filters the banner store when `page`
               changes — every page's banners are already hydrated, so there is
               no fetch in the swap. Keying it instead remounted the component,
               which emptied the slot between the two pages: the height
               collapsed to zero and the page below jumped up and back. Keeping
               the instance is what makes the swap smooth; the height glide
               lives inside the component. -->
              <BannerPreview v-else-if="bannerPage" :page="bannerPage" />
            </div>

            <!-- Announcement Bar (mobile/tablet < lg: below the banner). It scrolls
             away with the page — the pinned slot under the header belongs to
             MobileUserBar above. -->
            <div v-if="!isRtpPage" class="block lg:hidden w-full xl:w-[1152px] mx-auto">
              <div
                class="w-full shadow-[0px_4px_4px_0px_rgba(0,0,0,0.25)] h-[36px] min-h-[36px] max-h-[36px] flex justify-center"
                :style="{ background: brandSiteConfig.theme.announcement.mobileBg }">
                <div
                  class="w-full flex items-center justify-center gap-1.5 md:gap-4 pr-2 md:pr-6 pl-2 md:pl-3 overflow-visible">
                  <NuxtImg :src="brandSiteConfig.theme.announcement.mobileIcon" alt="" aria-hidden="true"
                    class="flex-shrink-0 h-5 w-auto object-contain" />
                  <AnnouncementMarquee :text="brandSiteConfig.theme.announcement.text"
                    size-class="text-[14px] lg:text-[15px]" :text-stroke="brandSiteConfig.theme.announcement.textStroke"
                    :text-fill="brandSiteConfig.theme.announcement.textFill" />
                  <!-- Invisible spacer mirrors the leading icon so the marquee region
                   is symmetric and short (centered) text sits at the bar's true
                   centre rather than being pushed right by the icon. -->
                  <NuxtImg :src="brandSiteConfig.theme.announcement.mobileIcon" alt="" aria-hidden="true"
                    class="flex-shrink-0 h-5 w-auto object-contain invisible" />
                </div>
              </div>
            </div>

            <!-- The mobile guest auth buttons that used to sit here (a black strip
             below the announcement bar) now live in the mobile header itself —
             see components/layout/AppHeader.vue. -->

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
                ]" :style="{ width: '100%' }">
                  <div :style="{
                    ...siteConfig.assets.homepage.gameSectionBg.desktopStyle,
                    backgroundImage: `url('${siteConfig.assets.homepage.gameSectionBg.image}')`,
                  }" />
                </div>
              </template>

              <!-- Navbar — hidden on the RTP page (own provider tabs). -->
              <div v-if="!isRtpPage" ref="navbarAnchor" class="relative z-20">
                <div :class="effectiveNavFixed ? 'fixed left-0 right-0 z-40' : ''"
                  :style="effectiveNavFixed ? { top: (headerHeight + (isUserBarPinned ? userBarHeight : 0)) + 'px' } : {}">
                  <Navbar :desktop="false" />
                </div>
                <div v-if="effectiveNavFixed" :style="{ height: navbarHeight + 'px' }" />
              </div>

              <!-- Main Content -->
              <!-- `lg:overflow-visible` is what lets page content use
               `position: sticky`. The overflow pair below makes this element a
               scroll container, and since it never scrolls vertically, a sticky
               descendant resolves against it and can never engage — the RTP
               provider bar sat inside here, which is why it needed a JS `fixed`
               workaround. The rail escapes this only by living outside <main>.
               Below lg the pair stays: narrow viewports still need the
               horizontal scroll, and body is a scroll container there anyway, so
               sticky is unavailable regardless. -->
              <main ref="mainContent" class="relative overflow-y-hidden overflow-x-auto lg:overflow-visible mt-0 z-10">
                <div class="relative z-10 w-full">
                  <slot />
                </div>
              </main>
            </div>
          </div>
        </div>

        <!-- Mobile Bottom Navigation — signed-in only. Gated here rather than
             inside the component so guests never fetch its async chunk. Shown
             on every page, including the RTP page. -->
        <BottomNav v-if="authStore.isAuthenticated" />

        <!-- Custom SEO footer — admin-managed HTML from /api/site/custom-seo.
             Only rendered when a row matches this hostname and supplies a
             non-empty footer string. -->
        <div v-if="customSeoFooter" class="w-full bg-black/70">
          <!-- eslint-disable-next-line vue/no-v-html -->
          <!-- No forced text-align here: the footer HTML is admin-authored and
               sanitizeHtml preserves its own layout/alignment, so alignment is
               the author's call (add text-align in the CMS to centre). -->
          <footer class="custom-seo-footer w-full mx-auto px-4 py-6 text-sm text-white" v-html="customSeoFooter" />
        </div>

        <!-- Premium site footer -->
        <AppFooter />
      </div>
    </div>

    <!-- Decorative side media — fixed behind content, desktop (lg+) only. An
         mp4 (or image fallback) on each flank of the centred content column,
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
    <!-- Deposit/Withdrawal belong here rather than inside Navbar: the RTP page
         renders no navbar (see `isRtpPage` above), but the desktop rail and the
         bottom nav that open them render on every page — hosting them in the
         navbar left both triggers dead on that page. -->
    <DepositModal v-if="uiStore.showDepositModal" :is-open="uiStore.showDepositModal"
      @close="uiStore.setShowDepositModal(false)" />
    <WithdrawalModal v-if="uiStore.showWithdrawalModal" :is-open="uiStore.showWithdrawalModal"
      @close="uiStore.setShowWithdrawalModal(false)" />
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
// The `v-if` guards keep each chunk (Deposit/Withdrawal pull in vee-validate,
// zod and the bank UI) from being requested until the modal is actually opened.
const DepositModal = defineAsyncComponent(() => import("@/components/transaction/DepositModal.vue"));
const WithdrawalModal = defineAsyncComponent(() => import("@/components/transaction/WithdrawalModal.vue"));
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

// The Slot RTP page is a stripped-down variant: no announcement bar, no bottom
// nav, and a single static promo banner (rtp-banner.png on the asset CDN)
// instead of the rotating BannerPreview carousel.
const isRtpPage = computed(() => route.path === localePath("/slot-rtp"));
const rtpBannerSrc = cdn("/designs/rtp-banner.png");

/**
 * Which page's CMS banners to render, or null for a page with no banner slot.
 *
 * Resolved against the UNLOCALISED path: `route.path` carries the locale
 * prefix under `no_prefix`-less strategies, so each candidate is compared
 * through `localePath` rather than matched literally. Replaces the single
 * hardcoded image every non-home page used to share.
 */
const bannerPage = computed(() => {
  for (const path of BANNER_PAGE_ROUTES) {
    if (route.path === localePath(path)) return pageBannerKey(path);
  }
  return null;
});

// The 102% big-screen zoom is off: it rendered the 1202px content column at
// 1226px. The allow-list that drove it lived here — see the template comment on
// the layout wrapper for how to restore it.

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
// Seeded to the DESKTOP header height rather than an arbitrary placeholder:
// updateHeaderHeight() overwrites it on mount with 83 (>=690px) or the config's
// mobileHeaderHeight, so any other starting value is wrong at both breakpoints
// and shifts whatever reads it during the first client tick. (The desktop rail
// no longer reads it at all — see railStyle.)
const headerHeight = ref(83);
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
// Mobile user bar — measured so the pinned bar and the fixed navbar stack
// (navbar top + its trigger are offset by this). 0 for guests and on desktop,
// where MobileUserBar renders nothing.
const userBarAnchor = ref<HTMLElement | null>(null);
const userBarSentinel = ref<HTMLElement | null>(null);
const userBarHeight = ref(0);
// Set by the scroll handler off the sentinel above — the bar has its own
// trigger rather than riding the navbar's, which fires much further down.
const userBarStuck = ref(false);
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

// The user bar has its OWN trigger (`userBarStuck`, set off the sentinel in the
// scroll handler) rather than riding `effectiveNavFixed`: the navbar's trigger
// fires only once the navbar itself reaches the header, by which point this bar
// has long scrolled away — so it used to vanish and then snap back into place
// somewhere past the announcement bar. `userBarHeight` is 0 for guests and at
// lg+, where MobileUserBar renders nothing, which keeps this false there
// without a second viewport check.
const isUserBarPinned = computed(
  () => userBarStuck.value && userBarHeight.value > 0,
);

// Side effect kept out of the computed so reactivity flushes don't fan out
// into the Pinia store mutation path during hydration.
watch(effectiveNavFixed, (fixed) => {
  uiStore.setNavSticky(fixed);
}, { immediate: true });

// The pinned user bar's height, published as a CSS var alongside
// `--mh-header-height`. Elements INSIDE the page slot also pin under the header
// (the RTP provider strip), and they have no access to `isUserBarPinned` /
// `userBarHeight` from here — without this they pin at the header's bottom edge
// and collide with this bar. `calc(var(--mh-header-height) +
// var(--mh-userbar-height))` is the correct top for anything stacking below it.
// 0px whenever the bar isn't pinned, and at lg+/for guests where it doesn't
// render at all, so the calc is inert there.
watch(
  () => (isUserBarPinned.value ? userBarHeight.value : 0),
  (h) => {
    if (typeof document === "undefined") return;
    document.documentElement.style.setProperty("--mh-userbar-height", h + "px");
  },
  { immediate: true },
);

/**
 * Sticky offset for the desktop rail. Only `headerHeight` is dynamic, and it
 * changes on resize rather than on scroll, so this costs nothing per frame —
 * the browser does the scroll work.
 *
 * The height cap plus `overflow-y: auto` matter because the rail is a long list:
 * while stuck it no longer scrolls with the page, so on a short viewport its
 * lower items would be unreachable without a scroller of its own. 12px of
 * breathing room keeps the rounded bottom edge off the viewport edge.
 */
const railStyle = computed(() => ({
  // Driven by the CSS var, NOT by `headerHeight`: that ref starts at a
  // placeholder and only becomes correct in updateHeaderHeight() on mount, so
  // the rail used to paint at the placeholder offset and then visibly jump up
  // once hydration corrected it. `--mh-header-height` is written pre-paint by
  // app.vue's inline <head> script, so the very first paint is already right
  // and nothing moves. Fallback matches the desktop header (the rail is
  // lg-only, where the header is always 83px).
  top: "var(--mh-header-height, 83px)",
  maxHeight: "calc(100vh - var(--mh-header-height, 83px) - 12px)",
  overflowY: "auto" as const,
}));

/**
 * Measure navbar height for the spacer
 */
const measureNavbarHeight = () => {
  if (navbarAnchor.value) {
    const navEl = navbarAnchor.value.querySelector("nav");
    if (navEl) navbarHeight.value = navEl.offsetHeight - 5;
  }
  // Mobile user bar height (0 for guests and at lg+, where it renders nothing).
  // Drives the navbar's sticky offset so the two pin without a gap/overlap, and
  // gates `isUserBarPinned` — a 0 here means there is nothing to pin.
  userBarHeight.value = userBarAnchor.value?.offsetHeight ?? 0;
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

  // Mobile user bar: pin the moment its flow position reaches the bottom of the
  // header. Measured off the zero-height sentinel that stays in flow, never off
  // the bar itself — once fixed, the bar's own rect.top IS headerHeight, so it
  // would latch on and never release.
  if (userBarSentinel.value) {
    userBarStuck.value =
      userBarSentinel.value.getBoundingClientRect().top <= headerHeight.value;
  }

  // Desktop game-section bg: pin it once its wrapper's top reaches the viewport
  // top, so it sticks there instead of scrolling off. Switching at top<=0 means
  // the bg is already at 0 when it becomes fixed → no visual jump.
  if (gameBgAnchor.value) {
    isGameBgFixed.value = gameBgAnchor.value.getBoundingClientRect().top <= 0;
  }

  if (navbarAnchor.value) {
    const rect = navbarAnchor.value.getBoundingClientRect();
    // Fix the navbar once it reaches the bottom of the header + the pinned user
    // bar, so it pins directly below it (not under it).
    isNavFixed.value =
      isNavbarStickyPage.value ||
      rect.top <= headerHeight.value + userBarHeight.value;
  }

  // Desktop rail: pin it under the header once its column would scroll past.
  // The column is `hidden` below lg, so the breakpoint is checked rather than
  // trusting a zeroed rect. Measuring `left` on every pass keeps the pinned rail
  // aligned through resizes and horizontal scrolling for free.
  // The desktop rail needs nothing here: it is `position: sticky`, so the
  // browser positions it on the compositor without a scroll handler.
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
    if (typeof window === "undefined") return;

    // Only the guest → authenticated direction needs the scroll/flag reset.
    if (isAuth && !wasAuth) {
      document.body.style.overflow = "";
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
      initialScrollDone.value = false;
      isBannerVisible.value = false;
      isNavFixed.value = false;
      isAtTop.value = true;
      isImagesFixed.value = false;
      userBarStuck.value = false;
    }

    // Both directions need the re-measure: MobileUserBar mounts and unmounts
    // with the session, and its height gates the pin and offsets the navbar —
    // left stale on logout it would strand a 34px spacer as a black gap.
    // Runs once the reflow (auth-only sections mount/unmount) settles.
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
