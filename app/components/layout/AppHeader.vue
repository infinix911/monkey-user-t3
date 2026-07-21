<template>
  <header class="fixed top-0 left-0 right-0 z-50 w-full min-[690px]:h-[83px]">
    <!-- Desktop Layout (>=690px) — the full-width bar is transparent over the
         hero (fades to the sticky background colour once scrolled); the themed
         gradient is applied to the centred 1152px content row only. -->
    <div class="hidden min-[690px]:block relative h-full transition-colors duration-300"
      :style="{ backgroundColor: isScrolled ? siteConfig.theme.nav.stickyBg : 'transparent' }">
      <div class="pr-1.5 relative flex items-end justify-between max-w-[1152px] mx-auto h-full pb-2.5"
        :style="{ background: isScrolled ? 'transparent' : siteConfig.theme.nav.headerBgGradient }">
        <!-- Left: Logo (hidden while the notice modal is open) -->
        <div v-show="!uiStore.showNoticeModal" class="flex items-end gap-2">
          <NuxtLink to="/" class="flex items-center justify-center flex-shrink-0">
            <NuxtImg :src="siteConfig.identity.logo" :alt="siteConfig.identity.siteName"
              class="h-auto w-auto cursor-pointer object-contain flex-shrink-0 ml-2"
              :style="siteConfig.theme.logoStyles.desktopHeader" />
          </NuxtLink>
        </div>

        <!-- Right: Language + Auth buttons / User profile -->
        <div v-show="!uiStore.showNoticeModal" class="font-medium flex items-center gap-1 relative">
          <template v-if="!isAuthenticated">
            <!-- Login + Sign up buttons grouped -->
            <div class="flex items-center gap-1">
              <!-- Login: gold gradient border + gold gradient text -->
              <button
                class="cursor-pointer h-[37px] w-[125px] px-3 rounded-[4px] flex items-center justify-center font-extrabold italic uppercase text-[15px] tracking-tight transition-transform hover:scale-[1.03]"
                :style="{ background: siteConfig.theme.authButton.loginBg, border: siteConfig.theme.authButton.loginBorder, boxShadow: '0 5px 5px rgba(0,0,0,0.25)' }"
                @click="showLoginModal">
                <span class="block w-full text-center truncate"
                  :style="{ background: siteConfig.theme.authButton.loginTextGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }">{{
                    $t('header.login') }}</span>
              </button>
              <!-- Sign up: blue gradient border + white text -->
              <button
                class="cursor-pointer h-[37px] w-[125px] px-3 rounded-[4px] flex items-center justify-center font-extrabold italic uppercase text-[15px] tracking-tight text-white transition-transform hover:scale-[1.03]"
                :style="{ background: siteConfig.theme.authButton.signupBg, border: '1.5px solid transparent', boxShadow: '0 5px 5px rgba(0,0,0,0.25)' }"
                @click="showSignupModal">
                <span class="block w-full text-center truncate">{{ $t('header.signUp') }}</span>
              </button>
            </div>
            <!-- Language selector -->
            <div data-lang-selector class="mx-2">
              <div class="relative">
                <button
                  class="inline-flex justify-center items-center gap-1 px-1 h-[30px] xl:h-[30px] rounded-[7px] text-white/90 cursor-pointer hover:opacity-90 transition-opacity"
                  :style="{ backgroundColor: siteConfig.theme.ui.langSelectorBg }" @click="toggleLangDropdown">
                  <LanguageFlag :code="locale as LangCode" class="w-6 h-5 rounded-[5px] overflow-hidden" />
                  <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div v-if="showLangDropdown"
                  class="absolute right-0 top-full mt-1 z-50 rounded-[7px] overflow-hidden shadow-lg w-max min-w-max"
                  :style="{ backgroundColor: siteConfig.theme.ui.langSelectorBg }">
                  <button v-for="lang in languages" :key="lang.code"
                    class="flex items-center gap-2 px-3 py-2 w-full text-left text-white/90 hover:bg-[#333] transition-colors cursor-pointer text-sm"
                    @click="selectLanguage(lang.code)">
                    <LanguageFlag :code="lang.code" class="w-6 h-[18px] rounded-[3px] overflow-hidden" />
                    <span class="whitespace-nowrap">{{ lang.name }}</span>
                  </button>
                </div>
              </div>
            </div>
            <!-- Hamburger menu omitted for guests (login/sign-up only). -->
          </template>
          <!-- Authenticated: Wallet box + Notification + Language -->
          <template v-else>
            <!-- User info — homepage pill:
                 white username, blue balance, no background. -->
            <UserBalancePill layout="inline" coin-class="w-5.5 h-5.5 xl:w-6.5 xl:h-6.5" username-class="text-[17px]"
              symbol-class="text-[17px]" amount-class="text-[17px]"
              pill-class="flex items-center h-[37px] px-4 rounded-full bg-black/45 backdrop-blur-sm shadow-[0_2px_6px_rgba(0,0,0,0.35)]" />
            <div class="flex items-center gap-3 ml-3 mr-1">
              <!-- Point conversion — opens the point-to-balance modal. -->
              <button type="button" :aria-label="$t('point.title')"
                class="flex items-center gap-1.5 h-[37px] pl-1.5 pr-3 rounded-full bg-black/45 backdrop-blur-sm shadow-[0_2px_6px_rgba(0,0,0,0.35)] cursor-pointer transition-transform hover:scale-[1.03]"
                @click="uiStore.setShowPointModal(true)">
                <span class="w-6 h-6 xl:w-6.5 xl:h-6.5 rounded-full flex items-center justify-center shrink-0"
                  :style="{ background: siteConfig.theme.brandColor }">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2.2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-9L21 7.5m0 0L16.5 3m4.5 4.5H7.5" />
                  </svg>
                </span>
                <span class="text-white font-bold text-[17px] tabular-nums leading-none">{{
                  currency.formatNumber(authStore.user.point_wallet) }}</span>
                <span class="text-white/55 text-[13px] font-semibold leading-none">P</span>
              </button>
              <!-- Partner — links straight to the partner dashboard (no dropdown). -->
              <NuxtLink to="/partner-dashboard" :aria-label="$t('header.partner')"
                class="flex items-center gap-1.5 h-[37px] pl-1.5 pr-3 rounded-full bg-black/45 backdrop-blur-sm shadow-[0_2px_6px_rgba(0,0,0,0.35)] cursor-pointer transition-transform hover:scale-[1.03]">
                <span class="w-6 h-6 xl:w-6.5 xl:h-6.5 rounded-full flex items-center justify-center shrink-0"
                  :style="{ background: siteConfig.theme.brandColor }">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5 text-black" fill="none" viewBox="0 0 24 24"
                    stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round"
                      d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
                  </svg>
                </span>
                <span class="text-white font-bold text-[15px] uppercase tracking-tight leading-none">{{
                  $t('header.partner') }}</span>
              </NuxtLink>
              <div class="relative flex items-center">
                <NotificationDropdown :notifications="notifications" @marked-all-read="markNotificationsRead">
                  <div class="relative cursor-pointer" aria-haspopup="dialog">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                      class="w-6 h-6 text-white">
                      <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                      <path
                        d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
                    </svg>
                    <div v-if="unreadNotificationCount > 0"
                      class="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-xs font-bold">{{
                        unreadNotificationCount > 99
                          ? "99+"
                          : unreadNotificationCount
                      }}</span>
                    </div>
                  </div>
                </NotificationDropdown>
              </div>
              <div class="relative" data-lang-selector>
                <button
                  class="inline-flex justify-center items-center gap-1 px-1 h-[30px] xl:h-[30px] rounded-[7px] text-white/90 cursor-pointer hover:opacity-90 transition-opacity"
                  :style="{ backgroundColor: siteConfig.theme.ui.langSelectorBg }" @click="toggleLangDropdown">
                  <LanguageFlag :code="locale as LangCode" class="w-6 h-5 rounded-[5px] overflow-hidden" />
                  <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div v-if="showLangDropdown"
                  class="absolute right-0 top-full mt-1 z-50 rounded-[7px] overflow-hidden shadow-lg w-max min-w-max"
                  :style="{ backgroundColor: siteConfig.theme.ui.langSelectorBg }">
                  <button v-for="lang in languages" :key="lang.code"
                    class="flex items-center gap-2 px-3 py-2 w-full text-left text-white/90 hover:bg-[#333] transition-colors cursor-pointer text-sm"
                    @click="selectLanguage(lang.code)">
                    <LanguageFlag :code="lang.code" class="w-6 h-[18px] rounded-[3px] overflow-hidden" />
                    <span class="whitespace-nowrap">{{ lang.name }}</span>
                  </button>
                </div>
              </div>
            </div>
            <!-- Hamburger menu (far right) — hidden on the iPad-mini range
                 (690-1023px) once authenticated; reachable via the bottom nav. -->
            <button v-show="!uiStore.showNoticeModal"
              class="hidden lg:flex items-center justify-center transition-opacity hover:opacity-90 cursor-pointer ml-1"
              :aria-label="$t('header.menu')" data-hamburger-menu="true" @click="openProfileModal">
              <svg viewBox="0 0 49 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"
                focusable="false" class="w-[47px] h-[33px]">
                <path
                  d="M0 33.5V27.9167H48.7721V33.5H0ZM0 19.5417V13.9583H48.7721V19.5417H0ZM0 5.58333V0H48.7721V5.58333H0Z"
                  fill="white" />
              </svg>
            </button>
          </template>
        </div>
      </div>
    </div>

    <!-- Mobile Layout (< lg) — also used on tablet/iPad portrait. -->
    <!-- Height + scale come from CSS vars set pre-paint by app.vue's inline
         script, so the SSR header is sized correctly with no hydration flash. -->
    <div class="min-[690px]:hidden overflow-hidden md:pt-2 md:pb-0.5 pt-0 pb-0"
      :style="{ height: 'var(--mh-header-height, 60px)', backgroundColor: siteConfig.theme.nav.stickyBg }">
      <div class="w-full h-full flex items-end justify-between relative px-1 transition-colors duration-300"
        :style="{ backgroundColor: siteConfig.theme.nav.stickyBg }">
        <div class="flex items-center gap-2">
          <button v-show="!uiStore.showNoticeModal" data-hamburger-menu="true" :aria-label="$t('header.menu')"
            class="hidden cursor-pointer" @click="openProfileModal">
            <svg viewBox="0 0 49 34" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false"
              class="w-[40px] h-auto">
              <path
                d="M0 33.5V27.9167H48.7721V33.5H0ZM0 19.5417V13.9583H48.7721V19.5417H0ZM0 5.58333V0H48.7721V5.58333H0Z"
                fill="white" />
            </svg>
          </button>
          <NuxtLink v-show="!uiStore.showNoticeModal" to="/" class="flex items-center">
            <NuxtImg :src="siteConfig.identity.logoMobile || siteConfig.identity.logo"
              :alt="siteConfig.identity.siteName" class="w-auto max-w-[210px] object-contain ml-1"
              :style="siteConfig.theme.logoStyles.mobileHeader" />
          </NuxtLink>
        </div>
        <!-- Mobile guest live-chat button — replaces the login/sign-up buttons.
             Styled like the MASUK (login) button; opens the configured chat. -->
        <div v-if="!isAuthenticated" v-show="!uiStore.showNoticeModal" class="flex items-center self-center pr-1">
          <button type="button" :aria-label="$t('common.liveChat')"
            class="cursor-pointer h-[34px] px-3 rounded-[4px] flex items-center justify-center font-extrabold italic uppercase text-[13px] tracking-tight transition-transform hover:scale-[1.03]"
            :style="{ background: siteConfig.theme.authButton.loginBg, border: siteConfig.theme.authButton.loginBorder, boxShadow: '0 5px 5px rgba(0,0,0,0.25)' }"
            @click="openLiveChat">
            <span class="block w-full text-center whitespace-nowrap"
              :style="{ background: siteConfig.theme.authButton.loginTextGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }">{{
                $t('common.liveChat') }}</span>
          </button>
        </div>
        <div v-if="isAuthenticated" v-show="!uiStore.showNoticeModal"
          class="flex items-center gap-2 relative self-center pr-1">
          <!-- User info — lucky-style pill: level-matching stone badge, yellow
               username above currency + green balance on a dark rounded card.
               The header height is fixed (63px), so the pill scales smoothly with
               viewport width via clamp(min, vw, max) — consistent proportions on
               every phone width, bounded so it never gets too big/small. -->
          <div class="rounded-[10px] pl-2 pr-3.5 flex flex-nowrap items-center gap-0.5 whitespace-nowrap min-w-[100px]"
            :style="[pillBgStyle, { height: '41px' }]">
            <NuxtImg :src="levelStoneSrc" :alt="authStore.user.level_name || 'level'" width="60" height="60"
              class="w-[clamp(28px,6.9vw,30px)] h-[clamp(28px,6.5vw,30px)] object-contain shrink-0" />
            <div class="flex flex-col justify-center items-start gap-px whitespace-nowrap min-w-[85px]">
              <span class="uppercase whitespace-nowrap leading-none text-left"
                :style="[markMediumStyle, { color: siteConfig.theme.brandColor }]">{{ authStore.user.username }}</span>
              <span class="flex flex-nowrap items-baseline justify-start gap-1.5 whitespace-nowrap -mt-0.4">
                <span class="text-white whitespace-nowrap leading-none" :style="markMediumStyle">{{
                  walletSymbol }}</span>
                <span class="text-[#22c55e] whitespace-nowrap leading-none" :style="markBoldStyle">{{
                  currency.formatNumber(authStore.user.wallet) }}</span>
              </span>
            </div>
          </div>
          <!-- Point conversion + partner links are desktop-only — on mobile the
               header stays compact (partner nav lives in the in-page sidebar). -->
          <div class="contents">
            <!-- Notification bell — hidden on the mobile header. -->
            <div class="absolute top-[-25px] right-2 z-10 hidden">
              <NotificationDropdown :notifications="notifications" @marked-all-read="markNotificationsRead">
                <div class="relative cursor-pointer" aria-haspopup="dialog">
                  <svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"
                    class="w-7 h-7 text-white">
                    <path d="M10.268 21a2 2 0 0 0 3.464 0" />
                    <path
                      d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" />
                  </svg>
                  <div v-if="unreadNotificationCount > 0"
                    class="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full flex items-center justify-center">
                    <span class="text-white text-xs font-bold">{{
                      unreadNotificationCount > 99 ? "99+" : unreadNotificationCount
                    }}</span>
                  </div>
                </div>
              </NotificationDropdown>
            </div>
            <!-- Language selector — hidden on the mobile header. -->
            <div class="relative mx-2 hidden" data-lang-selector>
              <button ref="mobileLangBtnRef"
                class="inline-flex justify-center items-center gap-1 px-1.5 h-[40px] rounded-[8px] bg-[#262626] text-white/90 cursor-pointer hover:opacity-90 transition-opacity"
                @click="toggleMobileLangDropdown">
                <LanguageFlag :code="locale as LangCode" class="w-8 h-6 rounded-[5px] overflow-hidden" />
                <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <!-- Mobile dropdown is teleported to body so it escapes the
                   mobile header's overflow-hidden clipping. Positioned via
                   button getBoundingClientRect() in toggleMobileLangDropdown. -->
              <Teleport v-if="showLangDropdown" to="body">
                <!-- Teleported to body, so the parent's `lg:hidden` no longer
                     hides it on desktop — carry our own `lg:hidden` so this
                     mobile dropdown never double-renders alongside the desktop
                     one (they share the `showLangDropdown` state). -->
                <div data-lang-selector
                  class="fixed z-[9999] min-[690px]:hidden bg-[#1a1a1a] border border-white/15 rounded-[10px] overflow-hidden shadow-2xl min-w-[180px]"
                  :style="{ top: mobileLangDropdownPos.top + 'px', right: mobileLangDropdownPos.right + 'px' }">
                  <button v-for="lang in languages" :key="lang.code"
                    class="flex items-center gap-3 px-4 py-3 w-full text-left text-white font-semibold hover:bg-[#333] transition-colors cursor-pointer text-base"
                    @click="selectLanguage(lang.code)">
                    <LanguageFlag :code="lang.code" class="w-8 h-6 rounded-[4px] overflow-hidden shrink-0" />
                    <span class="whitespace-nowrap">{{ lang.name }}</span>
                  </button>
                </div>
              </Teleport>
            </div>
          </div>
        </div>
      </div>
    </div>
  </header>

  <!-- Auth Modals — gated by v-if so the async chunk is only fetched the
       first time the modal is opened. -->
  <LoginModal v-if="loginModalMounted" :is-open="uiStore.showLoginModal" @close="handleCloseLoginModal"
    @signup-click="handleSignupClick" />

  <SignupModal v-if="signupModalMounted" :is-open="uiStore.showSignupModal" @close="handleCloseSignupModal" />

  <NewProfileModal v-if="uiStore.showProfileModal" :is-open="uiStore.showProfileModal"
    :position="profileModalMobile ? 'bottom' : 'top'" @close="uiStore.setShowProfileModal(false)" />

  <PointConversionModal v-if="uiStore.showPointModal" :is-open="uiStore.showPointModal"
    @close="uiStore.setShowPointModal(false)" />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { formatWallet } from "@/utils/currency";
