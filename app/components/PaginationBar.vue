<template>
  <div v-if="totalPages > 1" class="mt-6 sm:mt-8 relative flex flex-col items-center justify-center">
    <div
      class="absolute left-0 right-0 top-1/2 -translate-y-1/2 w-full h-px bg-gradient-to-r from-transparent via-[#D4AF37] to-transparent z-0" />
    <div
      class="relative z-10 flex items-center gap-1 sm:gap-2 bg-[#1a1a1a] rounded-lg px-2 sm:px-4 py-2 border border-[#4a4a4a]">
      <!-- Prev -->
      <button
        :disabled="currentPage <= 1"
        class="cursor-pointer flex items-center gap-1 text-[#cecece] hover:text-white disabled:text-[#6b6b6b] disabled:cursor-not-allowed transition-colors px-1 sm:px-2 py-1"
        @click="emit('page-change', currentPage - 1)">
        <svg
          xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"
          aria-hidden="true">
          <path d="m15 18-6-6 6-6" />
        </svg>
        <span class="text-xs sm:text-sm hidden sm:inline">{{ $t("common.previous") }}</span>
      </button>

      <!-- Page numbers -->
      <div class="flex items-center gap-0.5 sm:gap-1">
        <template v-for="item in pageItems" :key="item">
          <span v-if="item === '...'" class="text-[#cecece] px-1 sm:px-2 text-xs sm:text-sm">...</span>
          <button
            v-else :class="[
              'min-w-[28px] sm:min-w-[32px] h-7 sm:h-8 px-2 sm:px-3 rounded-md text-xs sm:text-sm font-medium transition-all duration-200 cursor-pointer',
              item === currentPage
                ? 'bg-gradient-to-br from-[#D4AF37] to-[#C9A500] text-black shadow-md shadow-[#D4AF37]/30'
                : 'text-[#cecece] hover:text-white hover:bg-[#2a2a2a]',
            ]" @click="emit('page-change', item as number)">
            {{ item }}
          </button>
        </template>
      </div>

      <!-- Next -->
      <button
        :disabled="currentPage >= totalPages"
        class="cursor-pointer flex items-center gap-1 text-[#cecece] hover:text-white disabled:text-[#6b6b6b] disabled:cursor-not-allowed transition-colors px-1 sm:px-2 py-1"
        @click="emit('page-change', currentPage + 1)">
        <span class="text-xs sm:text-sm hidden sm:inline">{{ $t("common.next") }}</span>
        <svg
          xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="w-4 h-4"
          aria-hidden="true">
          <path d="m9 18 6-6-6-6" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  currentPage: number;
  totalPages: number;
}>();

const emit = defineEmits<{ "page-change": [page: number] }>();

const pageItems = computed<(number | "...")[]>(() => {
  const total = props.totalPages;
  const curr = props.currentPage;

  if (total <= 7) {
    return Array.from({ length: total }, (_, i) => i + 1);
  }

  const items: (number | "...")[] = [1];
  if (curr > 3) items.push("...");
  for (let p = Math.max(2, curr - 1); p <= Math.min(total - 1, curr + 1); p++) {
    items.push(p);
  }
  if (curr < total - 2) items.push("...");
  items.push(total);
  return items;
});
</script>
