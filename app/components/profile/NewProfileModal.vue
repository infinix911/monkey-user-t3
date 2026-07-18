<template>
  <Transition name="modal-fade">
    <div v-if="isOpen">
      <!-- Backdrop for bottom position -->
      <div v-if="isBottom" class="fixed inset-0 bg-black/50 z-[60] w-[100vw]" @click="onClose" />

      <!-- Menu Panel -->
      <div ref="menuRef" :class="[
        'px-4 py-1 z-[60] rounded-lg shadow-2xl border border-[2px] border-[#404040] overflow-hidden',
        positionClasses,
      ]" :style="{
        backgroundColor: isBottom ? '#282828' : 'black',
        height: 'auto',
        paddingBottom: isBottom ? '85px' : undefined,
      }">
        <!-- User Info Header -->
        <div class="pt-1.5 pb-1 border-b border-[#5C5C5C]">
          <div class="flex justify-between">
            <NuxtImg :src="siteConfig.identity.logoPopup" :alt="siteConfig.identity.siteName"
              class="object-contain origin-left" :style="siteConfig.theme.logoStyles.profileModal" />
            <div class="flex items-center gap-2">
              <!-- Language selector — mobile only. -->
              <div v-if="isBottom" data-lang-selector class="relative">
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
            <!-- Page 1: Menu Items -->
            <div class="w-full flex-shrink-0">
              <div class="grid grid-cols-4 gap-x-1 gap-y-2 place-items-center">
                <!-- Telegram uses <a> for external link -->
                <template v-for="item in visibleMenuItems" :key="item.id">
                  <a v-if="item.id === 'telegram'" :href="telegramHref" target="_blank" rel="noopener noreferrer"
                    class="w-full text-center flex flex-col items-center gap-1.5 px-2 py-1.5 rounded-md hover:scale-105 transition-all"
                    @click="onClose">
                    <NuxtImg :src="item.image" :alt="tLabel(item.labelKey)" width="50" height="50" fit="inside"
                      class="w-9 h-9 object-contain" />
                    <div class="w-full h-[22px] flex items-center justify-center">
                      <span class="text-white text-[11px]" style="font-family: var(--font-line-seed)">
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
                      <span class="text-white group-hover:text-[#FFC421] text-[11px] transition-colors"
                        style="font-family: var(--font-line-seed)">
                        {{ tLabel(item.labelKey) }}
                      </span>
                    </div>
                  </button>
                </template>
              </div>
            </div>

            <!-- Page 2 items -->
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

        <!-- Carousel Dots -->
        <div class="flex justify-center gap-2 pt-3 pb-4 border-b border-b-[1px] border-b-[#5C5C5C]">
          <button v-for="page in 2" :key="page" class="w-2 h-2 rounded-full transition-all duration-300 cursor-pointer"
            :class="carouselPage === page - 1 ? 'bg-white w-4' : 'bg-[#5C5C5C]'" @click="carouselPage = page - 1" />
        </div>

        <!-- Banner Carousel -->
        <div class="w-full pt-2 pb-[4px] lg:pb-[6px]">
          <ProfileBannerCarousel />
        </div>
      </div>

      <!-- Sliding Panel (desktop only) -->
      <div v-if="!isBottom" ref="slidingPanelRef" :class="[
        'fixed top-[73px] mt-2 z-[60] rounded-lg shadow-2xl border border-[2px] border-[#404040] overflow-hidden transition-all duration-300 ease-in-out',
        selectedAccountSection
          ? 'opacity-100 translate-x-0'
          : 'opacity-0 translate-x-4 pointer-events-none',
        'w-[500px] h-[600px] lg:w-[600px]',
      ]" :style="{ right: 'calc(max(0px, (100vw - 1152px) / 2) + 401px)' }" style="background-color: black">
        <!-- Panel Header -->
        <div class="flex items-center justify-between px-4 py-3 border-b border-[#5C5C5C]">
          <h2 class="text-[#ffe100] text-lg font-medium" style="font-family: var(--font-line-seed)">
            {{ selectedAccountSectionLabel }}
          </h2>
          <button class="text-[#939393] hover:text-white transition-colors cursor-pointer" aria-label="Close panel"
            @click="selectedAccountSection = null">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 27 27" fill="none">
              <line x1="1.41421" y1="1" x2="25.627" y2="25.2127" stroke="currentColor" stroke-width="2"
                stroke-linecap="round" />
              <line x1="1" y1="-1" x2="35.242" y2="-1"
                transform="matrix(-0.707107 0.707107 0.707107 0.707107 26.6732 1)" stroke="currentColor"
                stroke-width="2" stroke-linecap="round" />
            </svg>
          </button>
        </div>

        <!-- Panel Content -->
        <div class="p-4 h-[calc(100%-70px)] overflow-y-auto lg:overflow-hidden">
          <InquiryContent v-if="selectedAccountSection === 'inquiry'" :inquiry-data="mobileInquiryData"
            :on-refresh="handleMobileInquiryRefresh" :on-page-change="handleMobileInquiryPageChange"
            :current-page="mobileInquiryPage" />
          <component :is="accountSectionComponent" v-else-if="selectedAccountSection && accountSectionComponent" />
        </div>
      </div>

      <!-- Promotion + Activity feature modals (both desktop and mobile) -->
      <ProfileFeatureModals v-model:show-promotion="showPromotionModal" v-model:show-activity="showActivityModal"
        :site-config="siteConfig" />

      <!-- Mobile Full-Screen Modal -->
      <Teleport to="body">
        <Transition name="mobile-modal">
          <div v-if="isBottom && selectedAccountSection"
            class="fixed inset-0 z-[70] bg-[#1a1a1a] flex flex-col overflow-hidden" @click.self="closeMobileModal">
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
              class="flex-initial shrink min-h-0 min-w-0 max-h-full overflow-y-auto bg-[#2F2F2F] border border-[#454545] rounded-[18px] mx-2 p-4 mb-[20px]">
              <InquiryContent v-if="selectedAccountSection === 'inquiry'" :inquiry-data="mobileInquiryData"
                :on-refresh="handleMobileInquiryRefresh" :on-page-change="handleMobileInquiryPageChange"
                :current-page="mobileInquiryPage" />
              <component :is="accountSectionComponent" v-else />
            </div>
          </div>
        </Transition>
      </Teleport>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import type { Component } from "vue";
