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
       The username sits at the leading edge and the balance is CENTRED in the
       lane that takes the row's slack. The point figure and the reload button
       share the trailing section as one flush-right group, so the reload stays
       at the screen edge where the thumb expects it.
       The sections are NOT equal thirds. They were, and equal thirds is the
       right division for the worst case - the balance and the points+reload
       group need within a pixel of the same width. But most rows are not the
       worst case: a short username left a third of the bar empty while the
       balance beside it, capped at its own third, truncated to fit. So identity
       sizes to its content (`fit-content(40%)`), the balance lane takes what is
       left (`1fr`) and the points group sizes to its content too.

       BOTH number tracks carry a `max-content` MINIMUM. That is what decides
       who gives way when the row is over-subscribed: a track cannot be squeezed
       below its minimum, so the two figures hold their full width and the only
       track left able to shrink is identity, which ellipsises. Without those
       floors the balance was the thing that shortened - a 13-character username
       beside a 9-digit balance and a 9-digit point figure rendered as
       `100,0...` while the name sat there in full, which is backwards: a
       clipped name is still recognisable, a clipped number misreads.

       Identity's cap is on the TRACK, not a `max-w` on the span: a percentage
       max-width on a grid item resolves against its own content-sized area and
       feeds back on itself, which collapses every username to one character.

       SIZING is fluid, and it is load-bearing rather than cosmetic. The widest
       realistic value sets the type scale for the whole bar. Worst case is a
       억-scale balance (`999,999,999 원`, 9 digits) in the middle and
       an 8-digit point figure plus the reload button on the right; those two
       measure within a pixel of each other, so one scale satisfies both (the
       derivation is in the style block). Rather than stepping down at a
       breakpoint — either too small on the wide side of the step or still too
       big on the narrow side — every dimension scales with the viewport via
       clamp(), so the type stays as large as the width allows at any size.
       40px tall. It was 36px, echoing the announcement bar, then 44px; the
       announcement bar is not adjacent (it sits below the banner and scrolls
       away, while this is pinned under the header), so the echo was not
       carrying its weight, and 44px left the values swimming in the pill once
       the type came up. 40px still gives the two controls inside the bar, the
       point figure and the reload, a usable touch box. The layout measures this
       bar with `offsetHeight` for its spacer, so the height is not duplicated
       anywhere. -->
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
    <!-- SCALING. The bar sizes itself to its CONTENTS, not only to the viewport.
         The clamp() below sets what the width affords; `--mub-scale` then takes
         away whatever the values still do not fit in, and every dimension here
         derives from `--mub-figure`, so the bar shrinks as one system.

         Without it the `max-content` floors on both number tracks hand the whole
         shortfall to the username, which is measured at roughly 6 characters at
         360px and 2 at 320px — `USERTESTING1` rendered as `U…` identifies
         nobody. Scaling spends a little type size to keep the name whole, and
         only once the values genuinely do not fit; ordinary rows never scale and
         look exactly as they did.

         Ported from the partner console's `AccountBar.vue`, which carries the
         same test — the two bars are meant to read alike. -->
    <div
      ref="barEl"
      class="mub-bar w-full h-[40px] grid grid-cols-[fit-content(40%)_minmax(max-content,1fr)_minmax(max-content,auto)] items-center overflow-hidden whitespace-nowrap rounded-[10px]"
      :style="{ backgroundColor: BAR_BG, '--mub-scale': String(scale) }">
    <!-- SECTION 1. Identity, centred in its third. `honorific` is the Korean
         "님" suffix; locales without an equivalent ship an empty string, so the
         element is dropped entirely rather than rendering a stray space. The
         username is the only part allowed to truncate — every other value is a
         figure that must stay readable in full. `max-w-full` keeps the centred
         item inside its column so the truncation actually engages. -->
    <span
      ref="identityEl"
      class="flex items-baseline gap-0.5 min-w-0 max-w-full justify-self-center overflow-hidden">
      <span ref="nameEl" class="mub-figure min-w-0 font-bold uppercase leading-none truncate"
        :title="authStore.user.username"
        :style="{ color: ACCOUNT_BAR_COLORS.username }">{{ authStore.user.username }}</span>
      <span v-if="honorific" class="mub-suffix text-white leading-none shrink-0">{{ honorific }}</span>
    </span>

    <!-- SECTION 2. Wallet balance, centred in the lane that takes the row's
         slack. `min-w-0` on the figure is what makes `truncate` work at all: a
         flex child defaults to `min-width: auto`, so without it the span refuses
         to shrink below its text and pushes into the neighbouring section
         instead of ellipsising. -->
    <span ref="walletEl" class="mub-group flex items-center min-w-0 max-w-full justify-self-center overflow-hidden">
      <!-- Both value icons run at the figure's own size, the coin included.
           Matches the partner console's account bar.

           `width/height` state the ART's own 51px, not the ~13px it renders at:
           the image pipeline emits a raster at the declared size, and a 51px
           circle resampled down to 15px lost its curve - the edge went
           polygonal and the two icons, declared 15 and 16, did not even go
           polygonal the same way. Declaring the native size hands the browser
           the full-resolution circle to scale, which it does smoothly at any
           DPR. `rounded-full` then clips the box to a circle so the silhouette
           is exact whatever the raster does; both assets are already perfect
           inscribed circles (checked row by row against the ideal), so the clip
           only cleans up edge antialiasing - it is not reshaping the art. -->
      <img :src="siteConfig.assets.navIcons.walletIcon" alt="" aria-hidden="true" width="51" height="51"
        class="mub-icon object-contain shrink-0 rounded-full" />
      <!-- Figure alone: the "원" that used to follow it was dropped by
           request, so there is no second size to align a baseline against. -->
      <span class="mub-group flex items-baseline min-w-0 overflow-hidden">
        <span ref="walletFigureEl" class="mub-figure min-w-0 font-bold tabular-nums leading-none truncate"
          :style="{ color: ACCOUNT_BAR_COLORS.wallet }">{{
            currency.formatNumber(authStore.user.wallet) }}</span>
      </span>
    </span>

    <!-- SECTION 3. Point balance and wallet reload, as one group flush against
         the trailing edge of the bar. They share a section rather than owning a
         column each so the reload stays at the screen edge, where the thumb
         expects it. -->
    <div ref="actionsEl" class="mub-actions flex items-center min-w-0 max-w-full justify-self-end overflow-hidden">
      <!-- The point figure IS the conversion control, as on desktop. No separate
           CONVERT button beside it: clicking the amount opens the modal. -->
      <button type="button" :aria-label="$t('point.title')"
        class="mub-group flex items-center min-w-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
        @click="openPointModal">
        <img :src="siteConfig.assets.navIcons.pointIcon" alt="" aria-hidden="true" width="51" height="51"
          class="mub-icon object-contain shrink-0 rounded-full" />
        <span ref="pointFigureEl" class="mub-figure min-w-0 font-bold tabular-nums leading-none truncate"
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
        <img :src="siteConfig.assets.navIcons.refreshIcon" alt="" aria-hidden="true" width="18" height="18"
          class="mub-reload-icon mobile-user-bar-icon-light object-contain" />
      </button>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

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