import { useApi } from "@/composables/useApi";
import { validateResponse } from "@/lib/validateResponse";
import {
  notificationsResponseSchema,
  mapNotification,
  type NotificationItem,
} from "@/interfaces/notification.interface";

const authStore = useAuthStore();
const uiStore = useUiStore();

// The user-info pill (UserBalancePill) now owns currency/symbol formatting.
const LoginModal = defineAsyncComponent(
  () => import("@/components/auth/LoginModal.vue"),
);
const SignupModal = defineAsyncComponent(
  () => import("@/components/auth/SignupModal.vue"),
);
const NotificationDropdown = defineAsyncComponent(
  () => import("@/components/notification/NotificationDropdown.vue"),
);
const PointConversionModal = defineAsyncComponent(
  () => import("@/components/transaction/PointConversionModal.vue"),
);
const NewProfileModal = defineAsyncComponent(
  () => import("@/components/profile/NewProfileModal.vue"),
);

// Latch: mount each auth modal on first open and keep it mounted so its
// <Transition> leave animation can run on close (a bare v-if would unmount
// synchronously and skip the close animation). The async chunk is still only
// fetched the first time the modal opens.
const loginModalMounted = ref(false);
const signupModalMounted = ref(false);
watch(
  () => uiStore.showLoginModal,
  (open) => {
    if (open) loginModalMounted.value = true;
  },
);
watch(
  () => uiStore.showSignupModal,
  (open) => {
    if (open) signupModalMounted.value = true;
  },
);

