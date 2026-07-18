<template>
  <Teleport to="body">
    <Transition name="mobile-modal">
      <div v-if="isOpen"
        class="fixed inset-0 z-[80] bg-black/90 flex items-center justify-center px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-[max(1rem,env(safe-area-inset-top))]"
        @click.self="$emit('close')">
        <!-- max-h-[98dvh] (dynamic viewport height) shrinks the whole modal —
             title INCLUDED — to whatever the live iPhone viewport is, so it
             never gets cut off when the address bar shows/hides. Column layout:
             header stays fixed, only the body scrolls. Capped at 714px on wider
             screens so it doesn't stretch on desktop. -->
        <div class="w-full max-w-[600px] max-h-[98dvh] sm:max-h-[714px] flex flex-col overflow-hidden">
          <!-- Header (never shrinks — always visible) -->
          <div class="flex-shrink-0 flex items-center justify-center relative mb-3">
            <h2 class="text-white text-xl font-semibold" style="font-family: var(--font-line-seed)">
              {{ t("promotion.promotion") }}
            </h2>
            <button type="button" class="absolute right-0 transition-colors cursor-pointer" aria-label="Close"
              @click="$emit('close')">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 26 26" fill="none"
                class="md:w-[26px] md:h-[26px]">
                <line x1="1.44191" y1="1.01958" x2="24.9799" y2="24.5575" stroke="#939393" stroke-width="2.03917"
                  stroke-linecap="round" />
                <line x1="1.01959" y1="-1.01959" x2="34.3073" y2="-1.01959"
                  transform="matrix(-0.707107 0.707107 0.707107 0.707107 26 1.01959)" stroke="#939393"
                  stroke-width="2.03917" stroke-linecap="round" />
              </svg>
            </button>
          </div>

          <!-- Content — the card IS the scroll container (flex-1 + min-h-0 +
               overflow-y-auto). Scrolling directly on the flex item avoids the
               unreliable `height:100%` on a nested child, which could fail to
               bound and leave the list unscrollable. -->
          <div class="bg-[#2F2F2F] rounded-[18px] border border-[#454545] flex-1 min-h-0 p-4 overflow-y-auto">
            <PromotionContent />
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
interface Props {
  isOpen: boolean;
}

interface Emits {
  (e: "close"): void;
}

defineProps<Props>();
defineEmits<Emits>();

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
