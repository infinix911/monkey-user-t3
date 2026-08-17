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
  <!-- THREE EQUAL SECTIONS — identity · money · (points + reload). A grid
       rather than a flex row so each section owns the same share of the width
       and the values land in the same places whatever their length; under flex
       a long balance stole room from the username.
       The username is CENTRED in the left third and the balance CENTRED in the
       middle one — and because the two side sections are equal, the balance
       centres on the bar's own centre line. The point figure and the reload
       button share the right third as one flush-right group, so the reload
       stays at the screen edge where the thumb expects it.
       `grid-cols-3` is `repeat(3,minmax(0,1fr))`; the 0 minimum is what lets an
       over-long value truncate inside its own third instead of pushing into a
       neighbouring section.

       SIZING is fluid, and it is load-bearing rather than cosmetic. Equal
       sections give the money the same room as the much shorter username, so
       the widest realistic value sets the type scale for the whole bar. Worst
       case is a 억-scale balance (`999,999,999 원`, 9 digits) in the middle and
       an 8-digit point figure plus the reload button on the right; those two
       measure within a pixel of each other, so one scale satisfies both (the
       derivation is in the style block). Rather than stepping down at a
       breakpoint — either too small on the wide side of the step or still too
       big on the narrow side — every dimension scales with the viewport via
       clamp(), so the type stays as large as the width allows at any size.
       36px tall, matching the announcement bar below it. -->
  <!-- INSET. The bar used to run edge to edge; it now floats with clearance at
       the sides and below, matching the partner console's account bar. It stays
       flush against the header at the top.

       The clearance is PADDING on this wrapper, not margin on the bar. The
       layout measures the bar with `offsetHeight` (see `userBarHeight` in
       layouts/default.vue) to size the spacer that holds its place while it is
       pinned on scroll, and to offset the navbar beneath it. `offsetHeight`
       excludes margins, and the anchor around this has no padding or border of
       its own, so a vertical margin here would collapse straight through it —
       the measurement would come back 36px while the bar occupied more, and the
       page would jump as it pinned. Padding is inside the border box, so it is
       measured.

       The wrapper carries the header's own background rather than sitting
       transparent: while pinned it is `position: fixed`, so page content would
       otherwise scroll through the gap around the bar. -->
  <div v-if="authStore.isAuthenticated" class="mub-wrap lg:hidden w-full" :style="{ backgroundColor: WRAP_BG }">
    <div
      class="mub-bar w-full h-[36px] grid grid-cols-3 items-center overflow-hidden whitespace-nowrap rounded-[10px]"
      :style="{ backgroundColor: BAR_BG }">
    <!-- SECTION 1. Identity, centred in its third. `honorific` is the Korean
         "님" suffix; locales without an equivalent ship an empty string, so the
         element is dropped entirely rather than rendering a stray space. The
         username is the only part allowed to truncate — every other value is a
         figure that must stay readable in full. `max-w-full` keeps the centred
         item inside its column so the truncation actually engages. -->
    <span class="flex items-baseline gap-0.5 min-w-0 max-w-full justify-self-center overflow-hidden">
      <span class="mub-figure min-w-0 font-bold uppercase leading-none truncate"
        :style="{ color: ACCOUNT_BAR_COLORS.username }">{{ authStore.user.username }}</span>
      <span v-if="honorific" class="mub-suffix text-white leading-none shrink-0">{{ honorific }}</span>
    </span>

    <!-- SECTION 2. Wallet balance, centred in the middle third — and therefore
         on the bar's centre line, the side sections being equal. `min-w-0` on
         the figure is what makes `truncate` work at all: a flex child defaults
         to `min-width: auto`, so without it the span refuses to shrink below its
         text and pushes into the neighbouring section instead of ellipsising. -->
    <span class="mub-group flex items-center min-w-0 max-w-full justify-self-center overflow-hidden">
      <!-- The wallet coin runs one pixel larger than the point disc: its artwork
           reads a touch smaller at a matched box, so an equal size leaves the two
           looking uneven. Matches the partner console's account bar. -->
      <NuxtImg :src="siteConfig.assets.navIcons.walletIcon" alt="" aria-hidden="true" width="17" height="17"
        class="mub-icon mub-icon-wallet object-contain shrink-0" />
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

    <!-- SECTION 3. Point balance and wallet reload, as one group flush against
         the trailing edge of the bar. They share a section rather than owning a
         column each so the reload stays at the screen edge (where the thumb
         expects it) while the three value sections stay equal. -->
    <div class="mub-actions flex items-center min-w-0 max-w-full justify-self-end overflow-hidden">
      <!-- The point figure IS the conversion control, as on desktop. No separate
           CONVERT button beside it: clicking the amount opens the modal. -->
      <button type="button" :aria-label="$t('point.title')"
        class="mub-group flex items-center min-w-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
        @click="openPointModal">
        <NuxtImg :src="siteConfig.assets.navIcons.pointIcon" alt="" aria-hidden="true" width="16" height="16"
          class="mub-icon object-contain shrink-0" />
        <span class="mub-figure min-w-0 font-bold tabular-nums leading-none truncate"
          :style="{ color: ACCOUNT_BAR_COLORS.point }">{{
            currency.formatNumber(authStore.user.point_wallet) }}</span>
      </button>

      <!-- Wallet reload. No trailing padding of its own: the bar's
           `padding-inline` already holds it clear of the bezel, and the `pe-1.5`
           it used to carry pulled the glyph off the values' centre line.
           `place-items-center` centres the icon on both axes, which also keeps
           it on the spin animation's axis. The art ships in #434343, so it is
           tinted to white here rather than shipping a second recoloured copy. -->
      <button type="button" :aria-label="$t('common.refreshBalance')" :disabled="isRefreshingWallet"
        class="mub-reload-btn grid place-items-center text-center shrink-0 cursor-pointer opacity-90 hover:opacity-100 transition-opacity disabled:opacity-60"
        :class="{ 'spin-once': isRefreshingWallet }" @click="refreshWallet">
        <NuxtImg :src="siteConfig.assets.navIcons.refreshIcon" alt="" aria-hidden="true" width="18" height="18"
          class="mub-reload-icon mobile-user-bar-icon-light object-contain" />
      </button>
    </div>
    </div>
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

