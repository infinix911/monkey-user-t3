<template>
  <!-- Promotion Modal (both desktop and mobile) -->
  <Teleport to="body">
    <Transition name="mobile-modal">
      <div
        v-if="showPromotion" class="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
        @click.self="emit('update:showPromotion', false)">
        <!-- max-h-[98dvh] (dynamic viewport height) shrinks the whole modal —
             title INCLUDED — to the live iPhone viewport, so it never gets cut
             off when the address bar shows/hides. Desktop capped at 714px. -->
        <div class="w-full max-w-[600px] max-h-[98dvh] sm:max-h-[714px] flex flex-col overflow-hidden">
          <!-- Header (never shrinks — always visible) -->
          <div class="flex-shrink-0 flex items-center justify-center relative mb-4">
            <h2 class="text-white text-xl font-semibold" style="font-family: var(--font-line-seed)">
              {{ t("profile.promotion") }}
            </h2>
            <button
              type="button" class="absolute right-0 transition-colors cursor-pointer" aria-label="Close"
              @click="emit('update:showPromotion', false)">
              <svg
                xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 26 26" fill="none"
                class="md:w-[26px] md:h-[26px]">
                <line
                  x1="1.44191" y1="1.01958" x2="24.9799" y2="24.5575" stroke="#939393" stroke-width="2.03917"
                  stroke-linecap="round" />
                <line
                  x1="1.01959" y1="-1.01959" x2="34.3073" y2="-1.01959"
                  transform="matrix(-0.707107 0.707107 0.707107 0.707107 26 1.01959)" stroke="#939393"
                  stroke-width="2.03917" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <!-- Content — the card IS the scroll container (flex-1 + min-h-0 +
               overflow-y-auto), avoiding an unreliable nested height. -->
          <div class="bg-[#2F2F2F] rounded-[18px] border border-[#454545] flex-1 min-h-0 p-4 overflow-y-auto">
            <PromotionContent />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>

  <!-- Activity Modal (both desktop and mobile) -->
  <Teleport to="body">
    <Transition name="mobile-modal">
      <div
        v-if="showActivity" class="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center p-4"
        @click.self="emit('update:showActivity', false)">
        <div class="w-[95%] md:w-[80%] max-w-[1600px] flex flex-col relative" style="min-height: min(720px, 90dvh); max-height: 90dvh;">
          <!-- Close button (floats above the panel top-right so it never clips) -->
          <button
            type="button"
            class="absolute -top-5 -right-2 md:-top-5 md:-right-5 z-20 w-10 h-10 md:w-11 md:h-11 rounded-full bg-black/80 border border-white/20 shadow-lg hover:bg-black hover:border-white/40 flex items-center justify-center transition-colors cursor-pointer"
            aria-label="Close" @click="emit('update:showActivity', false)">
            <svg
              xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 26 26" fill="none"
              class="md:w-[22px] md:h-[22px]">
              <line
                x1="1.44191" y1="1.01958" x2="24.9799" y2="24.5575" stroke="#ffffff" stroke-width="2.5"
                stroke-linecap="round" />
              <line
                x1="1.01959" y1="-1.01959" x2="34.3073" y2="-1.01959"
                transform="matrix(-0.707107 0.707107 0.707107 0.707107 26 1.01959)" stroke="#ffffff"
                stroke-width="2.5" stroke-linecap="round" />
            </svg>
          </button>

          <!-- Content — the gradient card IS the scroll container (flex-1 +
               min-h-0 + overflow-y-auto), bounded by the panel's max-height:90dvh
               via flexbox. No magic-number max-height, so it fits the live
               iPhone viewport (address bar shown or not) and scrolls its
               overflow instead of getting cut off. -->
          <div
            class="rounded-[18px] flex-1 min-h-0 p-4 shadow-2xl border overflow-y-auto"
            :style="{
              background: siteConfig.theme.panel.contentPanelGradient,
              borderColor: siteConfig.theme.panel.panelBorder,
            }"
          >
            <ActivityContent />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import type { SiteConfig } from "@/composables/useDefaultThemeConfig";
import PromotionContent from "~/components/promotion/PromotionContent.vue";
import ActivityContent from "~/components/activity/ActivityContent.vue";

defineProps<{
  showPromotion: boolean;
  showActivity: boolean;
  siteConfig: SiteConfig;
}>();

const emit = defineEmits<{
  "update:showPromotion": [value: boolean];
  "update:showActivity": [value: boolean];
}>();

const { t } = useI18n();
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
</style>