// No unit is printed after the balance — the figure stands alone. It used to
// carry "원" (or the currency's symbol where a locale supplied none), which was
// dropped by request.

/**
 * The smallest the bar may render, as a fraction of the size the width affords.
 *
 * 0.7 of the 13-15px clamp is 9-10.5px. Below that a balance stops being
 * readable, and shrinking further to keep a username whole trades the value
 * being read for the one that merely labels it — past the floor the username
 * truncates instead, which is what the `max-content` floors on the number
 * tracks already arrange.
 */
const MIN_SCALE = 0.7;

/** How much of the afforded size the row is rendering at, as `--mub-scale`. */
const scale = ref(1);

const barEl = ref<HTMLElement | null>(null);
const identityEl = ref<HTMLElement | null>(null);
const nameEl = ref<HTMLElement | null>(null);
const walletEl = ref<HTMLElement | null>(null);
const walletFigureEl = ref<HTMLElement | null>(null);
const actionsEl = ref<HTMLElement | null>(null);
const pointFigureEl = ref<HTMLElement | null>(null);

/**
 * What a section needs, as opposed to what it was given.
 *
 * Each section holds one truncating figure and is `overflow: hidden`, which
 * makes it a scroll container — so its own `scrollWidth` reports the width it
 * was squeezed to, never the width it wants, and asking it directly would say
 * everything fits at the exact moment it stopped fitting. The clipped figure is
 * the one element that still knows: `scrollWidth` on a truncated span is its
 * full text width. Swapping the figure's rendered width for its intrinsic one
 * turns the section's laid-out width back into its natural one, since every
 * other part of a section is `shrink-0`.
 */
const sectionNeed = (section: HTMLElement | null, figure: HTMLElement | null): number => {
  if (!section || !figure) return 0;
  return section.scrollWidth - figure.clientWidth + figure.scrollWidth;
};

/**
 * How much of the afforded size fits, between {@link MIN_SCALE} and 1.
 *
 * Padding and the column gap are read from the computed style rather than
 * mirrored as constants, so the clamp()s in the style block stay the single
 * definition of the bar's spacing. The gaps are netted off both sides first:
 * they are fixed pixels that do not shrink with the type, so a ratio taken over
 * the whole row would ask the text to cover width no amount of scaling reclaims.
 */