const siteConfig = useSiteConfig();
const { locale, setLocale } = useI18n();

// Mobile authenticated pill (lucky-style): currency formatting + the user's
// level-matching stone badge. Mirrors UserBalancePill.vue.
const currency = useCurrency();
const walletSymbol = computed(() => {
  const s = currency.symbolFor(authStore.user.currency);
  return s === "Rp" ? "IDR" : s;
});
const levelStoneSrc = useLevelStone();
// Mobile pill text: username + currency symbol render in Mark Medium, the
// balance amount in Mark Bold. They share the same size so the IDR symbol and
// the amount stay the same height (only weight/colour differ).
const markMediumStyle =
  "font-family: var(--font-mark); font-size: clamp(12px,3.2vw,14px); font-weight: 500; letter-spacing: 0.04em;";
const markBoldStyle =
  "font-family: var(--font-mark); font-size: clamp(13px,3.6vw,15px); font-weight: 700; letter-spacing: 0.04em;";
// Solid dark gray pill background matching the reference.
const pillBgStyle = "background: #2b2d33;";

// Open the live chat in a new tab using the `site:livechat` link configured in
// the admin CMS (read from the site store, pre-fetched in app.vue so it's
// available synchronously here — window.open must run inside the click to
// avoid pop-up blockers).
const siteStore = useSiteStore();
const openLiveChat = () => {
  const url = siteStore.siteSettings?.["site:livechat"];
  if (!url) {
    console.log("[header] live chat link (site:livechat) not configured");
    return;
  }
  window.open(url, "_blank", "noopener,noreferrer");
};

