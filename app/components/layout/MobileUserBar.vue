<template>
  <!-- Signed-in user info, mobile only, sitting directly under the app header.
       This is the mobile twin of the desktop account bar in AppHeader: same
       values, same value colours, same actions. It lives here rather than
       inside the header because the header row is already the logo's, and the
       values/actions below do not fit beside it on a 360px phone. -->
  <!-- FOUR COLUMNS — username · money · points · reload. A grid rather than a
       flex row so each value owns a fixed share of the width and they line up
       in the same places whatever their length; under flex a long balance stole
       room from the username. The three value columns split the space evenly
       (`minmax(0,1fr)` — the 0 minimum is what lets a long username truncate
       instead of widening its column), and the reload is sized to its own
       content so it sits flush right without a spacer.
       36px tall with 14px figures, matching the announcement bar below it. -->
  <div v-if="authStore.isAuthenticated"
    class="min-[690px]:hidden w-full h-[36px] grid grid-cols-[repeat(3,minmax(0,1fr))_auto] items-center gap-2 px-2 overflow-hidden whitespace-nowrap"
    :style="{ backgroundColor: BAR_BG }">
    <!-- 1. Identity. `honorific` is the Korean "님" suffix; locales without an
         equivalent ship an empty string, so the element is dropped entirely
         rather than rendering a stray space. The username is the only part
         allowed to truncate — every other value is a figure that must stay
         readable in full. -->
    <span class="flex items-baseline gap-0.5 min-w-0">
      <span class="font-bold text-[14px] uppercase leading-none truncate"
        :style="{ color: ACCOUNT_BAR_COLORS.username }">{{ authStore.user.username }}</span>
      <span v-if="honorific" class="text-white text-[12px] leading-none shrink-0">{{ honorific }}</span>
    </span>

    <!-- 2. Wallet balance -->
    <span class="flex items-center gap-1 min-w-0">
      <NuxtImg :src="siteConfig.assets.navIcons.walletIcon" alt="" aria-hidden="true" width="16" height="16"
        class="w-[16px] h-[16px] object-contain shrink-0" />
      <span class="font-bold text-[14px] tabular-nums leading-none" :style="{ color: ACCOUNT_BAR_COLORS.wallet }">{{
        currency.formatNumber(authStore.user.wallet) }}</span>
      <span class="text-white/90 text-[12px] leading-none">{{ walletUnit }}</span>
    </span>

    <!-- 3. Point balance — the figure IS the conversion control, as on desktop.
         No separate CONVERT button beside it: clicking the amount opens the
         modal. -->
    <button type="button" :aria-label="$t('point.title')"
      class="flex items-center gap-1 min-w-0 justify-self-start cursor-pointer hover:opacity-80 transition-opacity"
      @click="uiStore.setShowPointModal(true)">
      <NuxtImg :src="siteConfig.assets.navIcons.pointIcon" alt="" aria-hidden="true" width="16" height="16"
        class="w-[16px] h-[16px] object-contain shrink-0" />
      <span class="font-bold text-[14px] tabular-nums leading-none" :style="{ color: ACCOUNT_BAR_COLORS.point }">{{
        currency.formatNumber(authStore.user.point_wallet) }}</span>
    </button>

    <!-- 4. Wallet reload. `pe-1.5` on top of the row's `px-2` keeps the glyph
         off the screen edge — it is the last thing in the row, so without it
         the icon reads as clipped against the bezel. The art ships in #434343,
         so it is tinted to white here rather than shipping a second recoloured
         copy of the same file. -->
    <button type="button" :aria-label="$t('common.refreshBalance')" :disabled="isRefreshingWallet"
      class="justify-self-end pe-1.5 cursor-pointer opacity-90 hover:opacity-100 transition-opacity disabled:opacity-60"
      :class="{ 'spin-once': isRefreshingWallet }" @click="refreshWallet">
      <NuxtImg :src="siteConfig.assets.navIcons.refreshIcon" alt="" aria-hidden="true" width="18" height="18"
        class="mobile-user-bar-icon-light w-[18px] h-[18px] object-contain" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";

const authStore = useAuthStore();
const uiStore = useUiStore();
const siteConfig = useSiteConfig();
const currency = useCurrency();
const { t } = useI18n();

/** Same surface as the desktop account bar, so the two read as one component. */
const BAR_BG = "#262626";

// Value semantics, matching the desktop bar: the username reads gold, the
// wallet balance green and the point balance blue, so the three are told apart
// at a glance. Deliberately NOT the modal palette.
const ACCOUNT_BAR_COLORS = {
  username: "#DFC404",
  wallet: "#37F327",
  point: "#269CF0",
} as const;

const honorific = computed(() => t("header.honorific"));

// The unit printed after the balance. Korean spells the won out as "원", so the
// locale wins where it supplies one; other deployments fall back to the
// currency's own symbol (IDR's "Rp" shown as the "IDR" code).
const walletSymbol = computed(() => {
  const s = currency.symbolFor(authStore.user.currency);
  return s === "Rp" ? "IDR" : s;
});
const walletUnit = computed(() => t("header.walletUnit") || walletSymbol.value);

const isRefreshingWallet = ref(false);
const refreshWallet = async () => {
  if (isRefreshingWallet.value) return;
  isRefreshingWallet.value = true;
  try {
    await authStore.verifyUser();
  } catch {
    // A failed reload leaves the last known balance on screen; the websocket
    // wallet events keep it fresh regardless.
  } finally {
    setTimeout(() => {
      isRefreshingWallet.value = false;
    }, 800);
  }
};
</script>

<style scoped>
/* The refresh glyph ships in #434343 (a light-theme grey). Inverting to white
   keeps one shared asset instead of a second recoloured copy of the same file. */
.mobile-user-bar-icon-light {
  filter: brightness(0) invert(1);
}

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

@media (prefers-reduced-motion: reduce) {
  .spin-once {
    animation: none;
  }
}
</style>