const fitScale = (): { scale: number; scalable: number } => {
  const bar = barEl.value;
  if (!bar) return { scale: 1, scalable: 0 };

  const styles = getComputedStyle(bar);
  const available =
    bar.clientWidth -
    parseFloat(styles.paddingInlineStart || "0") -
    parseFloat(styles.paddingInlineEnd || "0");
  const gap = parseFloat(styles.columnGap || "0") || 0;

  const need =
    sectionNeed(identityEl.value, nameEl.value) +
    sectionNeed(walletEl.value, walletFigureEl.value) +
    sectionNeed(actionsEl.value, pointFigureEl.value);

  const room = available - gap * 2;
  if (need <= room) return { scale: 1, scalable: need };
  if (room <= 0) return { scale: MIN_SCALE, scalable: need };
  return { scale: Math.max(MIN_SCALE, room / need), scalable: need };
};

/**
 * Re-size the row: measure at full size, apply, then check the result.
 *
 * Always measures from scale 1 — the ratio is "how much of what we want fits",
 * so asking it of text already reduced would compound on every pass. Fonts are
 * awaited first: measuring against a fallback face sizes the row for metrics it
 * will never render with.
 */
const measureScale = async () => {
  if (typeof window === "undefined") return;
  if (document.fonts?.status !== "loaded") await document.fonts?.ready;

  scale.value = 1;
  await nextTick();

  const fit = fitScale();
  scale.value = fit.scale;
  await nextTick();

  // The forecast is built from measurements taken before the layout it
  // describes existed, and sub-pixel rounding and non-linear glyph advances
  // land where they land. The username absorbs whatever is left over, so if it
  // is still clipped the forecast was short by exactly that width — a measured
  // number, not another estimate. One pass: the residue after it is a fraction
  // of a pixel, and iterating on a value that re-renders the text is how a bar
  // starts to flicker.
  const name = nameEl.value;
  if (name && fit.scalable > 0 && scale.value > MIN_SCALE) {
    const clipped = name.scrollWidth - name.clientWidth;
    if (clipped > 0.5) {
      scale.value = Math.max(MIN_SCALE, scale.value - clipped / fit.scalable);
    }
  }
};

let barObserver: ResizeObserver | null = null;

onMounted(() => {
  void measureScale();

  // Rotation and the `lg` reflow change the row's width without firing anything
  // the watcher below would see. Width only: the bar's height is a flat 40px
  // that the scale never touches, and the layout measures that height for its
  // pin spacer, so height must not become a trigger here.
  if (barEl.value) {
    let lastWidth = barEl.value.clientWidth;
    barObserver = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? lastWidth;
      if (width === lastWidth) return;
      lastWidth = width;
      void measureScale();
    });
    barObserver.observe(barEl.value);
  }
});

onBeforeUnmount(() => {
  barObserver?.disconnect();
  barObserver = null;
});

// Everything that changes how wide the row's contents are: the balances, the
// name, and the locale-dependent honorific and unit.
watch(
  [
    () => authStore.user.username,
    () => authStore.user.wallet,
    () => authStore.user.point_wallet,
    honorific,
  ],
  () => void measureScale(),
);

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
/* SCALE, set by parity with the desktop bar rather than by the fit.
   AppHeader's `hidden lg:flex` account bar runs a flat 15px figure with a 13px
   suffix, and this is its small-screen twin, so it ends at the same numbers: the
   ceiling is 15px and the suffix ratio is 13/15 = 0.867, not a rounded 0.85.
   Both bars are `font-bold uppercase leading-none` in the inherited LINE Seed
   already, so size was the only thing that ever differed.

   4.2vw reaches that 15px ceiling at 357px, which is under every current phone
   width (360, 375, 390, 412, 428), so in practice a phone renders the desktop
   size. The clamp still steps down below that, to a 13px floor, because the
   narrow end cannot carry 15px without eating the username alive - see below.

   WHAT PAYS FOR IT is the username, by design (see the grid comment): both
   number tracks carry a `max-content` minimum so neither figure can be squeezed,
   and identity is the only track left able to shrink. Measured against the worst
   case - a 9-digit balance and an 8-digit point figure, in the zeros that are
   LINE Seed's widest digits - the username track is left roughly 6 characters at
   360px, 11 at 412px, and 2 at 320px, which is why the floor exists. Ordinary
   balances leave it the whole width. That trade is deliberate: a shortened name
   is still recognisable, and it carries the full one in its `title`, while a
   shortened number just misreads. Dropping the leading padding bought ~2.7px of clearance per
   section rather than a bigger figure — the scale is left where it is so the
   fit keeps a margin for the font's uneven digit widths.

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
  /* 4px flat, which is what the partner console's header holds its bar off the
     screen edge by (`px-1`). It was a clamp up to 12px; the figures inside are
     competing for that width and the widest phone has no more slack than the
     narrowest once a long username is in play. The vertical clearance below
     keeps its clamp — nothing competes for it. */
  padding-inline: 4px;
  padding-block: 0 clamp(6px, 2.2vw - 1px, 12px);
}

