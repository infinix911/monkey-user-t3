<template>
  <div class="min-h-screen bg-[#131313] text-white">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-6">
        <h1 class="text-2xl font-bold text-white">
          {{ t("promotion.promotion") }}
        </h1>
      </div>

      <!-- Promotions Content -->
      <PromotionContent />
    </div>
  </div>
</template>

<script setup lang="ts">
const { t } = useI18n();

useSeoHead();
useBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Promotions", path: "/promotions" },
]);
</script>
