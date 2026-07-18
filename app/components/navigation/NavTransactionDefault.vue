<template>
  <!-- Default (template-3) desktop deposit/withdraw panel: gradient background,
       icon + text label per action, divider between. Unchanged from the
       original inline Navbar markup. -->
  <div
    class="flex-1 min-w-[250px] h-[98px] relative flex items-center justify-center rounded-[16px] overflow-hidden"
    :style="{ background: siteConfig.theme.nav.depositSectionGradient }">
    <div class="flex items-stretch justify-between w-full h-full">
      <button type="button"
        class="flex-1 flex flex-col items-center justify-center gap-1 text-white cursor-pointer hover:bg-white/5 transition-colors duration-200"
        @click="onDeposit">
        <img :src="siteConfig.assets.navIcons.depositIcon" :alt="$t('navbar.deposit')" width="36" height="41"
          class="h-[41px] w-auto object-contain" loading="eager" decoding="async">
        <span class="text-[13px] font-bold uppercase tracking-tight leading-none">{{ $t('navbar.deposit') }}</span>
      </button>
      <div class="w-px bg-white my-6" />
      <button type="button"
        class="flex-1 flex flex-col items-center justify-center gap-1 text-white cursor-pointer hover:bg-white/5 transition-colors duration-200"
        @click="onWithdraw">
        <img :src="siteConfig.assets.navIcons.withdrawIcon" :alt="$t('navbar.withdraw')" width="36" height="41"
          class="h-[41px] w-auto object-contain" loading="eager" decoding="async">
        <span class="text-[13px] font-bold uppercase tracking-tight leading-none">{{ $t('navbar.withdraw') }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
const siteConfig = useSiteConfig();
const { onDeposit, onWithdraw } = useNavTransactionActions();
</script>
