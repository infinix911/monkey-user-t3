<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="tm-modal fixed inset-0 z-50 flex items-center justify-center"
        :style="[modalTheme, { background: 'color-mix(in srgb, var(--body-bg) 90%, transparent)' }]"
        @click.self="$emit('close')"
      >
        <div
          class="!gap-0 bg-transparent border-0 p-0 w-auto max-w-[calc(100%-2rem)] lg:w-[896px] shadow-2xl flex flex-col max-h-[90dvh] lg:max-h-[90dvh] h-auto rounded-none lg:rounded-xl overflow-hidden"
        >
          <!-- Modal Header - Transparent Background -->
          <div class="flex items-center justify-between px-1 pt-4 mb-2 lg:pt-6">
            <h2
              class="tm-accent-text text-[22px] lg:text-[32px] lg:leading-[73.951px]"
            >
              {{ t("contact.title") }}
            </h2>
            <button
              class="tm-muted transition-colors hover:text-white cursor-pointer"
              aria-label="Close"
              @click="$emit('close')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="h-8 w-8"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  stroke-width="2"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          <!-- Modal Content - With Background -->
          <div
            class="modal-body-fill modal-gradient-border tm-scroll px-4 relative flex-1 min-h-0 flex flex-col overflow-y-auto"
            style="border-radius: 25px"
          >
            <ContactContent />
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

/** Deposit/withdraw palette, inherited by ContactContent. */
const modalTheme = useModalTheme();
</script>

<style scoped>
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
