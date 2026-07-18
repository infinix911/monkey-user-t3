<template>
  <div class="min-h-screen bg-black flex items-center justify-center">
    <div class="text-center">
      <div
        class="w-16 h-16 border-4 border-[#D4AF37] border-t-transparent rounded-full animate-spin mx-auto mb-4"
      />
      <p class="text-white text-lg">{{ t("common.loading") }}</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();
</script>
