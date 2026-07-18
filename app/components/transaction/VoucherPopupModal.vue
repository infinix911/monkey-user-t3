<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 px-4"
      >
        <div
          class="relative w-full max-w-sm rounded-2xl p-6 flex flex-col gap-5"
          :style="{
            backgroundColor: dep.modalBgColor,
            border: `1.5px solid ${dep.borderColor}`,
            boxShadow: `0 0 32px color-mix(in srgb, ${dep.accentColor} 30%, transparent)`,
          }"
        >
          <!-- Title -->
          <h3
            class="text-center text-lg font-bold"
            :style="{ color: dep.accentColor }"
          >
            {{ t("deposit.voucherPopup.title") }}
          </h3>

          <!-- Popup text -->
          <p
            class="text-center text-sm leading-relaxed whitespace-pre-wrap"
            :style="{ color: dep.inputTextColor }"
          >
            {{ popupText }}
          </p>

          <!-- Action buttons -->
          <div class="flex gap-3">
            <button
              type="button"
              class="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              :style="{
                background: dep.buttonGradientColor,
                color: dep.buttonTextColor,
                border: '1.5px solid #3c3c3c',
              }"
              @click="emit('agree')"
            >
              {{ t("deposit.voucherPopup.agree") }}
            </button>
            <button
              type="button"
              class="flex-1 py-2.5 rounded-xl font-semibold text-sm transition-opacity hover:opacity-80"
              style="
                background: linear-gradient(180deg, #3a3a3a 0%, #222 100%);
                color: #ccc;
                border: 1.5px solid #3c3c3c;
              "
              @click="emit('disagree')"
            >
              {{ t("deposit.voucherPopup.disagree") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
defineProps<{
  isOpen: boolean;
  popupText: string | null;
}>();

const emit = defineEmits<{
  agree: [];
  disagree: [];
}>();

const { t } = useI18n();
const siteConfig = useSiteConfig();
const dep = computed(() => siteConfig.theme.transactionmodal);
</script>
