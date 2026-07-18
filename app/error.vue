<template>
  <div class="min-h-screen bg-black flex items-center justify-center px-4">
    <div class="text-center">
      <h1 class="text-6xl font-bold text-yellow-500 mb-4">
        {{ error?.statusCode || 404 }}
      </h1>
      <h2 class="text-xl text-white mb-6">
        {{
          error?.statusCode === 404 ? "Page Not Found" : "Something Went Wrong"
        }}
      </h2>
      <p class="text-gray-400 mb-8 max-w-md mx-auto">
        {{
          error?.statusCode === 404
            ? "The page you are looking for does not exist or has been moved."
            : "An unexpected error occurred. Please try again later."
        }}
      </p>
      <button
        class="px-6 py-3 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
        @click="handleError"
      >
        Go to Homepage
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{ error: { statusCode: number; message: string } }>();
const siteConfig = useSiteConfig();

useHead({
  title: `${props.error?.statusCode || "Error"} - ${siteConfig.identity.siteName}`,
  meta: [{ name: "robots", content: "noindex, nofollow" }],
});

const handleError = () => clearError({ redirect: "/" });
</script>
