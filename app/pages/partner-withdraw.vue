<template>
  <div
    class="flex min-h-screen flex-col font-sans overflow-hidden"
    style="background: linear-gradient(0deg, #131313 0%, #5b5b5b 100%)"
  >
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full lg:max-w-none flex-col items-center px-0 lg:px-4">
        <PartnerWithdrawContent />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
definePageMeta({
  layout: "default",
});

// Payment-flow page — keep out of the index.
useHead({ meta: [{ name: "robots", content: "noindex, nofollow" }] });
</script>
