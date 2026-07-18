<template>
  <div
    class="h-[220px] md:h-[215px] text-[17.5px] rounded-lg px-6 py-5"
    :style="{
      background: cardBg,
      border: `1px solid ${dep.borderColor}`,
      boxShadow: glowShadow,
    }"
  >
    <div class="flex justify-between mb-2">
      <span class="text-white/70">{{
        t("deposit.transactionSummary.depositAmount")
      }}</span>
      <span class="text-white/70">{{ formatCurrency(depositAmount) }}</span>
    </div>
    <div class="flex justify-between mb-2">
      <span class="text-white/70">{{
        t("deposit.transactionSummary.serviceFee")
      }}</span>
      <span class="text-white/70">{{ formatCurrency(serviceFee) }}</span>
    </div>
    <hr class="my-2 border-0 h-px" :style="{ backgroundColor: dividerColor }" >
    <div class="flex justify-between mb-2">
      <span class="text-white/70">{{
        t("deposit.transactionSummary.netAmount")
      }}</span>
      <span class="font-black" :style="{ color: dep.accentColor }">{{
        formatCurrency(netAmount)
      }}</span>
    </div>
    <div class="flex justify-between mb-2">
      <span class="text-white/70">{{
        t("deposit.transactionSummary.bonus")
      }}</span>
      <span class="text-white/70">{{ formatCurrency(bonus) }}</span>
    </div>
    <hr class="my-2 border-0 h-px" :style="{ backgroundColor: dividerColor }" >
    <div class="flex justify-between">
      <span class="text-white font-semibold">{{
        t("deposit.transactionSummary.totalNetAmount")
      }}</span>
      <span class="font-semibold" :style="{ color: dep.accentColor }">{{
        formatCurrency(totalNetAmount)
      }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  depositAmount: number;
  serviceFee: number;
  netAmount: number;
  bonus: number;
  totalNetAmount: number;
}>();

const { t } = useI18n();
const currency = useCurrency();

const siteConfig = useSiteConfig();
const dep = computed(() => siteConfig.theme.transactionmodal);
const dividerColor = "rgba(255, 255, 255, 0.12)";

// Dark base with a subtle warm accent glow lifted at the top-left corner,
// fading to near-black toward the bottom-right (matches the reference card).
const cardBg = computed(
  () =>
    `radial-gradient(135% 135% at 0% 0%, color-mix(in srgb, ${dep.value.accentColor} 16%, transparent) 0%, color-mix(in srgb, ${dep.value.accentColor} 5%, transparent) 26%, transparent 58%), ${dep.value.inputBgColor}`,
);

// Themed outer glow (uses the deposit accent) + depth shadow.
const glowShadow = computed(
  () =>
    `0 0 18px color-mix(in srgb, ${dep.value.accentColor} 35%, transparent), 0 6px 18px rgba(0, 0, 0, 0.55), inset 0 0 0 1px rgba(255, 255, 255, 0.02)`,
);

function formatCurrency(amount: string | number): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  return `${currency.symbol} ${num.toLocaleString(currency.locale)}`;
}
</script>
