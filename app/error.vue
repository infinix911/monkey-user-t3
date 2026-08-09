<template>
  <div class="min-h-screen bg-black flex items-center justify-center px-4">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-yellow-500 mb-4">
        {{ error?.statusCode || 404 }}
      </h1>
      <h2 class="text-xl text-white mb-6">
        {{ isNotFound ? $t("error.notFound.title") : $t("error.generic.title") }}
      </h2>
      <p class="text-gray-400 mb-8 max-w-md mx-auto">
        {{
          isNotFound
            ? $t("error.notFound.description")
            : $t("error.generic.description")
        }}
      </p>
      <button
        class="px-6 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
        @click="handleError"
      >
        {{ $t("error.goHome") }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message: string } }>();
const siteConfig = useSiteConfig();

/** 404 gets its own copy; every other status shares the generic message. */
const isNotFound = computed(() => props.error?.statusCode === 404);

useHead({
  title: `${props.error?.statusCode || "Error"} - ${siteConfig.identity.siteName}`,
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const handleError = () => clearError({ redirect: "/" });
</script>
