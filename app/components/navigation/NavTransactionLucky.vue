<template>
  <!-- Lucky-nuxt desktop deposit/withdraw panel: a CSS-background panel with
       large icon buttons (hover-scale). The panel background uses
       theme.nav.depositSectionGradient (shared with the default skin, from the
       CMS API) plus the fixed Lucky frame (radius + drop shadow). -->
  <div
    class="flex-1 min-w-[250px] h-[98px] relative flex items-center justify-center overflow-hidden"
    :style="panelStyle">
    <div class="flex items-stretch justify-between w-full h-full">
      <button type="button"
        class="flex-1 flex flex-col items-center justify-center gap-1 text-white cursor-pointer transition-transform duration-300 hover:scale-105"
        @click="onDeposit">
        <img :src="siteConfig.assets.navIcons.depositIcon" :alt="$t('navbar.deposit')" width="60" height="60"
          class="h-[48px] w-auto object-contain" loading="eager" decoding="async">
        <span class="text-[13px] font-bold uppercase tracking-tight leading-none">{{ $t('navbar.deposit') }}</span>
      </button>
      <!-- Center divider -->
      <div class="w-[2px] self-stretch my-[14px] rounded-full flex-shrink-0 bg-white/40" />
      <button type="button"
        class="flex-1 flex flex-col items-center justify-center gap-1 text-white cursor-pointer transition-transform duration-300 hover:scale-105"
        @click="onWithdraw">
        <img :src="siteConfig.assets.navIcons.withdrawIcon" :alt="$t('navbar.withdraw')" width="60" height="60"
          class="h-[48px] w-auto object-contain" loading="eager" decoding="async">
        <span class="text-[13px] font-bold uppercase tracking-tight leading-none">{{ $t('navbar.withdraw') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const siteConfig = useSiteConfig();
const { onDeposit, onWithdraw } = useNavTransactionActions();

// Lucky panel style: the deposit-section gradient (from the API/config, shared
// with the default skin) plus the fixed Lucky frame (radius + drop shadow).
const panelStyle = computed(() => ({
  boxSizing: "border-box" as const,
  background: siteConfig.theme.nav.depositSectionGradient,
  boxShadow: "2.60274px 5.20548px 1.30137px rgba(0, 0, 0, 0.5)",
  borderRadius: "13px",
}));
</script>
