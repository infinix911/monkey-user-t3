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
    <div
      class="mub-bar w-full h-[40px] grid grid-cols-[fit-content(40%)_minmax(max-content,1fr)_minmax(max-content,auto)] items-center overflow-hidden whitespace-nowrap rounded-[10px]"
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

    <!-- SECTION 2. Wallet balance, centred in the lane that takes the row's
         slack. `min-w-0` on the figure is what makes `truncate` work at all: a
         flex child defaults to `min-width: auto`, so without it the span refuses
         to shrink below its text and pushes into the neighbouring section
         instead of ellipsising. -->
    <span class="mub-group flex items-center min-w-0 max-w-full justify-self-center overflow-hidden">
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
      <NuxtImg :src="siteConfig.assets.navIcons.walletIcon" alt="" aria-hidden="true" width="51" height="51"
        class="mub-icon object-contain shrink-0 rounded-full" />
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
         column each so the reload stays at the screen edge, where the thumb
         expects it. -->
    <div class="mub-actions flex items-center min-w-0 max-w-full justify-self-end overflow-hidden">
      <!-- The point figure IS the conversion control, as on desktop. No separate
           CONVERT button beside it: clicking the amount opens the modal. -->
      <button type="button" :aria-label="$t('point.title')"
        class="mub-group flex items-center min-w-0 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
        @click="openPointModal">
        <NuxtImg :src="siteConfig.assets.navIcons.pointIcon" alt="" aria-hidden="true" width="51" height="51"
          class="mub-icon object-contain shrink-0 rounded-full" />
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

   The coefficients are MEASURED in the app's own font, not picked by eye. The
   widest value sets the type scale for the whole bar. The two contended
   sections are the balance lane (wallet icon + a 9-digit balance + the unit)
   and the trailing group (point icon + an 8-digit figure + the reload button);
   they measure within ~2px of each other, so one scale serves both.

   LINE Seed has NO tabular figures, so `tabular-nums` is a no-op in the shipped
   font (it only bites in the system-ui fallback) and digit widths VARY: at 15px
   a `0` advances 10.0px against a `1`'s 6.5px. The worst case is therefore not
   `999,999,999` but a balance full of zeros. Both sections were rendered with
   all-zero values across 320-768px and their natural width compared against the
   track they land in; the line below is the largest scale that clears both.

   Because identity is content-sized rather than a fixed third, the budget moves
   with the USERNAME: a 9-character name clears at 13.6px on a 360px phone, a
   13-character one at 12.3px. The scale runs 13.1px there and 15.0px at 412px,
   about 0.5px under the 9-character ceiling at every width - deliberately close
   to it, because the request was for the largest type the row can hold. The
   ceiling is 17px rather than 15px: from 467px up the row measures more than
   that, so the old 15px cap was leaving size unused on wider phones.

   The cost is at the long-name end: past ~12 characters the balance reaches its
   ellipsis before the username does. That is the trade the content-sized
   identity track buys - most rows read bigger, the rare long-name row gives
   some back - and it is why the scale cannot simply be raised further without
   either capping identity harder or letting a 억 balance shorten. Dropping the leading padding bought ~2.7px of clearance per
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
  padding-inline: clamp(6px, 2.2vw - 1px, 12px);
  padding-block: 0 clamp(6px, 2.2vw - 1px, 12px);
}

.mub-bar {
  --mub-figure: clamp(11.5px, 3.66vw - 0.1px, 17px);
  --mub-suffix: calc(var(--mub-figure) * 0.85);
  --mub-icon: var(--mub-figure);
  --mub-gap: clamp(2px, 1.1vw - 1px, 4px);

  column-gap: clamp(4px, 1.7vw - 2.1px, 6px);
  /* Symmetric again. It ran 0 on the leading side for a while, so the username
     started flush against the bar's edge; that read as the text falling out of
     the pill rather than sitting inside it, and it pushed the balance off the
     bar's visual centre because the padding box was lopsided. Both sides pay
     the same now, and the balance centres on the bar's own centre line. */
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

   1.3em draws the mark at ~11.3px at the shipped scale, between the digits'
   9.5px of ink and the discs' 13px. Both ends were tried against the real bar:
   1.5em matches the discs exactly and towers over the row, 1.1em matches the
   digits exactly and disappears next to them - a thin open arc carries far less
   weight than bold numerals of the same height, so measuring equal and looking
   equal part company here. This sits where it reads level.

   The multiplier encodes the padding in THAT file. Replace the asset with a
   tighter crop and this has to come down with it. */
.mub-reload-icon {
  width: calc(var(--mub-figure) * 1.3);
  height: calc(var(--mub-figure) * 1.3);
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
