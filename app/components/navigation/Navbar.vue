<template>
  <nav class="z-40 w-full flex justify-center flex-col items-center">
    <div class="w-full flex justify-center">
      <div class="w-full max-w-[1152px]">
        <!-- Mobile/tablet Navigation (shown below the lg breakpoint so iPad
             portrait uses the mobile category nav). -->
        <!-- Lucky-only: dim to black on scroll even though it has its own
             navbar-bg.png. Other brands keep their existing behavior. -->
        <div class="block lg:hidden relative w-full overflow-hidden"
          :class="navSkin.layout.mobile.bar"
          :style="{ backgroundColor: uiStore.isNavSticky ? siteConfig.theme.nav.stickyBg : siteConfig.theme.nav.defaultBg }">
          <!-- Nav background image (same asset the desktop nav uses); sits behind
               the z-10 icon row. Oversized + top-anchored inside overflow-hidden
               so any transparent/light band baked into the bottom of the asset
               (e.g. rabbit/dragon navbar-bg.png) is cropped off the bottom edge
               instead of showing as a seam. Mirrors the desktop nav's approach. -->
          <NuxtImg v-if="siteConfig.assets.navIcons.background" :src="siteConfig.assets.navIcons.background"
            :alt="altFromSrc(siteConfig.assets.navIcons.background)"
            class="absolute top-0 left-1/2 -translate-x-1/2 w-[calc(100%+12px)] h-[calc(100%+20px)] object-cover"
            width="1200" height="129" />
          <!-- Scroll dimmer over the nav-background image (mirrors desktop). -->
          <div v-if="uiStore.isNavSticky" class="absolute inset-0 pointer-events-none"
            :style="{ backgroundColor: siteConfig.theme.nav.stickyBg, zIndex: 1 }" />
          <div ref="mobileNavScrollRef" :class="[
            'relative z-10 w-full h-full overflow-x-auto overflow-y-hidden scrollbar-hide',
            siteConfig.assets.navIcons.background
              ? ''
              : uiStore.isNavSticky
                ? ''
                : 'bg-transparent',
          ]">
            <!-- When the items all fit (no overflow) spread them evenly across
                 the full width; otherwise keep them at natural width so the row
                 scrolls. -->
            <div class="flex h-full items-center px-1"
              :class="mobileNavHasOverflow ? 'min-w-max' : 'w-full justify-around'">
              <button v-for="item in navItems" :key="item.path" type="button"
                class="group z-10 cursor-pointer flex flex-col items-center justify-center transition flex-shrink-0"
                :class="navSkin.layout.mobile.button"
                :style="{ color: isActive(item.path) ? siteConfig.theme.nav.activeItemColor : '#fff' }"
                @click="handleNavClick(item.path)">
                <NavGlyph :type="navSkin.glyph.type" :src="item.icon" :menu-bg="nav.gifBg" :menu-border="nav.gifBorder"
                  :active-src="item.activeIcon" :active-menu-bg="nav.activeGifBg" :active-menu-border="nav.activeGifBorder"
                  :active="isActive(item.path)"
                  :label="$t(item.labelKey)" :mask-size-percent="item.maskSizePercent"
                  :box="navSkin.layout.mobile.box" />
                <span v-if="navSkin.glyph.showLabel"
                  class="-mt-1 text-[11px] font-bold uppercase leading-none tracking-tight">{{
                    $t(item.labelKey) }}</span>
              </button>
            </div>
          </div>
          <!-- Scroll right indicator — only when the items overflow. -->
          <button v-show="mobileNavHasOverflow" type="button"
            class="absolute flex items-center justify-center z-20 cursor-pointer"
            style="width: 45px; height: 83px; right: 0; top: 0; border: none; outline: none; background-image: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 68.5%, rgba(0,0,0,0.6) 100%); background-size: 100% 100%; background-repeat: no-repeat; background-position: right center;"
            @click.stop="scrollMobileNavRight">
            <svg viewBox="0 0 20 34" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="28"
              aria-hidden="true" class="w-5 h-7 object-contain transition-transform duration-300"
              :class="{ 'rotate-180': isMobileScrolledRight }"
              style="filter: drop-shadow(1px 1px 0.5px rgba(0,0,0,0.5));">
              <path d="M2.5 2.5L15.5 15.8091L2.5 29.1181" stroke="white" stroke-width="5" stroke-linecap="round"
                stroke-linejoin="round" />
            </svg>
          </button>
          <!-- <div