// Mobile scaling — the scale factor itself lives in the `--mh-scale` CSS var
// (set pre-paint by app.vue's inline script). `isMobile` is still needed by
// the template (modal positioning).
const isMobile = ref(false);
// The profile modal uses its mobile (full-screen "bottom") layout for the
// whole tablet range too — anything below lg (1024px), which includes iPad
// mini — and only switches to the desktop sliding panel at lg+.
const profileModalMobile = ref(false);

// Desktop header is transparent over the hero, then fades to the sticky
// background colour once the user scrolls past the top of the page.
const isScrolled = ref(false);
const updateScrolled = () => {
  isScrolled.value = window.scrollY > 8;
};

const openProfileModal = () => {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  uiStore.setShowProfileModal(true);
};

const updateMobileScale = () => {
  // The header switches to its desktop design at >=690px; below that it's a
  // fixed-height mobile bar (no viewport scaling). `isMobile` still drives
  // modal positioning; --mh-scale stays 1 (the mobile header no longer scales).
  isMobile.value = window.innerWidth < 690;
  profileModalMobile.value = window.innerWidth < 1024;
  document.documentElement.style.setProperty("--mh-scale", "1");
};

onMounted(() => {
  updateMobileScale();
  updateScrolled();
  window.addEventListener("resize", updateMobileScale);
  window.addEventListener("scroll", updateScrolled, { passive: true });
  document.addEventListener("click", handleClickOutside);
  fetchNotifications();
});

