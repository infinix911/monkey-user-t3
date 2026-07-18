<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="isOpen"
        class="fixed inset-0 z-50 flex items-center justify-center"
        style="background: rgba(19, 19, 19, 0.9)"
        @click.self="$emit('close')"
      >
        <div
          class="!gap-0 bg-transparent border-0 p-0 w-auto max-w-[calc(100%-2rem)] lg:w-[896px] shadow-2xl flex flex-col max-h-[90dvh] lg:max-h-[90dvh] h-auto rounded-none lg:rounded-xl overflow-hidden"
        >
          <!-- Modal Header - Transparent Background -->
          <div class="flex items-center justify-between px-1 pt-4 mb-2 lg:pt-6">
            <h2
              class="text-[#FFE100] text-[22px] lg:text-[32px] lg:leading-[73.951px]"
            >
              {{ t("contact.title") }}
            </h2>
            <button
              class="transition-colors hover:text-gray-300 cursor-pointer text-white"
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
            class="px-4 relative flex-1 min-h-0 bg-[#000] border-2 border-[#454545] flex flex-col overflow-y-auto promotion-scroll"
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