class="w-full h-[6px]" :style="{
            backgroundColor: uiStore.isNavSticky
              ? siteConfig.theme.nav.stickyBg
              : 'transparent',
          }" /> -->
          <!-- <div :style="{
            height: '1px',
            marginTop: '-1px',
            boxShadow: '0 2px 2px 0 rgba(0,0,0,0.7)',
            backgroundColor: '#ffffff',
          }" class="w-full" /> -->
        </div>

        <!-- Desktop Navigation (lg+) -->
        <!-- Lucky-only: dim to black on scroll. Other brands keep their
             existing behavior. -->
        <div class="hidden lg:block relative w-full xl:w-[1152px] mx-auto h-[65px] overflow-hidden"
          :class="navSkin.layout.desktop.outer"
          :style="{ backgroundColor: uiStore.isNavSticky ? siteConfig.theme.nav.stickyBg : siteConfig.theme.nav.defaultBg }">
          <NuxtImg v-if="siteConfig.assets.navIcons.background" :src="siteConfig.assets.navIcons.background"
            :alt="altFromSrc(siteConfig.assets.navIcons.background)"
            class="absolute w-[calc(100%+12px)] h-[calc(100%+12px)] object-cover" width="1200" height="129" />
          <!-- Scroll dimmer over the nav-background image -->
          <div v-if="uiStore.isNavSticky" class="absolute inset-0 pointer-events-none"
            :style="{ backgroundColor: siteConfig.theme.nav.stickyBg, zIndex: 1 }" />
          <div class="relative z-10 w-full flex h-full items-center justify-start pl-2 pr-5"
            :class="navSkin.layout.desktop.rowGap">
            <!-- Scrollable nav items -->
            <div class="max-w-[892px] min-w-0 relative overflow-hidden"
              :class="navSkin.layout.desktop.area">
              <div ref="desktopNavScrollRef" class="overflow-x-auto overflow-y-hidden h-full scroll-smooth"
                style="scrollbar-width: none; -ms-overflow-style: none">
                <div class="flex items-center justify-start min-w-max h-full"
                  :class="navSkin.layout.desktop.innerGap">
                  <button v-for="item in navItems" :key="item.path" type="button"
                    class="group cursor-pointer flex flex-col items-center justify-center transition flex-shrink-0"
                    :class="navSkin.layout.desktop.button" :style="{
                      marginTop: siteConfig.theme.navMenuItemMarginTop,
                      marginLeft: item.marginLeft,
                      color: isActive(item.path) ? siteConfig.theme.nav.activeItemColor : '#fff',
                    }" @click="handleNavClick(item.path)">
                    <NavGlyph :type="navSkin.glyph.type" :src="item.icon" :menu-bg="nav.gifBg"
                      :menu-border="nav.gifBorder" :active-src="item.activeIcon"
                      :active-menu-bg="nav.activeGifBg" :active-menu-border="nav.activeGifBorder"
                      :active="isActive(item.path)" :label="$t(item.labelKey)"
                      :mask-size-percent="item.maskSizePercent"
                      :box="navSkin.layout.desktop.box" />
                    <span v-if="navSkin.glyph.showLabel"
                      class="text-[15px] font-bold uppercase leading-none tracking-tight">{{
                        $t(item.labelKey) }}</span>
                  </button>
                </div>
              </div>
              <!-- Scroll right indicator - inside nav area, on top of nav items.
                   Only when the items overflow. -->
              <button v-show="desktopNavHasOverflow" type="button"
                class="block xl:hidden absolute flex items-center justify-center z-50 cursor-pointer"
                style="width: 100px; height: 100%; right: 0; top: 0; padding: 0 10px; background-image: linear-gradient(to left, rgba(0,0,0,0.95) 0%, rgba(0,0,0,0.75) 25%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.15) 70%, rgba(0,0,0,0) 100%); border: none; outline: none;"
                @click.stop="scrollNavRight">
                <NuxtImg :alt="altFromSrc(siteConfig.assets.navIcons.arrowRight)"
                  :src="siteConfig.assets.navIcons.arrowRight" width="20" height="20"
                  class="w-7 h-7 object-contain transition-transform duration-300"
                  :class="{ 'rotate-180': isScrolledRight }" />
              </button>
            </div>

            <!-- Fixed Deposit/Withdraw Section — skin-selected (default vs Lucky)
                 by theme.nav.type via useNavSkin(). -->
            <component :is="navSkin.transaction" v-if="features.payments" />
          </div>
        </div>
      </div>
    </div>

    <DepositModal v-if="uiStore.showDepositModal" :is-open="uiStore.showDepositModal"
      @close="uiStore.setShowDepositModal(false)" />

    <WithdrawalModal v-if="uiStore.showWithdrawalModal" :is-open="uiStore.showWithdrawalModal"
      @close="uiStore.setShowWithdrawalModal(false)" />

  </nav>