watch(
  () => authStore.isAuthenticated,
  (isAuth) => {
    if (isAuth) fetchNotifications();
    else notifications.value = [];
  },
);

watch(locale, () => {
  if (authStore.isAuthenticated) fetchNotifications();
});

onUnmounted(() => {
  window.removeEventListener("resize", updateMobileScale);
  window.removeEventListener("scroll", updateScrolled);
  document.removeEventListener("click", handleClickOutside);
});

// Computed
const isAuthenticated = computed(() => authStore.isAuthenticated);

const notifications = ref<NotificationItem[]>([]);
const unreadNotificationCount = computed(
  () => notifications.value.filter((n) => !n.is_read).length,
);

const showLangDropdown = ref(false);

// Mobile dropdown lives in the same toggle state but is teleported to body,
// so we compute its viewport position from the button on each open. The
// mobile header sits in an `overflow-hidden` container with a CSS scale
// transform; absolute positioning inside that container gets clipped, so
// fixed positioning + Teleport is the cleanest escape.
const mobileLangBtnRef = ref<HTMLButtonElement | null>(null);
const mobileLangDropdownPos = ref({ top: 0, right: 0 });
const toggleMobileLangDropdown = () => {
  if (!showLangDropdown.value && mobileLangBtnRef.value) {
    const rect = mobileLangBtnRef.value.getBoundingClientRect();
    mobileLangDropdownPos.value = {
      top: rect.bottom + 8,
      right: window.innerWidth - rect.right,
    };
  }
  showLangDropdown.value = !showLangDropdown.value;
};

