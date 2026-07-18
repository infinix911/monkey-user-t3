<template>
  <Teleport to="body">
    <Transition name="modal">
      <div
        v-if="open && notice"
        class="fixed inset-0 z-[60] flex items-center justify-center p-4"
        style="background: rgba(0, 0, 0, 0.75)"
        @click.self="$emit('update:open', false)"
      >
        <div
          class="relative rounded-[.8rem] overflow-hidden shadow-2xl bg-[#231b47] border-t-[0.1rem] border-t-[#584095] w-full max-w-[600px] max-h-[90dvh]"
        >
          <!-- Close Button -->
          <button
            :aria-label="t('common.close')"
            class="cursor-pointer absolute right-3 top-3 z-20 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[#302a4f] text-[#bcb8d6] hover:bg-[#3a3266]"
            @click="$emit('update:open', false)"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              class="h-4 w-4"
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

          <!-- Content -->
          <div
            class="flex flex-col gap-6 p-4 lg:p-6 z-3 rounded-l-xl rounded-r-xl -mt-[11px] relative overflow-y-auto"
            style="
              background:
                linear-gradient(#0003, #0003),
                linear-gradient(191.69deg, #322c5399 8.57%, #711edb99 91.43%),
                linear-gradient(180deg, #322c53 5%, #322c5300);
            "
          >
            <!-- Header -->
            <div class="text-center">
              <h2 class="text-white text-[1.25rem] lg:text-xl font-bold mt-4">
                {{ t("notice.title") }}
              </h2>
              <p class="sr-only">{{ t("notice.description") }}</p>
            </div>

            <div class="flex flex-col gap-4">
              <!-- Title -->
              <div>
                <div class="flex items-center gap-2 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                  <div class="text-xs text-[#9a96bc] uppercase tracking-wide">
                    {{ t("notice.titleLabel") }}
                  </div>
                </div>
                <div
                  class="p-3 rounded-lg bg-[#2c3049]/50 border border-[#40386b]"
                >
                  <div class="text-sm text-white font-medium">
                    {{ notice.title }}
                  </div>
                </div>
              </div>

              <!-- Body/Content -->
              <div v-if="notice.body">
                <div class="flex items-center gap-2 mb-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    class="h-4 w-4 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      stroke-linecap="round"
                      stroke-linejoin="round"
                      stroke-width="2"
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  <div class="text-xs text-[#9a96bc] uppercase tracking-wide">
                    {{ t("notice.contentLabel") }}
                  </div>
                </div>
                <div
                  class="p-3 rounded-lg bg-[#2c3049]/50 border border-[#40386b]"
                >
                  <div class="text-sm text-white mt-1 whitespace-pre-wrap">
                    {{ notice.body }}
                  </div>
                </div>
              </div>
            </div>

            <!-- Close Button -->
            <button
              class="cursor-pointer mt-4 w-full rounded-[5px] bg-[#8c34fc] py-4 text-base font-bold text-white transition-colors hover:bg-[#6a2fe8]"
              @click="$emit('update:open', false)"
            >
              {{ t("common.close") }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
export interface NoticeItem {
  id: string;
  title: string;
  date: string;
  body?: string;
}

interface Props {
  open: boolean;
  notice: NoticeItem | null;
}

interface Emits {
  (e: "update:open", value: boolean): void;
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
