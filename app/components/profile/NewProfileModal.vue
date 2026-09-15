<template>
  <Transition name="modal-fade">
    <div v-if="isOpen">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50 z-[60] w-[100vw]" @click="onClose" />

      <!-- Menu Panel -->
      <div ref="menuRef"
        class="px-2 lg:px-4 py-1 z-[60] rounded-lg shadow-2xl border border-[2px] border-[#404040] overflow-hidden fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[520px]"
        style="background-color: #282828; height: auto; padding-bottom: 85px">
        <!-- User Info Header -->
        <div class="pt-1.5 pb-1 border-b border-[#5C5C5C] px-2">
          <div class="flex justify-between">
            <!-- Plain <img>: CMS-swappable logo, see AppHeader.vue -->
            <img :src="siteConfig.identity.logoPopup" :alt="siteConfig.identity.siteName"
              class="object-contain origin-left" :style="siteConfig.theme.logoStyles.profileModal"
            >
            <div class="flex items-center gap-2">
              <!-- Language selector — mobile only. -->
              <div data-lang-selector class="relative">
                <button
                  class="inline-flex justify-center items-center gap-1 px-1 h-[30px] rounded-[7px] text-white/90 cursor-pointer hover:opacity-90 transition-opacity"
                  :style="{ backgroundColor: siteConfig.theme.ui.langSelectorBg }" @click="toggleLangDropdown">
                  <LanguageFlag :code="profileLangCode" class="w-6 h-5 rounded-[5px] overflow-hidden" />
                  <svg class="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div v-if="showLangProfileDropdown"
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
              <!-- Logout -->
              <div
                class="cursor-pointer hover:scale-105 transition-all duration-300 font-[var(--font-line-seed)] flex items-center justify-center w-[83.51px] h-[24px] text-white text-[13px] rounded-[6.28px] border-[0.5px] bg-[#727272] text-center font-semibold border-solid border-[#5F5F5F]"
                @click="handleLogout">
                {{ t("auth.logout") }}
              </div>
            </div>
          </div>
        </div>

        <!-- Carousel Container -->
        <div class="overflow-hidden mt-3 select-none touch-pan-y" @pointerdown="onPointerDown"
          @pointermove="onPointerMove" @pointerup="onPointerUp" @pointercancel="onPointerCancel"
          @click.capture="onClickCapture">
          <div class="flex ease-in-out" :class="{ 'transition-transform duration-300': !menuSwipeDragging }"
            :style="{ transform: menuTrackTransform }">
            <!-- Account items — the CMS menu's PAGE 2. Page 1 is the game
                 categories, which belong to the navbar and bottom nav on mobile:
                 rendering them here would produce tiles that open nothing, since
                 the shared navigation has no handler for those ids. -->
            <div class="w-full flex-shrink-0">
              <div class="grid grid-cols-4 gap-x-1 gap-y-2 place-items-center" :style="menuVars">
                <template v-for="item in visiblePage2Items" :key="item.id">
                  <a v-if="item.id === 'telegram'" :href="telegramHref" target="_blank" rel="noopener noreferrer"
                    class="w-full text-center flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-md hover:scale-105 transition-all"
                    @click="onClose">
                    <img :src="item.image" :alt="tLabel(item.labelKey)" width="50" height="50"
                      class="w-9 h-9 object-contain" />
                    <div class="w-full h-[22px] flex items-center justify-center">
                      <span class="text-white text-[12px] lg:text-[11px]" style="font-family: var(--font-line-seed)">
                        {{ tLabel(item.labelKey) }}
                      </span>
                    </div>
                  </a>
                  <button v-else
                    class="group w-full flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-md hover:scale-105 transition-all cursor-pointer outline-none focus:outline-none focus-visible:outline-none"
                    @click="handleItemClick(item)">
                    <span
                      class="menu-icon-box"
                      :style="{ '--menu-icon-src': `url(&quot;${item.image}&quot;)` }"
                      :class="{ 'is-active': selectedAccountSection && selectedAccountSection === getAccountSection(item.id) }">
                      <img :src="item.image" :alt="tLabel(item.labelKey)" width="50" height="50"
                        class="w-9 h-9 object-contain transition-all" />
                      <span class="menu-icon-tint" aria-hidden="true" />
                    </span>
                    <div class="w-full h-[22px] flex items-center justify-center">
                      <span class="menu-label text-white text-[11.5px] lg:text-[11px] transition-colors"
                        style="font-family: var(--font-line-seed)">
                        {{ tLabel(item.labelKey) }}
                      </span>
                    </div>
                  </button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <!-- Rule closing the menu. The carousel dots used to sit here; the menu
             is a single page now (MENU_PAGE_COUNT), so a lone dot would be inert
             chrome. Restore the dot row if a second page ever comes back.
             The promo banner carousel that followed is gone too — it had no
             banners to show and rendered as an empty "배너가 없습니다" box. -->
        <div class="pt-3 border-b border-b-[1px] border-b-[#5C5C5C]" />
      </div>

      <!-- Promotion + Activity feature modals -->
      <ProfileFeatureModals v-model:show-promotion="showPromotionModal" v-model:show-activity="showActivityModal" />
    </div>
  </Transition>

  <!-- No section sheet here. The open account section is drawn by AppSidebar's
       teleported panel at EVERY width — a bordered card on a dimmed backdrop —
       so the feature looks the same on phone and desktop (same reasoning as
       InquiryModal). This component used to draw a second, full-screen sheet
       for the same shared `accountSection` state, which rendered underneath
       that panel on mobile and read as a duplicate modal. -->
