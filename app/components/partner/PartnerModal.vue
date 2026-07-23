<template>
  <Teleport to="body">
    <Transition name="pm-fade">
      <div v-if="modelValue" class="fixed inset-0 z-[1000] flex items-center justify-center p-4"
        role="dialog" aria-modal="true">
        <!-- Frosted premium backdrop -->
        <div class="absolute inset-0 bg-black/60 pm-backdrop" @click="close" />

        <!-- Panel. The themed `cardBg` is painted on an absolutely positioned
             layer over the panel's own opaque base rather than on the panel
             itself: `theme.partner.cardBgColor` is a card token and themes are
             free to give it alpha, which is fine for in-page cards sitting on
             the page background but would let the page bleed through a modal.
             Header/body carry `relative` so they stack above that layer. -->
        <Transition name="pm-scale">
          <div v-if="modelValue" class="pm-panel relative w-full max-h-[90dvh] flex flex-col rounded-2xl border overflow-hidden"
            :class="widthClass"
            :style="{ borderColor: 'rgba(255,255,255,0.10)', '--pb-accent': accent }">
            <div class="absolute inset-0 pointer-events-none" aria-hidden="true" :style="{ background: cardBg }" />

            <!-- Header -->
            <div class="relative flex items-center gap-2 px-5 py-3.5 border-b border-white/10 shrink-0"
              :style="{ background: headBg }">
              <span class="w-1 h-5 rounded-full shrink-0" :style="{ background: accent, boxShadow: `0 0 8px ${accent}` }" />
              <h3 class="text-white text-sm font-extrabold uppercase tracking-wide">{{ title }}</h3>
              <button type="button" class="ml-auto p-1.5 -mr-1 text-white/60 hover:text-white cursor-pointer"
                :aria-label="$t('common.close')" @click="close">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18 18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <!-- Body -->
            <div class="relative px-5 py-5 overflow-y-auto scrollbar-none">
              <slot />
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from "vue";

const props = withDefaults(
  defineProps<{ modelValue: boolean; title?: string; width?: "sm" | "md" | "lg" }>(),
  { title: "", width: "md" },
);
const emit = defineEmits<{ "update:modelValue": [boolean] }>();

const { accent, cardBg, headBg } = usePartnerTheme();

const widthClass = computed(
  () => ({ sm: "max-w-md", md: "max-w-xl", lg: "max-w-4xl" })[props.width],
);

const close = () => emit("update:modelValue", false);

// Lock body scroll while the modal is open.
watch(
  () => props.modelValue,
  (open) => {
    if (typeof document !== "undefined") document.body.style.overflow = open ? "hidden" : "";
  },
);
onUnmounted(() => {
  if (typeof document !== "undefined") document.body.style.overflow = "";
});
</script>

<style scoped>
.scrollbar-none {
  scrollbar-width: none;
}

.scrollbar-none::-webkit-scrollbar {
  display: none;
}

/* Frosted premium backdrop. */
.pm-backdrop {
  backdrop-filter: blur(8px) saturate(1.1);
  -webkit-backdrop-filter: blur(8px) saturate(1.1);
}

/* Elevated panel — layered soft shadow reads above the blurred backdrop.
   The opaque base guarantees the dialog is never see-through no matter what
   alpha a theme document puts on `theme.partner.cardBgColor`. */
.pm-panel {
  background-color: #0F0F0F;
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.5),
    0 32px 64px -24px rgba(0, 0, 0, 0.85);
}

.pm-fade-enter-active,
.pm-fade-leave-active {
  transition: opacity 0.2s ease;
}

.pm-fade-enter-from,
.pm-fade-leave-to {
  opacity: 0;
}

.pm-scale-enter-active,
.pm-scale-leave-active {
  transition: transform 0.22s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.22s ease;
}

.pm-scale-enter-from,
.pm-scale-leave-to {
  transform: translateY(8px) scale(0.97);
  opacity: 0;
}
</style>
