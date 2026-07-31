<template>
  <Transition name="modal-fade">
    <div v-if="isOpen">
      <!-- Backdrop -->
      <div class="fixed inset-0 bg-black/50 z-[60] w-[100vw]" @click="onClose" />

      <!-- Menu Panel -->
      <div ref="menuRef"
        class="px-4 py-1 z-[60] rounded-lg shadow-2xl border border-[2px] border-[#404040] overflow-hidden fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[520px]"
        style="background-color: #282828; height: auto; padding-bottom: 85px">
        <!-- User Info Header -->
        <div class="pt-1.5 pb-1 border-b border-[#5C5C5C]">
          <div class="flex justify-between">
            <NuxtImg :src="siteConfig.identity.logoPopup" :alt="siteConfig.identity.siteName"
              class="object-contain origin-left" :style="siteConfig.theme.logoStyles.profileModal" />
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
              <div class="grid grid-cols-4 gap-x-1 gap-y-2 place-items-center">
                <template v-for="item in visiblePage2Items" :key="item.id">
                  <a v-if="item.id === 'telegram'" :href="telegramHref" target="_blank" rel="noopener noreferrer"
                    class="w-full text-center flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-md hover:scale-105 transition-all"
                    @click="onClose">
                    <NuxtImg :src="item.image" :alt="tLabel(item.labelKey)" width="50" height="50" fit="inside"
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
                    <NuxtImg :src="item.image" :alt="tLabel(item.labelKey)" width="50" height="50" fit="inside"
                      class="w-9 h-9 object-contain transition-all"
                      :class="{ 'menu-icon-active': selectedAccountSection && selectedAccountSection === getAccountSection(item.id) }" />
                    <div class="w-full h-[22px] flex items-center justify-center">
                      <span class="text-white group-hover:text-[#FFC421] text-[11.5px] lg:text-[11px] transition-colors"
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

      <!-- Mobile Full-Screen Modal -->
      <Teleport to="body">
        <Transition name="mobile-modal">
          <div v-if="selectedAccountSection"
            class="tm-modal modal-body-fill fixed inset-0 z-[70] flex flex-col overflow-hidden" :style="modalTheme"
            @click.self="closeMobileModal">
            <!-- Modal Header -->
            <div class="relative z-10 shrink-0 flex items-center justify-between px-4 py-2">
              <div class="flex items-center gap-0">
                <!-- Plain white title (no icon / no yellow) — matches the
                     Pertanyaan (Inquiry) modal header on mobile. -->
                <h2 class="text-white"
                  :style="{ fontFamily: 'var(--font-line-seed)', fontWeight: 600, marginTop: '17px', fontSize: '20px' }">
                  {{ selectedAccountSectionLabel
                  }}<template v-if="selectedAccountSection === 'referral'"> ({{ referralCount ?? 0 }})</template>
                </h2>
              </div>
              <button type="button" class="self-start mt-1 hover:opacity-80 transition-opacity cursor-pointer pt-[14px]"
                aria-label="Close" @click="closeMobileModal">
                <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 26 26" fill="none"
                  class="w-[26px] h-[26px]">
                  <line x1="1.44191" y1="1.01958" x2="24.9799" y2="24.5575" stroke="#939393" stroke-width="2.03917"
                    stroke-linecap="round" />
                  <line x1="1.01959" y1="-1.01959" x2="34.3073" y2="-1.01959"
                    transform="matrix(-0.707107 0.707107 0.707107 0.707107 26 1.01959)" stroke="#939393"
                    stroke-width="2.03917" stroke-linecap="round" />
                </svg>
              </button>
            </div>

            <!-- Modal Content -->
            <div
              class="tm-card tm-scroll flex-initial shrink min-h-0 min-w-0 max-h-full overflow-y-auto rounded-[18px] mx-2 p-4 mb-[20px]">
              <AccountSectionPanel :section="selectedAccountSection" />
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import LanguageFlag from "~/components/layout/LanguageFlag.vue";
import AccountSectionPanel from "~/components/profile/AccountSectionPanel.vue";
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
  selectedAccountSectionLabel,
  getAccountSection,
  onClose,
  handleItemClick,
  handleLogout,
  closeMobileModal,
  referralCount,
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

/** Deposit/withdraw palette for the account sections this modal hosts. */
const modalTheme = useModalTheme();
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

/* Yellow tint filter for active/hover icons */
.menu-icon-active,
.group:hover img {
  filter: brightness(0) saturate(100%) invert(83%) sepia(57%) saturate(1000%) hue-rotate(359deg) brightness(103%) contrast(106%);
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