</template>

<script setup lang="ts">
import { computed, defineAsyncComponent } from "vue";

const authStore = useAuthStore();
const uiStore = useUiStore();

// Async-loaded so the modal chunks (incl. vee-validate, zod, bank UI) stay
// out of the initial page bundle. `v-if` in the template keeps the import
// from firing until the user actually opens Deposit/Withdrawal.

const DepositModal = defineAsyncComponent(() => import("@/components/transaction/DepositModal.vue"));

const WithdrawalModal = defineAsyncComponent(() => import("@/components/transaction/WithdrawalModal.vue"));

const siteConfig = useSiteConfig();
const route = useRoute();
const localePath = useLocalePath();

const mobileNavScrollRef = ref<HTMLElement | null>(null);
const isMobileScrolledRight = ref(false);
// Default true so SSR/initial render uses the natural-width scroll layout
// (correct for phones); onMounted relaxes it to the spread layout when the
// items actually fit (e.g. iPad mini).
const mobileNavHasOverflow = ref(true);
const desktopNavScrollRef = ref<HTMLElement | null>(null);
const isScrolledRight = ref(false);
const desktopNavHasOverflow = ref(false);

function updateMobileScrollState() {
  const el = mobileNavScrollRef.value;
  if (!el) return;
  // Overflow is measured from the items' natural total width (sum of button
  // widths) vs the container, so the result is independent of the current
  // justify layout — otherwise switching to the spread layout would make the
  // measurement read "fits" and it could never switch back on resize.
  const flex = el.firstElementChild;
  const itemsWidth = flex
    ? Array.from(flex.children).reduce(
      (sum, c) => sum + (c as HTMLElement).offsetWidth,
      0,
    )
    : 0;
  mobileNavHasOverflow.value = itemsWidth > el.clientWidth - 6;
  const maxScroll = el.scrollWidth - el.clientWidth;
  isMobileScrolledRight.value = maxScroll > 0 && el.scrollLeft >= maxScroll - 5;
}

function scrollMobileNavRight() {
  const el = mobileNavScrollRef.value;
  if (!el) return;
  const maxScroll = el.scrollWidth - el.clientWidth;
  if (maxScroll <= 0) return;
  if (isMobileScrolledRight.value) {
    el.scrollTo({ left: 0, behavior: "smooth" });
  } else {
    el.scrollTo({ left: maxScroll, behavior: "smooth" });
  }
}

function updateScrollState() {
  const el = desktopNavScrollRef.value;
  if (!el) return;
  const maxScroll = el.scrollWidth - el.clientWidth;
  desktopNavHasOverflow.value = maxScroll > 1;
  isScrolledRight.value = maxScroll > 0 && el.scrollLeft >= maxScroll - 5;
}

function scrollNavRight() {
  const el = desktopNavScrollRef.value;
  if (!el) return;
  const maxScroll = el.scrollWidth - el.clientWidth;
  if (maxScroll <= 0) return;
  if (isScrolledRight.value) {
    el.scrollTo({ left: 0, behavior: "smooth" });
  } else {
    el.scrollTo({ left: maxScroll, behavior: "smooth" });
  }
}