.mub-bar {
  /* 15.7px, by request — and the partner console's phone bar is set to the
     same number, so the two still read alike. It was 16px. Icons follow the
     figure and the suffix stays 0.875 of it, so both move with this one
     number.

     The viewport clamp that used to set this is gone. It existed to fit narrow
     screens, which is the job `--mub-scale` now does from measurement rather
     than from a width guess: a 320px phone showing short balances no longer
     pays the narrow-screen size, and a 412px one showing long balances no
     longer overruns because its width suggested it would not. */
  --mub-figure: calc(15.7px * var(--mub-scale, 1));
  --mub-suffix: calc(var(--mub-figure) * 0.875);
  --mub-icon: var(--mub-figure);
  --mub-gap: 4px;

  column-gap: 4px;
  /* Symmetric again. It ran 0 on the leading side for a while, so the username
     started flush against the bar's edge; that read as the text falling out of
     the pill rather than sitting inside it, and it pushed the balance off the
     bar's visual centre because the padding box was lopsided. Both sides pay
     the same now, and the balance centres on the bar's own centre line. */
  padding-inline: 8px;
}

/* Gap between the point figure and the reload button. The partner console runs
   this pair tighter than its section gap (2px against 4px) so the two read as
   one trailing group rather than a third section, and this follows it. */
.mub-actions {
  gap: 2px;
}

.mub-figure {
  font-size: var(--mub-figure);
}

.mub-suffix {
  font-size: var(--mub-suffix);
}

/* Value icons run at the figure's own size - the em box, not the digits' ink.
   Matching the ink height was tried (0.76em, which is what LINE Seed Bold's
   digits actually measure: a 100px figure inks 76px) and it is the literal
   reading of "same size as the text", but a disc at cap height reads
   undersized next to the numerals - the eye compares the disc's area against
   the digits' overall block, not their ink. At 1em the two sit level and the
   icons carry the same weight as the values they label.

   `align-items: center` lines up BOXES, and the digits' ink is not centred in
   theirs, so the icon lands 0.35px low whatever size it is. The nudge cancels
   exactly that - measured, and it is -0.026em, not the -0.05em this carried
   before, which over-corrected and rode the icons high. */
.mub-icon {
  width: var(--mub-icon);
  height: var(--mub-icon);
  margin-block-start: calc(var(--mub-figure) * -0.026);
}

/* Gap between an icon and its figure, inside a value group. */
.mub-group {
  gap: var(--mub-gap);
}

/* Reload button. Carries the glyph's vertical alignment, and it has to live
   HERE rather than on the image: the button is `place-items-center`, so a
   margin on the image only shrinks the grid area and the icon re-centres inside
   it - a no-op, verified by sweeping it.

   Measured against the point disc's drawn centre in the shipped layout: with
   the `padding-top: 3px` this used to carry, the glyph sat 2.0px low; at
   -0.08em it lands on the disc's centre exactly at 13.1px type and within
   0.5px across 11.5-15px, which is the whole phone range. It drifts about a
   pixel low at the 17px ceiling, where flex centring and the raster's own
   rounding take over and no single multiplier fixes both ends. */
.mub-reload-btn {
  margin-block-start: calc(var(--mub-figure) * -0.08);
}

/* Reload glyph. The art ships on a padded canvas that is only 66.7% ink (48px
   of mark on a 72px square, measured), where the coin and point discs are
   full-bleed - so the box and the drawn mark are two different numbers here and
   the multiplier looks larger than the others for the same result.

   1.5em (1 / 0.667) cancels that padding exactly, drawing the mark at the same
   height as the discs. This file previously ran 1.3em, splitting the difference
   between the discs' height and the digits' ink because a thin open arc carries
   less weight than bold numerals of the same height. The partner console was
   asked for the full 1.5 and now runs it, and these two bars are meant to
   match — so if the arc reads heavy here, 1.3 is the number to come back to,
   and the partner bar should come back with it.

   The multiplier encodes the padding in THAT file. Replace the asset with a
   tighter crop and this has to come down with it. */
.mub-reload-icon {
  width: calc(var(--mub-figure) * 1.5);
  height: calc(var(--mub-figure) * 1.5);
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
