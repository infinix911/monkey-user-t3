<template>
  <!-- min-h matches the title image height (h-11/md:h-15) so the header keeps
       its size and the absolutely-positioned close button stays centred even
       when the image is hidden (showDepositImageTitle = false). -->
  <div class="flex-shrink-0 px-4 md:px-6 pt-3 min-h-11 md:min-h-15 flex items-center justify-center relative bg-transparent">
    <!-- Title wordmark image (shown when the brand opts in via
         deposit.showDepositImageTitle). -->
    <NuxtImg v-if="dep.showDepositImageTitle" :src="siteConfig.assets.transaction.depositIcon" alt="Deposit"
      class="h-11 md:h-15 w-auto object-contain select-none pointer-events-none" />
    <button type="button" class="absolute right-4 md:right-6 top-1/2 -translate-y-1/2 transition-colors cursor-pointer"
      aria-label="Close" @click="emit('close')">
      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 26 26" fill="none"
        class="md:w-[26px] md:h-[26px]">
        <line x1="1.44191" y1="1.01958" x2="24.9799" y2="24.5575" stroke="#939393" stroke-width="2.03917"
          stroke-linecap="round" />
        <line x1="1.01959" y1="-1.01959" x2="34.3073" y2="-1.01959"
          transform="matrix(-0.707107 0.707107 0.707107 0.707107 26 1.01959)" stroke="#939393" stroke-width="2.03917"
          stroke-linecap="round" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
const siteConfig = useSiteConfig();
const dep = computed(() => siteConfig.theme.transactionmodal);

const emit = defineEmits<{
  close: [];
}>();
</script>
