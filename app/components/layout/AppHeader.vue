<template>
  <header class="fixed top-0 left-0 right-0 z-50 w-full min-[690px]:h-[83px]">
    <!-- Desktop Layout (>=690px) — the full-width bar is transparent over the
         hero (fades to the sticky background colour once scrolled); the themed
         gradient is applied to the centred content row only (1152px below lg,
         the 1456px shell width from lg up). -->
    <div class="hidden min-[690px]:block relative h-full transition-colors duration-300"
      :style="{ backgroundColor: isScrolled ? siteConfig.theme.nav.stickyBg : 'transparent' }">
      <!-- max-w matches the two-column wrapper in layouts/default.vue, so the
           logo lands above the left rail and the user controls over the content
           column. Keep the two in step if either width changes. -->
      <!-- No background of its own: at the top the header floats over the hero,
           and once scrolled the wrapper above supplies `nav.stickyBg`. The row
           used to paint `nav.headerBgGradient` in the unscrolled state, which is
           exactly the state that must now be transparent. -->
      <!-- `lg:gap-7` mirrors the two-column wrapper in layouts/default.vue: the
           rail column there is `lg:px-2` + `lg:w-[210px]` + `lg:gap-7`, so
           without the same 28px gap here the account bar starts left of the
           content column it is supposed to sit above. Keep all four values —
           max-width, gutter, logo/rail width and gap — in step with that
           wrapper. -->
      <div
        class="pr-1.5 relative flex items-end justify-between max-w-[1152px] lg:max-w-[1456px] lg:px-2 lg:gap-7 mx-auto h-full pb-2.5">
        <!-- Left: Logo (hidden while the notice modal is open). Its lg width is
             the rail's, so the logo sits over the rail and everything after it
             starts at the content column's left edge. -->
        <div v-show="!uiStore.showNoticeModal" class="flex items-end gap-2 lg:w-[210px] lg:flex-shrink-0 lg:ps-2">
          <!-- `external`: a real document load, not a client-side route change,
               so clicking the logo reloads the app on the home page. -->
          <NuxtLink to="/" external class="flex items-center justify-center flex-shrink-0 lg:w-full">
            <!-- From `lg` the rail's width is the logo's limit: the config style
                 caps it at 282px, wider than the 215px column, and `flex-shrink-0`
                 means it would otherwise overflow across the account bar. `w-full`
                 binds it to the column (max-height still clamps tall marks), so
                 there is no second width to keep in sync with the layout. -->
            <!-- A PLAIN `<img>`, deliberately not `<NuxtImg>`: the logo is a
                 CMS-swappable asset, and the image pipeline serves it through a
                 derived, separately-cached URL, so a rebrand kept showing the
                 old mark until that cache turned over. A direct request to the
                 configured path is the one thing that always reflects what the
                 CMS is pointing at now. -->
            <img :src="siteConfig.identity.logo" :alt="siteConfig.identity.siteName"
              class="h-auto w-auto cursor-pointer object-contain flex-shrink-0 ml-2 lg:ml-0 lg:w-full"
              :style="siteConfig.theme.logoStyles.desktopHeader">
          </NuxtLink>
        </div>

        <!-- Content column: the account bar sits at its leading edge and the
             auth/language/menu controls at its trailing edge, so the header
             lines up with the two columns beneath it. -->
        <div v-show="!uiStore.showNoticeModal"
          class="font-medium flex flex-1 min-w-0 items-center justify-between gap-3 relative">
          <template v-if="!isAuthenticated">
            <!-- Guests have no account bar; the spacer holds the leading edge so
                 the buttons stay pinned to the trailing one. -->
            <span aria-hidden="true" />
            <!-- Login + Sign up buttons grouped -->
            <div class="flex items-center gap-1">
              <!-- Login: gold gradient border + gold gradient text -->
              <button
                class="cursor-pointer h-[35px] w-[113px] px-3 rounded-[8px] flex items-center justify-center font-extrabold italic uppercase text-[15px] tracking-tight transition-transform hover:scale-[1.03]"
                :style="authButtonStyle.login"
                @click="showLoginModal">
                <span class="block w-full text-center truncate"
                  :style="{ background: siteConfig.theme.authButton.loginTextGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }">{{
                    $t('header.login') }}</span>
              </button>
              <!-- Sign up: blue gradient border + white text -->
              <button
                class="cursor-pointer h-[35px] w-[113px] px-3 rounded-[8px] flex items-center justify-center font-extrabold italic uppercase text-[15px] tracking-tight text-white transition-transform hover:scale-[1.03]"
                :style="authButtonStyle.signup"
                @click="showSignupModal">
                <span class="block w-full text-center truncate">{{ $t('header.signUp') }}</span>
              </button>
              <!-- Language selector -->
              <div data-lang-selector class="ms-2">
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
            </div>
            <!-- Hamburger menu omitted for guests (login/sign-up only). -->
          </template>
          <!-- Authenticated: Wallet box + Notification + Language -->
          <template v-else>
            <!-- Account bar — identity, balances and the three actions in ONE
                 flat surface, per the reference: no dividers, no per-part
                 backgrounds, a single #262626 rounded bar. Order is
                 username · wallet · points · swap · refresh · bell. -->
            <!-- 10px on all four corners — the same radius the announcement
                 bar in layouts/default.vue uses on its top corners. -->
            <!-- Sized down as one system so the bar reads at the same weight as
                 the announcement bar directly beneath it: 37→32px tall, 17→15px
                 figures, 14→13px suffixes, 20→18px icons. Change these together —
                 shrinking the type alone just leaves the bar looking padded.
                 The three ACTION icons (swap · refresh · bell) are the one
                 exception at 24px: the reference render inks them at 16px
                 (refresh) and ~19.7px (bell), which is a 24px box against the
                 72x72 source canvases they are `object-contain`ed into. The
                 wallet/point icons stay 18px — the reference inks that coin at
                 17px, so they already match.

                 SPACING is measured off that same render, which segments into
                 identity · wallet · point · actions with ~38-40px between the
                 groups (ms-10) and ~17px of bar padding (px-4). Ink-to-ink the
                 gaps read 47/40/41px, but the first is inflated by 님 being a
                 full-width hangul glyph whose advance runs past its ink, and the
                 last by the swap art's 3px of internal padding — so the groups
                 are spaced uniformly rather than to those raw numbers. Within a
                 group the gaps are small (gap-1 / gap-1.5) and already match.

                 WIDTH follows the content: `w-fit` sizes the bar to exactly what
                 it holds, so it never carries empty space. It was previously a
                 45% share of the content column, which on most viewports left a
                 stretch of bare #262626 between the point balance and the action
                 icons. `min-w-fit` stays as the floor — the flex row must not
                 squeeze the bar, so a long username or a ten-digit balance
                 widens it instead of overflowing. -->
            <!-- `hidden lg:flex`: from 690px up the header switches to its
                 desktop design, but this bar only has room from `lg`. On a
                 tablet (iPad mini at 768px portrait) it was squeezed into the
                 narrow content column and read as crowded, so below `lg` the
                 values move to MobileUserBar under the header instead — which
                 is why that component is `lg:hidden` rather than
                 `min-[690px]:hidden`. Keep the two breakpoints in step: exactly
                 one of them must render at any width. -->
            <div
              class="hidden lg:flex items-center h-[32px] px-4 w-fit min-w-fit rounded-[10px] bg-[#262626] whitespace-nowrap">
              <!-- Identity. `honorific` is the Korean "님" suffix; it is an empty
                   string in locales that have no equivalent, hence the guard. -->
              <span class="flex items-baseline gap-1">
                <span class="font-bold text-[15px] uppercase leading-none"
                  :style="{ color: ACCOUNT_BAR_COLORS.username }">{{ authStore.user.username }}</span>
                <span v-if="honorific" class="text-white text-[13px] leading-none">{{ honorific }}</span>
              </span>

              <!-- Wallet balance -->
              <span class="flex items-center gap-1.5 ms-10">
                <NuxtImg :src="siteConfig.assets.navIcons.walletIcon" alt="" aria-hidden="true" width="18" height="18"
                  class="w-[18px] h-[18px] object-contain shrink-0" />
                <span class="font-bold text-[15px] tabular-nums leading-none"
                  :style="{ color: ACCOUNT_BAR_COLORS.wallet }">{{
                    currency.formatNumber(authStore.user.wallet) }}</span>
              </span>

              <!-- Point balance — the figure IS the conversion control. There is
                   no separate transfer affordance in the header: the swap arrow
                   read as decoration and a labelled button beside it was a third
                   competing button, so clicking the amount opens the modal. -->
              <button type="button" class="flex items-center gap-1.5 ms-10 cursor-pointer hover:opacity-80 transition-opacity"
                :aria-label="$t('point.title')" @click="openPointModal">
                <NuxtImg :src="siteConfig.assets.navIcons.pointIcon" alt="" aria-hidden="true" width="18" height="18"
                  class="w-[18px] h-[18px] object-contain shrink-0" />
                <span class="font-bold text-[15px] tabular-nums leading-none"
                  :style="{ color: ACCOUNT_BAR_COLORS.point }">{{
                    currency.formatNumber(authStore.user.point_wallet) }}</span>
              </button>

              <!-- Actions — refresh + bell only; the conversion control now
                   sits beside the point figure above. The bar is content-width,
                   so there is no slack to absorb and no spacer here: `ms-10` is
                   the real gap, matching the spacing between the other groups. -->
              <div class="flex items-center gap-2.5 ms-10">
                <!-- Wallet reload. The art ships in #434343, so it is tinted to
                     white here rather than shipping a second copy of the file. -->
                <button type="button" :aria-label="$t('common.refreshBalance')" :disabled="isRefreshingWallet"
                  class="shrink-0 cursor-pointer opacity-90 hover:opacity-100 transition-opacity disabled:opacity-60"
                  :class="{ 'spin-once': isRefreshingWallet }" @click="refreshWallet">
                  <NuxtImg :src="siteConfig.assets.navIcons.refreshIcon" alt="" aria-hidden="true" width="24"
                    height="24" class="account-bar-icon-light w-[24px] h-[24px] object-contain" />
                </button>
                <NotificationDropdown :notifications="notifications" @marked-all-read="markNotificationsRead">
                  <div class="relative cursor-pointer opacity-90 hover:opacity-100 transition-opacity"
                    aria-haspopup="dialog">
                    <NuxtImg :src="siteConfig.assets.navIcons.bellIcon" alt="" aria-hidden="true" width="24" height="24"
                      class="w-[24px] h-[24px] object-contain" />
                    <div v-if="unreadNotificationCount > 0"
                      class="absolute -top-1.5 -right-1.5 min-w-4 h-4 px-1 bg-red-500 rounded-full flex items-center justify-center">
                      <span class="text-white text-[10px] font-bold leading-none">{{
                        unreadNotificationCount > 99
                          ? "99+"
                          : unreadNotificationCount
                      }}</span>
                    </div>
                  </div>
                </NotificationDropdown>
              </div>
            </div>

            <!-- Trailing controls. `ms-auto` rather than relying on the row's
                 `justify-between`: below `lg` the account bar beside this is
                 hidden, and with a single child `justify-between` would park
                 these at the LEADING edge. The auto margin pins them right at
                 every width. -->
            <div class="flex items-center gap-1 flex-shrink-0 ms-auto">
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
              <!-- Logout — the LOGIN button's twin: same gold gradient border
                   and gold gradient text, same 35x113 box the guest
                   login/sign-up pair uses, so the header's primary action looks
                   and measures identical signed in and signed out. (It used the
                   language selector's flat background before, which read as a
                   muted tertiary control.) The icon is dropped rather than
                   recoloured: the gradient is painted through
                   `color: transparent` + background-clip, which would erase a
                   `currentColor` glyph. Matches the mobile header's logout.
                   `authStore.logout()` already posts /auth/logout, clears state
                   and returns home. -->
              <button type="button" :aria-label="$t('auth.logout')"
                class="cursor-pointer h-[35px] w-[113px] px-3 rounded-[8px] flex items-center justify-center font-extrabold italic uppercase text-[15px] tracking-tight transition-transform hover:scale-[1.03]"
                :style="authButtonStyle.login" @click="handleLogout">
                <span class="block w-full text-center truncate"
                  :style="{ background: siteConfig.theme.authButton.loginTextGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }">{{
                    $t('auth.logout') }}</span>
              </button>
              <!-- No desktop menu trigger: from `lg` the left rail carries the
                 profile menu, so NewProfileModal is a mobile-only surface. -->
            </div>
          </template>
        </div>
      </div>
    </div>

    <!-- Mobile Layout (< lg) — also used on tablet/iPad portrait. -->
    <!-- Height + scale come from CSS vars set pre-paint by app.vue's inline
         script, so the SSR header is sized correctly with no hydration flash. -->
    <div class="min-[690px]:hidden overflow-hidden md:pt-2 md:pb-0.5 pt-0 pb-0"
      :style="{ height: 'var(--mh-header-height, 60px)', backgroundColor: siteConfig.theme.nav.stickyBg }">
      <!-- ONE scaled container for the logo AND the buttons: the row is laid
           out at MOBILE_HEADER_DESIGN_WIDTH and scaled down to the viewport, so
           the pair keeps its proportions and its gap at every width instead of
           the logo running under the buttons on a 390px iPhone 12 or a 375px
           SE. See `.mh-scale-row` below for how the width/height are
           pre-divided so the scaled result still fills the bar exactly. -->
      <div class="mh-scale-row flex items-end justify-between relative px-1 transition-colors duration-300"
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
          <!-- `external`: full document load, same as the desktop logo above. -->
          <NuxtLink v-show="!uiStore.showNoticeModal" to="/" external class="flex items-center">
            <!-- Plain <img>, not <NuxtImg>: CMS-swappable logo, see AppHeader.vue -->
            <img :src="siteConfig.identity.logoMobile || siteConfig.identity.logo"
              :alt="siteConfig.identity.siteName" class="w-auto max-w-[210px] object-contain ml-1"
              :style="siteConfig.theme.logoStyles.mobileHeader"
            >
          </NuxtLink>
        </div>
        <!-- Mobile guest auth buttons — these used to live in a black strip
             below the announcement bar (layouts/default.vue); they now sit in
             the header itself, so the strip there is gone. Same gold/blue
             gradient treatment as the desktop pair, sized down (34px tall,
             13px type) to fit the 60px mobile bar beside the logo. -->
        <div v-if="!isAuthenticated" v-show="!uiStore.showNoticeModal"
          class="flex items-center gap-1.5 self-center pr-1 flex-shrink-0">
          <!-- Login: gold gradient border + gold gradient text -->
          <button type="button"
            class="cursor-pointer h-[34px] w-[86px] px-2 rounded-[8px] flex items-center justify-center font-extrabold italic uppercase text-[13px] tracking-tight transition-transform hover:scale-[1.03]"
            :style="authButtonStyle.login"
            @click="showLoginModal">
            <span class="block w-full text-center truncate"
              :style="{ background: siteConfig.theme.authButton.loginTextGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }">{{
                $t('header.login') }}</span>
          </button>
          <!-- Sign up: blue gradient border + white text -->
          <button type="button"
            class="cursor-pointer h-[34px] w-[86px] px-2 rounded-[8px] flex items-center justify-center font-extrabold italic uppercase text-[13px] tracking-tight text-white transition-transform hover:scale-[1.03]"
            :style="authButtonStyle.signup"
            @click="showSignupModal">
            <span class="block w-full text-center truncate">{{ $t('header.signUp') }}</span>
          </button>
        </div>
        <!-- The signed-in user's VALUES are not in the mobile header: they
             render as their own full-width bar directly beneath it
             (MobileUserBar, mounted by layouts/default.vue), which is the only
             way the three figures and two actions fit on a 360px phone. What
             stays here is logout — the counterpart to the guest LOGIN/SIGN UP
             pair, in the same slot and at the same 34px height. -->
        <div v-if="isAuthenticated" v-show="!uiStore.showNoticeModal"
          class="flex items-center gap-2 relative self-center pr-1 shrink-0">
          <!-- Styled as the LOGIN button's twin — same gold gradient border and
               gold gradient text, same 34x86 box — so the header's primary
               action looks identical signed in and signed out. The icon is
               dropped rather than recoloured: the gradient is painted through
               `color: transparent` + background-clip, which would erase a
               `currentColor` glyph. `authStore.logout()` already posts
               /auth/logout, clears state and returns home. -->
          <button type="button" :aria-label="$t('auth.logout')"
            class="cursor-pointer h-[34px] w-[86px] px-2 rounded-[8px] flex items-center justify-center font-extrabold italic uppercase text-[13px] tracking-tight transition-transform hover:scale-[1.03]"
            :style="authButtonStyle.login" @click="handleLogout">
            <span class="block w-full text-center truncate"
              :style="{ background: siteConfig.theme.authButton.loginTextGradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }">{{
                $t('auth.logout') }}</span>
          </button>
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

  <!-- Mounted for the menu OR a section on its own: the bottom nav's 공지사항
       opens a section without the menu, and this component renders both.
       The section arm is breakpoint-gated because the SAME section state drives
       the desktop rail panel (AppSidebar) — without it, opening a section there
       would mount this mobile sheet underneath. -->
  <NewProfileModal v-if="uiStore.showProfileModal || (isBelowRail && accountSection.section.value)"
    :is-open="uiStore.showProfileModal" @close="uiStore.setShowProfileModal(false)" />

  <PointConversionModal v-if="uiStore.showPointModal" :is-open="uiStore.showPointModal"
    @close="uiStore.setShowPointModal(false)" />
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from "vue";
import { formatWallet } from "@/utils/currency";
import { mobileHeaderScale } from "@/utils/scale";
import { useAccountSection } from "@/composables/useAccountSections";

