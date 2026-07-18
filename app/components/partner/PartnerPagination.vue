<template>
  <div v-if="totalPages > 1" class="flex justify-center items-center gap-2 mt-5">
    <button type="button" class="pg-btn" :disabled="page <= 1" :aria-label="'prev'" @click="go(page - 1)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
      </svg>
    </button>
    <span class="text-white/65 text-[13px] font-semibold tabular-nums px-2">{{ page }} / {{ totalPages }}</span>
    <button type="button" class="pg-btn" :disabled="page >= totalPages" :aria-label="'next'" @click="go(page + 1)">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ totalPages: number }>();
const page = defineModel<number>("page", { default: 1 });
const { accent } = usePartnerTheme();

const go = (p: number) => {
  page.value = Math.min(Math.max(1, p), props.totalPages);
};
</script>

<style scoped>
.pg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  border-radius: 9px;
  color: rgba(255, 255, 255, 0.75);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.pg-btn:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: v-bind(accent);
  color: #fff;
}

.pg-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
</style>
