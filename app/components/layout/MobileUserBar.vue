<template>
  <!-- Signed-in user info, below `lg` only, sitting directly under the app
       header. This is the small-screen twin of the desktop account bar in
       AppHeader: same values, same value colours, same actions. It lives here
       rather than inside the header because the header row is already the
       logo's, and the values/actions below do not fit beside it on a 360px
       phone.

       `lg:hidden`, NOT `min-[690px]:hidden`: the header adopts its desktop
       design at 690px, but the account bar inside it only has room from `lg`.
       Between the two — an iPad mini at 768px portrait — that bar read as
       crowded, so this takes over there. AppHeader's account bar is
       `hidden lg:flex` for the same reason; exactly one of the two renders at
       any width. -->
  <!-- FOUR COLUMNS — username · money · points · reload. A grid rather than a
       flex row so each value owns a fixed share of the width and they line up
       in the same places whatever their length; under flex a long balance stole
       room from the username.
       The identity and the reload button are sized to their own content and are
       excluded from the split; the space LEFT OVER between them is halved, one
       half each for the wallet and point figures. Both figures are
       `justify-self-end`, so the wallet ends exactly on the midpoint and the
       point ends against the reload button. Equal thirds (the previous
       `repeat(3,minmax(0,1fr))`) gave the figures no room to grow into, so a
       balance running past its third overlapped its neighbour.
       `minmax(0,max-content)` on the identity caps it at its natural width while
       the 0 minimum still lets a long username truncate rather than eat a half.

       SIZING is fluid, and it is load-bearing rather than cosmetic. Worst
       realistic case is a 9-character username with two 8-digit balances; at a
       flat 14px that measures ~315px of content against ~280px of usable width
       on a 360px phone, so it cannot fit and something has to collide or clip.
       Rather than stepping down at a breakpoint — which is either too small on
       the wide side of the step or still too big on the narrow side — every
       dimension scales with the viewport via clamp() (see the style block).
       The type therefore stays as large as the width allows at any size, and
       reaches the full 14px design value from ~400px up.
       36px tall, matching the announcement bar below it. -->
  <div v-if="authStore.isAuthenticated"
    class="mub-bar lg:hidden w-full h-[36px] grid grid-cols-[minmax(0,max-content)_minmax(0,1fr)_minmax(0,1fr)_auto] items-center overflow-hidden whitespace-nowrap"
    :style="{ backgroundColor: BAR_BG }">
    <!-- 1. Identity. `honorific` is the Korean "님" suffix; locales without an
         equivalent ship an empty string, so the element is dropped entirely
         rather than rendering a stray space. The username is the only part
         allowed to truncate — every other value is a figure that must stay
         readable in full. -->
    <span class="flex items-baseline gap-0.5 min-w-0 overflow-hidden">
      <span class="mub-figure min-w-0 font-bold uppercase leading-none truncate"
        :style="{ color: ACCOUNT_BAR_COLORS.username }">{{ authStore.user.username }}</span>
      <span v-if="honorific" class="mub-suffix text-white leading-none shrink-0">{{ honorific }}</span>
    </span>

    <!-- 2. Wallet balance — right-aligned on the midpoint of the space between
         the identity and the reload button. `min-w-0` on the figure is what
         makes `truncate` work at all: a flex child defaults to
         `min-width: auto`, so without it the span refuses to shrink below its
         text and pushes into the neighbouring column instead of ellipsising. -->
    <span class="mub-group flex items-center min-w-0 justify-self-end overflow-hidden">
      <NuxtImg :src="siteConfig.assets.navIcons.walletIcon" alt="" aria-hidden="true" width="16" height="16"
        class="mub-icon object-contain shrink-0" />
      <!-- Figure and unit share a baseline (they are one phrase, at two sizes);
           the icon centres against that block. Centring all three together put
           the smaller 원 on the figure's mid-line instead of its baseline. -->
      <span class="mub-group flex items-baseline min-w-0 overflow-hidden">
        <span class="mub-figure min-w-0 font-bold tabular-nums leading-none truncate"
          :style="{ color: ACCOUNT_BAR_COLORS.wallet }">{{
            currency.formatNumber(authStore.user.wallet) }}</span>
        <span class="mub-suffix text-white/90 leading-none shrink-0">{{ walletUnit }}</span>
      </span>
    </span>

    <!-- 3. Point balance — the figure IS the conversion control, as on desktop.
         No separate CONVERT button beside it: clicking the amount opens the
         modal. Right-aligned so it sits against the reload button. -->
    <button type="button" :aria-label="$t('point.title')"
      class="mub-group flex items-center min-w-0 justify-self-end overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
      @click="openPointModal">
      <NuxtImg :src="siteConfig.assets.navIcons.pointIcon" alt="" aria-hidden="true" width="16" height="16"
        class="mub-icon object-contain shrink-0" />
      <span class="mub-figure min-w-0 font-bold tabular-nums leading-none truncate"
        :style="{ color: ACCOUNT_BAR_COLORS.point }">{{
          currency.formatNumber(authStore.user.point_wallet) }}</span>
    </button>

    <!-- 4. Wallet reload. The glyph is centred in its own column rather than
         pushed flush right: the trailing `pe-1.5` that used to hold it off the
         screen edge also pulled it off-centre, so it no longer lined up with
         the values beside it. The bar's own `padding-inline` already keeps it
         clear of the bezel, so the extra end padding is not needed.
         `place-items-center` centres the icon on both axes, which also keeps it
         on the spin animation's axis. The art ships in #434343, so it is tinted
         to white here rather than shipping a second recoloured copy. -->
    <button type="button" :aria-label="$t('common.refreshBalance')" :disabled="isRefreshingWallet"
      class="mub-reload-btn grid place-items-center text-center justify-self-center cursor-pointer opacity-90 hover:opacity-100 transition-opacity disabled:opacity-60"
      :class="{ 'spin-once': isRefreshingWallet }" @click="refreshWallet">
      <NuxtImg :src="siteConfig.assets.navIcons.refreshIcon" alt="" aria-hidden="true" width="18" height="18"
        class="mub-reload-icon mobile-user-bar-icon-light object-contain" />
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