const authStore = useAuthStore();
const uiStore = useUiStore();
/** Read only to decide whether the section host has to be mounted. */
const accountSection = useAccountSection();
/** Below `lg` the desktop rail is gone and the mobile sheet is the surface. */
const { isMobile: isBelowRail } = useMobileDetect(1024);

// The desktop account bar formats its own balances (see ACCOUNT_BAR_COLORS);
// UserBalancePill is no longer part of the header.
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
// Shared with the mobile auth strip in layouts/default.vue — see the composable
// for why the background is composed rather than read straight off the config.
const authButtonStyle = useAuthButtonStyle();
const { locale, setLocale, t } = useI18n();

// Desktop account bar. Sampled from the reference render: the username reads
// gold, the wallet balance green and the point balance blue. They identify the
// three values at a glance, so they are value semantics rather than chrome and
// deliberately do NOT follow the modal palette.
const ACCOUNT_BAR_COLORS = {
  username: "#DFC404",
  wallet: "#37F327",
  point: "#269CF0",
} as const;

// "님" in Korean; locales without an equivalent ship an empty string, and the
// template drops the element entirely rather than rendering a stray space.
const honorific = computed(() => t("header.honorific"));

// Point transfer is a money action, so unread inquiry replies block it too —
// see `blockedByUnreadInquiries`.
const openPointModal = async () => {
  if (await blockedByUnreadInquiries()) return;
  uiStore.setShowPointModal(true);
};

