<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-start justify-center"
        style="background: rgba(19, 19, 19, 0.9)"
      >
        <div
          class="!gap-0 bg-transparent border-0 p-0 w-full max-w-[calc(100%-2rem)] lg:max-w-4xl shadow-2xl flex flex-col max-h-[90dvh] rounded-xl overflow-hidden lg:mt-8"
        >
          <!-- Header -->
          <div class="flex items-center justify-between px-6 pt-4">
            <h2 class="text-white text-2xl font-semibold">
              {{ t("faq.title") }}
            </h2>
            <button
              class="text-white hover:text-gray-300 transition-colors cursor-pointer"
              aria-label="Close"
              @click="$emit('close')"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                class="w-6 h-6"
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

          <!-- Content -->
          <div
            class="flex flex-col flex-1 bg-[#2a2a2a] relative min-h-0 px-6 md:px-8 py-6 rounded-xl mx-2"
          >
            <div class="overflow-y-auto promotion-scroll flex-1 min-h-0">
              <FaqContent />
            </div>
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
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}
</style>