const fetchNotifications = async () => {
  if (!authStore.isAuthenticated) return;
  try {
    const api = useApi();
    const raw = await api("/notifications", { query: { lang: locale.value } });
    notifications.value = validateResponse(
      notificationsResponseSchema,
      raw,
      "/notifications",
    ).map(mapNotification);
  } catch {
    notifications.value = [];
  }
};

const markNotificationsRead = () => {
  notifications.value = notifications.value.map((notification) => ({
    ...notification,
    is_read: true,
  }));
};

type LangCode = "en" | "ko";

const languages: Array<{ code: LangCode; name: string }> = [
  { code: "en", name: "English" },
  { code: "ko", name: "한국어" },
];

// Methods
const toggleLangDropdown = () => {
  showLangDropdown.value = !showLangDropdown.value;
};

// Persist a manual language choice. With `strategy: "no_prefix"` the locale is
// not in the URL, so the choice is stored in the `ui_locale` cookie — app.vue
// reads it on every load and lets it override the currency-derived default.
// See PLAN-PAGE-LOADS-TWICE.md.
const uiLocaleCookie = useCookie<string | null>("ui_locale", {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  path: "/",
});

const selectLanguage = (code: string) => {
  uiLocaleCookie.value = code;
  setLocale(code as LangCode);
  showLangDropdown.value = false;
};

// Close dropdown when clicking outside
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as Element;
  if (!target.closest("[data-lang-selector]")) {
    showLangDropdown.value = false;
  }
};

const showLoginModal = () => {
  uiStore.setShowLoginModal(true);
};

const showSignupModal = () => {
  uiStore.setShowSignupModal(true);
};

const handleCloseLoginModal = () => {
  uiStore.setShowLoginModal(false);
};

const handleCloseSignupModal = () => {
  uiStore.setShowSignupModal(false);
};

const handleSignupClick = () => {
  uiStore.setShowSignupModal(true);
};

const _formatCurrency = formatWallet;
</script>