// Wallet reload — the account bar's own refresh action (was `show-refresh` on
// UserBalancePill before the bar was flattened).
const isRefreshingWallet = ref(false);
const refreshWallet = async () => {
  if (isRefreshingWallet.value) return;
  isRefreshingWallet.value = true;
  try {
    await authStore.verifyUser();
  } catch {
    // A failed reload leaves the last known balance on screen; the websocket
    // wallet events keep it fresh regardless.
  } finally {
    setTimeout(() => {
      isRefreshingWallet.value = false;
    }, 800);
  }
};

const currency = useCurrency();
// No unit is printed after the balance — the figure stands alone. It used to
// carry "원" (or the currency's symbol where a locale supplied none), which was
// dropped by request.

// Mobile scaling — the scale factor itself lives in the `--mh-scale` CSS var
// (set pre-paint by app.vue's inline script). `isMobile` is still needed by
// the template (modal positioning).
const isMobile = ref(false);
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
  // The header switches to its desktop design at >=690px; below that the row is
  // laid out at MOBILE_HEADER_DESIGN_WIDTH and scaled down to the viewport, so
  // the logo and the auth buttons keep their proportions and never collide.
  // Mirrors app.vue's pre-paint inline script — keep the two in step.
  isMobile.value = window.innerWidth < 690;
  document.documentElement.style.setProperty(
    "--mh-scale",
    String(isMobile.value ? mobileHeaderScale(window.innerWidth) : 1),
  );
};

