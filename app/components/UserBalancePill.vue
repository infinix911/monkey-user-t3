<template>
  <div :class="pillClass">
    <!-- Inline layout (desktop): icon + username, then currency + amount, one row -->
    <template v-if="layout === 'inline'">
      <div class="flex flex-nowrap items-center gap-4 whitespace-nowrap">
        <span class="flex flex-nowrap items-center gap-1.5 whitespace-nowrap">
          <NuxtImg :src="levelStoneSrc" :alt="authStore.user.level_name || 'level'" class="object-contain shrink-0" :class="coinClass" />
          <span
class="text-white uppercase whitespace-nowrap" :class="usernameClass"
            :style="markMediumStyle">{{ authStore.user.username }}</span>
        </span>
        <span class="flex flex-nowrap items-baseline gap-1.5 whitespace-nowrap">
          <span class="text-white whitespace-nowrap" :class="symbolClass" :style="markMediumStyle">{{
            walletSymbol }}</span>
          <span class="text-[#285EFF] whitespace-nowrap" :class="amountClass" :style="markBoldStyle">{{
            currency.formatNumber(authStore.user.wallet) }}</span>
          <button
v-if="showRefresh" type="button"
            class="self-center shrink-0 ml-1 flex items-center justify-center text-[#8B8B8B] hover:text-white transition-colors disabled:opacity-60"
            :class="[refreshIconClass, { 'spin-once': isRefreshing }]" :disabled="isRefreshing"
            @click.stop="handleRefresh">
            <svg viewBox="0 0 24 24" fill="none" class="w-full h-full">
              <path
                d="M21 10C21 10 18.995 7.26822 17.3662 5.63824C15.7373 4.00827 13.4864 3 11 3C6.02944 3 2 7.02944 2 12C2 16.9706 6.02944 21 11 21C15.1031 21 18.5649 18.2543 19.6482 14.5M21 10V4M21 10H15"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </span>
      </div>
    </template>

    <!-- Stacked layout (mobile): row 1 = icon + username, row 2 = currency + amount -->
    <template v-else>
      <div class="flex flex-col whitespace-nowrap">
        <div class="flex items-center gap-2.5">
          <NuxtImg :src="levelStoneSrc" :alt="authStore.user.level_name || 'level'" class="object-contain shrink-0" :class="coinClass" />
          <span
class="text-white uppercase font-semibold whitespace-nowrap" :class="usernameClass"
            :style="textStyle">{{ authStore.user.username }}</span>
        </div>
        <div class="flex items-baseline gap-2 whitespace-nowrap">
          <span class="text-white font-medium whitespace-nowrap" :class="symbolClass" :style="textStyle">{{
            walletSymbol }}</span>
          <span class="text-[#285EFF] font-bold whitespace-nowrap" :class="amountClass" :style="textStyle">{{
            currency.formatNumber(authStore.user.wallet) }}</span>
          <button
v-if="showRefresh" type="button"
            class="self-center shrink-0 ml-1 flex items-center justify-center text-[#8B8B8B] hover:text-white transition-colors disabled:opacity-60"
            :class="[refreshIconClass, { 'spin-once': isRefreshing }]" :disabled="isRefreshing"
            @click.stop="handleRefresh">
            <svg viewBox="0 0 24 24" fill="none" class="w-full h-full">
              <path
                d="M21 10C21 10 18.995 7.26822 17.3662 5.63824C15.7373 4.00827 13.4864 3 11 3C6.02944 3 2 7.02944 2 12C2 16.9706 6.02944 21 11 21C15.1031 21 18.5649 18.2543 19.6482 14.5M21 10V4M21 10H15"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

defineOptions({
  name: "UserBalancePill",
});

const props = withDefaults(
  defineProps<{
    /** "stacked" = homepage mobile (username above balance); "inline" = homepage desktop (one row). */
    layout?: "stacked" | "inline";
    /** Tailwind size classes for the gold coin icon. */
    coinClass?: string;
    /** Tailwind classes (font-size) for the username text. */
    usernameClass?: string;
    /** Tailwind classes (font-size) for the currency symbol. */
    symbolClass?: string;
    /** Tailwind classes (font-size) for the balance amount. */
    amountClass?: string;
    /** Tailwind classes for the pill container (padding, height, radius, gap). */
    pillClass?: string;
    /** Show a refresh button beside the balance that re-fetches the wallet. */
    showRefresh?: boolean;
    /** Tailwind size classes for the refresh button/icon. */
    refreshIconClass?: string;
    /** When true, refresh the wallet balance once on mount. */
    refreshOnMount?: boolean;
  }>(),
  {
    layout: "stacked",
    coinClass: "w-[44px] h-[44px]",
    usernameClass: "text-[28px]",
    symbolClass: "text-[28px]",
    amountClass: "text-[30px]",
    pillClass: "",
    showRefresh: false,
    refreshIconClass: "w-[22px] h-[22px]",
    refreshOnMount: false,
  },
);

const authStore = useAuthStore();
// Level-matching stone badge (silver/ruby/diamond…, falling back to gold) —
// shared composable so the user info shows the same stone everywhere.
const levelStoneSrc = useLevelStone();

// Mirrors the homepage logic: display the wallet symbol, showing IDR's "Rp"
// as the "IDR" code instead.
const currency = useCurrency();
const walletSymbol = computed(() => {
  const symbol = currency.symbolFor(authStore.user.currency);
  return symbol === "Rp" ? "IDR" : symbol;
});

const textStyle =
  "font-family: var(--font-line-seed); line-height:0.5; letter-spacing: 0.04em;";

// Desktop (inline) user info uses the self-hosted Mark font:
// Medium (500) for the username and IDR symbol, Bold (700) for the amount.
const markMediumStyle =
  "font-family: var(--font-mark); font-weight:500; line-height:0.5; letter-spacing: 0.04em;";
const markBoldStyle =
  "font-family: var(--font-mark); font-weight:700; line-height:0.5; letter-spacing: 0.04em;";

// Manual balance refresh (re-fetch the user/wallet) with a brief spin.
const isRefreshing = ref(false);
const handleRefresh = async () => {
  if (isRefreshing.value) return;
  isRefreshing.value = true;
  try {
    await authStore.verifyUser();
  } finally {
    setTimeout(() => {
      isRefreshing.value = false;
    }, 800);
  }
};

onMounted(() => {
  if (props.refreshOnMount) authStore.verifyUser();
});
</script>

<style scoped>
@keyframes spin-once {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

.spin-once {
  animation: spin-once 0.8s linear;
}
</style>
