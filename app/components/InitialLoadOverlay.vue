<template>
  <div
    v-if="visible"
    class="initial-load-overlay"
    role="status"
    aria-live="polite"
    aria-atomic="true"
  >
    <div class="initial-load-spinner" aria-hidden="true" />
    <p class="initial-load-label">{{ t("common.initialLoading") }}</p>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";

defineProps<{ visible: boolean }>();

const { t } = useI18n();
</script>

<style scoped>
.initial-load-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483647;
  display: grid;
  place-content: center;
  justify-items: center;
  gap: 1rem;
  background: #000;
  color: #f5f5f5;
}

.initial-load-spinner {
  width: 48px;
  height: 48px;
  border: 3px solid rgba(255, 255, 255, 0.18);
  border-top-color: #fff;
  border-radius: 50%;
  animation: initial-load-spin 0.75s linear infinite;
}

.initial-load-label {
  margin: 0;
  font-size: 0.9375rem;
  font-weight: 600;
}

@keyframes initial-load-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .initial-load-spinner { animation: none; }
}
</style>
