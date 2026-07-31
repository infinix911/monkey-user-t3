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
        <!-- Same shell as the account-section panels in AppSidebar: bordered
             card, titled header bar with the close button in it, scrollable
             body. It previously had no header at all — just an X floating
             outside the card — which made it the odd one out among the dozen
             panels reached from the same menu. Width stays wide: this one holds
             a table, unlike the 620px account panels. -->
        <div
          class="tm-modal modal-body-fill modal-gradient-border w-[95%] md:w-[80%] max-w-[1600px] flex flex-col relative rounded-lg shadow-2xl overflow-hidden"
          role="dialog" :style="[modalTheme, { minHeight: 'min(720px, 90dvh)', maxHeight: '90dvh' }]">
          <div class="flex-shrink-0 flex items-center justify-between px-4 py-3 border-b tm-line">
            <h2 class="tm-accent-text text-lg font-medium" style="font-family: var(--font-line-seed)">
              {{ t("profile.activity") }}
            </h2>
            <button
              class="tm-muted hover:text-white transition-colors cursor-pointer" :aria-label="t('common.close')"
              @click="emit('update:showActivity', false)">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 27 27" fill="none">
                <line
                  x1="1.41421" y1="1" x2="25.627" y2="25.2127" stroke="currentColor" stroke-width="2"
                  stroke-linecap="round" />
                <line
                  x1="1" y1="-1" x2="35.242" y2="-1"
                  transform="matrix(-0.707107 0.707107 0.707107 0.707107 26.6732 1)" stroke="currentColor"
                  stroke-width="2" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <!-- Body is the scroll container (flex-1 + min-h-0), bounded by the
               panel's max-height:90dvh through flexbox rather than a magic
               number, so it fits the live iPhone viewport whether or not the
               address bar is showing. -->
          <div class="tm-scroll p-4 flex-1 min-h-0 overflow-y-auto">
            <ActivityContent />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import PromotionContent from "~/components/promotion/PromotionContent.vue";
import ActivityContent from "~/components/activity/ActivityContent.vue";

defineProps<{
  showPromotion: boolean;
  showActivity: boolean;
}>();

const emit = defineEmits<{
  "update:showPromotion": [value: boolean];
  "update:showActivity": [value: boolean];
}>();

const { t } = useI18n();

/**
 * The `tm-*` palette the account-section panels use. The activity modal now
 * shares their shell, and those classes read CSS variables that this supplies —
 * without it the header's accent title and rule would fall back to unset.
 */
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
</style>