</template>

<script setup lang="ts">
import LanguageFlag from "~/components/layout/LanguageFlag.vue";
import { useProfileMenu } from "@/components/profile/useProfileMenu";

const props = defineProps<{
  isOpen: boolean;
}>();

const emit = defineEmits<{
  close: [];
}>();

const {
  t,
  tLabel,
  siteConfig,
  telegramHref,
  menuRef,
  selectedAccountSection,
  showPromotionModal,
  showActivityModal,
  visiblePage2Items,
  getAccountSection,
  onClose,
  handleItemClick,
  handleLogout,
  onPointerDown,
  onPointerMove,
  onPointerUp,
  onPointerCancel,
  onClickCapture,
  menuSwipeDragging,
  menuTrackTransform,
  languages,
  showLangProfileDropdown,
  profileLangCode,
  toggleLangDropdown,
  selectLanguage,
} = useProfileMenu({
  isOpen: () => props.isOpen,
  onClose: () => emit("close"),
});

/**
 * The accent this modal tints with, published as a custom property.
 *
 * `theme.sidebar` is the shared menu config - the rail and this modal render
 * the same CMS list - so the hover accent comes from the same token rather than
 * a second one that could drift. It replaces a literal `#FFC421` on the label
 * and a hand-tuned filter chain on the icon, neither of which followed the
 * theme at all.
 */
const menuVars = computed<Record<string, string>>(() => ({
  "--menu-accent": siteConfig.theme.sidebar.activeItemColor,
}));
</script>

<style scoped>
.mobile-modal-enter-active,
.mobile-modal-leave-active {
  transition: opacity 0.2s ease;
}

.mobile-modal-enter-from,
.mobile-modal-leave-to {
  opacity: 0;
}

/* Active/hover tint for the menu icons.

   Was a hand-tuned `filter:` chain that only approximated a fixed yellow, so it
   ignored the theme entirely - the same problem the rail had. A filter chain
   cannot be derived from a colour token in CSS, so the tint is a masked overlay
   that paints `--menu-accent` through the icon's own alpha, giving the token
   exactly. The <img> underneath keeps its real artwork at rest. */
.menu-icon-box {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.menu-icon-tint {
  position: absolute;
  inset: 0;
  background-color: var(--menu-accent);
  -webkit-mask: var(--menu-icon-src) center / contain no-repeat;
  mask: var(--menu-icon-src) center / contain no-repeat;
  opacity: 0;
  transition: opacity 150ms ease;
  pointer-events: none;
}

.group:hover .menu-icon-tint,
.menu-icon-box.is-active .menu-icon-tint {
  opacity: 1;
}

/* The label follows the same token instead of a literal #FFC421. */
.group:hover .menu-label {
  color: var(--menu-accent);
}

/* Menu grid items: never draw a box/line on hover, focus or tap. Kills the
   focus outline, any UA box-shadow, and the mobile tap-highlight rectangle
   (the latter is what shows as a faint square on touch — outline-none alone
   does not remove it). */
.group {
  -webkit-tap-highlight-color: transparent;
  outline: none !important;
  border: none !important;
}

.group:hover,
.group:focus,
.group:focus-visible,
.group:active {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}
</style>
