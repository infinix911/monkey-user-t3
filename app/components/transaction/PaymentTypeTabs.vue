<template>
  <div class="flex-shrink-0 relative rounded-t-xl py-3 md:pb-2 md:pt-4">
    <div class="grid grid-cols-3 items-center relative z-10 h-full px-0 md:px-6">
      <div v-for="(tab, index) in TABS" :key="tab.type"
        class="flex items-center justify-center cursor-pointer transition-all h-full relative"
        @click="model = tab.type">
        <!-- Text tab (BANK / E-MONEY / PULSA) -->
        <div
          class="font-bold uppercase transition-all whitespace-nowrap text-[15px] md:text-[28px] lg:text-[32px]"
          :class="tab.extraClass" :style="{
            ...tabTextStyle,
            letterSpacing: tab.letterSpacing,
            color: activeColor(tab.type),
          }">
          {{ tab.label }}
        </div>

        <div v-if="index < TABS.length - 1" class="absolute right-0 top-[15%] bottom-[15%] w-px bg-gray-600" />
      </div>
    </div>

    <!-- Bottom strip -->
    <div class="absolute bottom-0 left-0 right-0 h-[3px] md:h-1 grid grid-cols-3 md:px-6">
      <div v-for="tab in TABS" :key="`strip-${tab.type}`" :class="model === tab.type ? 'tab-strip-active' : ''" :style="model === tab.type
        ? { '--tab-accent': siteConfig.theme.transactionmodal.accentColor }
        : { backgroundColor: '#212121' }" />
    </div>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from "vue";
import type { PaymentType } from "@/components/transaction/useDepositModal";

const model = defineModel<PaymentType>({ required: true });

const siteConfig = useSiteConfig();

interface TabConfig {
  type: PaymentType;
  label: string;
  extraClass?: string;
  letterSpacing?: string;
}

const TABS: TabConfig[] = [
  { type: "BANK", label: "BANK", extraClass: "pl-4", letterSpacing: "1px" },
  { type: "E-MONEY", label: "E-WALLET", letterSpacing: "0.5px" },
  { type: "PULSA", label: "PULSA", extraClass: "pr-2 md:pr-0", letterSpacing: "1px" },
];

const tabTextStyle: CSSProperties = {
  fontFamily: "Arial, sans-serif",
  fontWeight: 900,
  textShadow: "none",
  lineHeight: "1",
};

function activeColor(type: PaymentType): string {
  return model.value === type
    ? siteConfig.theme.transactionmodal.accentColor
    : "#D0D0D0";
}
</script>

<style scoped>
/* Active tab underline — gold-orange bar that is brightest in the center and
   fades at the ends, with a soft bloom (matches the reference). */
.tab-strip-active {
  background: linear-gradient(90deg,
      var(--tab-accent) 0%,
      color-mix(in srgb, var(--tab-accent) 55%, #fff) 50%,
      var(--tab-accent) 100%);
  box-shadow:
    0 0 8px 1px color-mix(in srgb, var(--tab-accent) 75%, transparent),
    0 0 16px 2px color-mix(in srgb, var(--tab-accent) 40%, transparent);
}
</style>