// Point transfer is a money action, so unread inquiry replies block it too —
// see `blockedByUnreadInquiries`.
const openPointModal = async () => {
  if (await blockedByUnreadInquiries()) return;
  uiStore.setShowPointModal(true);
};

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
/* FLUID SCALE. Every dimension in the bar is tied to the viewport so the type
   is always as large as the available width allows, instead of stepping down at
   a breakpoint and reading too small for the rest of that range.

   The coefficients are derived, not picked by eye. Total content width scales
   linearly with the figure size, and the worst realistic case (9-char username
   + two 8-digit balances) measures ~315px at 14px. Usable width is the viewport
   less padding, gaps and the reload button (~80px), so the largest size that
   still fits is roughly `14 * (100vw - 80) / 315` — i.e. about `4.4vw - 3.5px`.
   The scale sits slightly ABOVE that pure-fit line: fitted exactly, the bar
   read too small. The ceiling is 15px (reached at ~412px) and the floor 12px —
   a middle setting, having tried 14px (too small) and 16px (too big). The
   truncate guard absorbs the narrow-phone cases where a long username and two
   8-digit balances no longer fit. Suffixes and icons use the same shape so the
   whole bar scales as one system rather than drifting apart. */
.mub-bar {
  --mub-figure: clamp(12px, 4vw - 1.5px, 15px);
  --mub-suffix: clamp(10px, 3.4vw - 1.3px, 13px);
  --mub-icon: clamp(14px, 4.4vw - 1.5px, 17px);
  --mub-gap: clamp(2px, 1.1vw - 1px, 4px);

  column-gap: clamp(6px, 2.2vw - 1.9px, 8px);
  padding-inline: clamp(10px, 4.4vw - 5.8px, 16px);
}

.mub-figure {
  font-size: var(--mub-figure);
}

.mub-suffix {
  font-size: var(--mub-suffix);
}

/* Optical centring. `align-items: center` lines up BOXES, but a digit's ink
   sits high in its box: with `leading-none` the box is the em square, and the
   digits run baseline-to-cap-height, leaving the unused descender space below.
   The ink therefore centres about 0.05em above the box centre, which reads as
   the icon sitting low against the number. The nudge cancels exactly that, and
   is expressed against the figure size so it tracks the fluid scale. */
.mub-icon {
  width: var(--mub-icon);
  height: var(--mub-icon);
  margin-block-start: calc(var(--mub-figure) * -0.05);
}

/* Gap between an icon and its figure, inside a value group. */
.mub-group {
  gap: var(--mub-gap);
}

/* Reload button. `padding-top` drops the glyph onto the values' line; it
   replaces the optical nudge the value icons carry, so the 3px is the whole
   offset rather than 3px fighting a -0.05em correction. */
.mub-reload-btn {
  padding-top: 3px;
}

/* Reload glyph. Slightly larger than the value icons (it is an action, not a
   label) but tied to the same fluid scale. */
.mub-reload-icon {
  width: calc(var(--mub-icon) + 2px);
  height: calc(var(--mub-icon) + 2px);
}

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
