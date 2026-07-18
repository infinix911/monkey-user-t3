<template>
  <div class="min-h-screen bg-[#0a0a0a] text-white">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <!-- Page Header -->
      <div class="mb-8">
        <h1 class="text-2xl font-bold text-white flex items-center gap-3">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            class="w-7 h-7 text-[#D4AF37]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {{ t("profile.activity") }}
        </h1>
      </div>

      <!-- Activity Content -->
      <ActivityContent />
    </div>
  </div>
</template>

<script setup lang="ts">
import ActivityContent from "@/components/activity/ActivityContent.vue";

const { t } = useI18n();

useHead({
  title: () => t("profile.activity"),
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});
</script>