import LanguageFlag from "~/components/layout/LanguageFlag.vue";
import Referral from "~/components/my-account/Referral.vue";
import BonusHistory from "~/components/my-account/BonusHistory.vue";
import BettingReport from "~/components/my-account/BettingReport.vue";
import LevelSystem from "~/components/my-account/LevelSystem.vue";
import LoginHistory from "~/components/my-account/LoginHistory.vue";
import ChangePassword from "~/components/my-account/ChangePassword.vue";
import TransactionLogs from "~/components/my-account/TransactionLogs.vue";
import PromotionContent from "~/components/promotion/PromotionContent.vue";
import FaqContent from "~/components/faq/FaqContent.vue";
import InquiryContent from "~/components/inquiry/InquiryContent.vue";
import ContactContent from "~/components/contact/ContactContent.vue";
import { useProfileMenu } from "@/components/profile/useProfileMenu";

// Map menu id → component. Keys match API item names (camelCase) and menu ids.
const ACCOUNT_COMPONENTS = {
  referral: Referral,
  bonusHistory: BonusHistory,
  bettingReport: BettingReport,
  levelSystem: LevelSystem,
  loginHistory: LoginHistory,
  changePassword: ChangePassword,
  // Transaction ledger. Both API ids map to the same panel.
  transaksi: TransactionLogs,
  transaction: TransactionLogs,
  promotion: PromotionContent,
  faq: FaqContent,
  inquiry: InquiryContent,
  contact: ContactContent,
} satisfies Record<string, Component>;

const props = defineProps<{
  isOpen: boolean;
  position?: "top" | "bottom";
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
  slidingPanelRef,
  selectedAccountSection,
  showPromotionModal,
  showActivityModal,
  carouselPage,
  isBottom,
  visibleMenuItems,
  visiblePage2Items,
  positionClasses,
  selectedAccountSectionLabel,
  getAccountSection,
  onClose,
  handleItemClick,
  handleLogout,
  mobileInquiryData,
  mobileInquiryPage,
  handleMobileInquiryRefresh,
  handleMobileInquiryPageChange,
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
  position: () => props.position,
  onClose: () => emit("close"),
  isAccountSection: (id: string) => id in ACCOUNT_COMPONENTS,
});

const accountSectionComponent = computed(() => {
  const section = selectedAccountSection.value;
  if (!section || !(section in ACCOUNT_COMPONENTS)) return null;
  return ACCOUNT_COMPONENTS[section as keyof typeof ACCOUNT_COMPONENTS];
});
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