// Recompute both scroll states (incl. the overflow flags that show/hide the
// arrows) on viewport resize, so the arrows appear/disappear as items fit.
function updateAllScrollStates() {
  updateMobileScrollState();
  updateScrollState();
}

onMounted(() => {
  const mobileEl = mobileNavScrollRef.value;
  if (mobileEl) {
    mobileEl.addEventListener("scroll", updateMobileScrollState, {
      passive: true,
    });
    updateMobileScrollState();
  }
  const desktopEl = desktopNavScrollRef.value;
  if (desktopEl) {
    desktopEl.addEventListener("scroll", updateScrollState, { passive: true });
    updateScrollState();
  }
  window.addEventListener("resize", updateAllScrollStates, { passive: true });
});

onBeforeUnmount(() => {
  const mobileEl = mobileNavScrollRef.value;
  if (mobileEl) {
    mobileEl.removeEventListener("scroll", updateMobileScrollState);
  }
  const desktopEl = desktopNavScrollRef.value;
  if (desktopEl) {
    desktopEl.removeEventListener("scroll", updateScrollState);
  }
  window.removeEventListener("resize", updateAllScrollStates);
});

const handleNavClick = (path: string) => {
  const resolved = localePath(path);
  if (route.path === resolved) {
    // Already on this page — scroll past the banner
    const banner = document.getElementById('banner-container')
    if (banner) {
      const bannerBottom = banner.offsetTop + banner.offsetHeight
      window.scrollTo({ top: bannerBottom, behavior: 'smooth' })
    }
  } else {
    navigateTo(resolved)
  }
}

const _handleAuthNav = (path: string) => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
  } else {
    navigateTo(path);
  }
};

const isActive = (path: string) => {
  const current = route.path;
  // Slot is active on /slots and on the lobby sub-game pages
  // (/lobbies/<id>/games list a slot provider's games).
  if (path === "/slots") {
    return (
      current === localePath("/slots") ||
      current.startsWith(`${localePath("/slots")}/`) ||
      current.startsWith("/lobbies")
    );
  }
  return (
    current === localePath(path) || current.startsWith(`${localePath(path)}/`)
  );
};

const features = useFeatures();
// Resolves the deposit/withdraw panel component for the active nav skin
// (default vs Lucky), driven by theme.nav.type. See useNavSkin().
const navSkin = useNavSkin();

// Icons are the .webp assets in public/designs/template-3/navigation/icon, sourced from the
// site config (siteConfig.theme.nav.icons) so paths stay in one place. Labels
// render as real translated text below each icon; the active state tints the
// white icon to #FFE207 via the `.nav-icon-active` filter.
// theme.nav holds the render type, gif chrome (gifBg/activeGifBg/gifBorder/activeGifBorder),
// the per-category base icons, and the (temporary) activeKeys for gif hover.
const nav = siteConfig.theme.nav;

const navItems = computed(() => [
  { path: "/hot", labelKey: "navbar.hot", icon: nav.icons.hot, activeIcon: nav.activeKeys?.hot, maskSizePercent: "78%", marginLeft: "9px" },
  { path: "/slots", labelKey: "navbar.slot", icon: nav.icons.slot, activeIcon: nav.activeKeys?.slot },
  { path: "/casino", labelKey: "navbar.casino", icon: nav.icons.casino, activeIcon: nav.activeKeys?.casino },
  { path: "/sports", labelKey: "navbar.sports", icon: nav.icons.sport, activeIcon: nav.activeKeys?.sport },
  { path: "/mini", labelKey: "navbar.mini", icon: nav.icons.mini, activeIcon: nav.activeKeys?.mini },
  { path: "/fishing", labelKey: "navbar.fishing", icon: nav.icons.fishing, activeIcon: nav.activeKeys?.fishing },
  { path: "/virtual", labelKey: "navbar.virtual", icon: nav.icons.virtual, activeIcon: nav.activeKeys?.virtual },
]);
</script>