/** Behind the inset bar. The header's own sticky colour, so the strip the bar
 *  floats in reads as a continuation of the header rather than a second band. */
const WRAP_BG = computed(() => siteConfig.theme.nav.stickyBg);

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

   The coefficients are MEASURED in the app's own font, not picked by eye. With
   three EQUAL sections the widest value sets the type size for the whole bar,
   since the money gets no more room than the much shorter username. The two
   contended sections are:

     middle  wallet icon + a 9-digit 억 balance + `원`
     right   point icon + an 8-digit point figure + gap + reload button

   ⚠ LINE Seed has NO tabular figures, so the `tabular-nums` below is a no-op in
   the shipped font (it only bites in the system-ui fallback) and digit widths
   VARY: at 15px a `0` advances 10.0px against a `1`'s 6.5px. The worst case is
   therefore not `999,999,999` but a balance full of zeros — a realistic
   `500,000,000` is ~11px wider than all-nines at the same size. Both sections
   were rendered with all-zero values across 320–768px and their natural width
   compared against the column width `(100vw - wrapper padding - bar padding -
   column gaps) / 3`; the line below is the largest scale that clears both. The
   money needs ~8.9px of column per 1px of type and the point group ~8.7px —
   near enough identical, which is why equal sections are not just what was asked
   for but also the width-optimal split: widening the middle only starves the
   right by the same amount.

   Margins at the shipped scale: the balance clears its column by 2.4px at 320px
   (the app's enforced minimum width — see `min-width: 320px` on body in
   main.css) and by ~3px from 360px up; the point figure by 3.2–5.2px. The
   username is the one value allowed to ellipsise, so it is excluded from the fit
   — an all-caps 9-character name truncates by design. If either maximum grows a
   digit, this scale has to come down: the digit count is the input here.

   The bar's own padding (was 10–16px) and column gaps (was 6–8px) were trimmed
   to pay for the equal split, and it still costs the figure ~1.2px against the
   previous four-column layout: 11.7px at 360px (was 12.9px), 13.4px at 412px
   (was 15px), with the 15px ceiling now reached at ~461px. That is the price of
   a 억 balance never clipping, which is the requirement.

   Suffix and icon sizes are DERIVED from the figure rather than getting their
   own clamp()s. Three independent lines drifted apart at the ends of the range,
   which is exactly where the fit has to hold; off one variable the whole bar
   scales as one system and the tuning stays a single number. */
/* The bar's clearance from the screen edges and from the banner below. Fluid
   like everything else here, so the inset shrinks with the phone rather than
   eating a fixed 24px of a 320px screen — the figures inside are competing for
   that same width.

   No clearance at the top: the bar sits flush against the header so the two read
   as one piece of chrome, with the gap only below it separating the pair from
   the content that follows. */
.mub-wrap {
  padding-inline: clamp(6px, 2.2vw - 1px, 12px);
  padding-block: 0 clamp(6px, 2.2vw - 1px, 12px);
}

.mub-bar {
  --mub-figure: clamp(10px, 3.25vw, 15px);
  --mub-suffix: calc(var(--mub-figure) * 0.85);
  --mub-icon: calc(var(--mub-figure) * 1.1);
  --mub-gap: clamp(2px, 1.1vw - 1px, 4px);

  column-gap: clamp(4px, 1.7vw - 2.1px, 6px);
  padding-inline: clamp(8px, 3.3vw - 3.9px, 12px);
}

/* Gap between the point figure and the reload button — the same value as the
   gap between sections, so the right group reads as part of the same rhythm
   rather than a tighter cluster. */
.mub-actions {
  gap: clamp(4px, 1.7vw - 2.1px, 6px);
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

/* The wallet coin, one pixel up on the same fluid scale. Expressed off
   `--mub-icon` rather than as its own clamp() so it tracks the scale instead of
   drifting from the point icon at the ends of the range. */
.mub-icon-wallet {
  width: calc(var(--mub-icon) + 1px);
  height: calc(var(--mub-icon) + 1px);
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