onMounted(() => {
  updateMobileScale();
  updateScrolled();
  window.addEventListener("resize", updateMobileScale);
  window.addEventListener("scroll", updateScrolled, { passive: true });
  document.addEventListener("click", handleClickOutside);
  // Only when SSR did not already deliver the list. An unconditional fetch here
  // repeated the SSR request on every page load.
  if (!notificationsLoaded.value) fetchNotifications();
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

// Shared with the bottom nav's 공지사항 button, which opens the same panel from
// the same single fetch — see useNotifications.
const {
  notifications,
  loaded: notificationsLoaded,
  unreadCount: unreadNotificationCount,
  fetchNotifications,
  markNotificationsRead,
} = useNotifications();

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

// Header logout. The store owns the whole sequence (POST /auth/logout, clear
// auth + site state, wipe auth localStorage, navigate home), so this is just a
// guard against a double click while that is in flight.
const isLoggingOut = ref(false);
const handleLogout = async () => {
  if (isLoggingOut.value) return;
  isLoggingOut.value = true;
  try {
    await authStore.logout();
  } finally {
    isLoggingOut.value = false;
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

<style scoped>
/* Mobile header row: laid out at the design width, then scaled to the viewport.
   Dividing width/height by the scale first means the scaled result measures
   exactly 100% x 100% of the bar, so the row still fills it edge to edge — a
   bare `transform: scale()` would leave the right side and the bottom empty.
   `--mh-scale` is written pre-paint by app.vue's inline script (and kept in
   sync on resize by updateMobileScale below), so the SSR HTML is already
   correct and there is no hydration resize. */
.mh-scale-row {
  width: calc(100% / var(--mh-scale, 1));
  height: calc(100% / var(--mh-scale, 1));
  transform: scale(var(--mh-scale, 1));
  transform-origin: top left;
}

/* The refresh glyph ships in #434343 (a light-theme grey). Inverting to white
   keeps one shared asset instead of a second recoloured copy of the same file. */
.account-bar-icon-light {
  filter: brightness(0) invert(1);
}

@keyframes spin-once {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.spin-once {
  animation: spin-once 0.8s linear;
}

@media (prefers-reduced-motion: reduce) {
  .spin-once {
    animation: none;
  }
}
</style>
