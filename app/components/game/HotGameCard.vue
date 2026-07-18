<template>
  <div
    class="relative cursor-pointer group [container-type:inline-size]"
    :class="fluid ? 'w-full' : 'flex-shrink-0'"
    :style="fluid ? { aspectRatio: aspect } : { width: '200px', height: '250px' }">
    <!-- Rounded surface — clips the content and carries the corner radius, which
         scales with the card width (container-query units; the root is the query
         container), matching the casino cards. -->
    <div class="hot-surface absolute inset-0 overflow-hidden"
      :style="{ border: `2.5px solid ${siteConfig.theme.cardFrame.borderColor}`, backgroundColor: siteConfig.theme.cardFrame.bgColor }">
    <!-- Thumbnail -->
    <div
      class="absolute left-1/2 -translate-x-1/2 overflow-hidden flex items-center justify-center z-20"
      :style="{ width: '92.5%', height: '74%', top: '4%', backgroundColor: 'transparent', borderRadius: '10%' }">
      <!-- Loading skeleton — animated sweep shown only while the thumbnail
           image is still loading, so an unloaded card reads as "loading"
           rather than "broken". Hidden once the image loads (or if there's
           no art at all). -->
      <span v-if="game.game_img && !imgError && !imgLoaded" class="hot-skeleton" aria-hidden="true" />
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none" aria-hidden="true">
        <svg
          xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"
          stroke-linecap="round" stroke-linejoin="round" class="w-12 h-12 text-white/70">
          <line x1="6" y1="11" x2="10" y2="11" />
          <line x1="8" y1="9" x2="8" y2="13" />
          <circle cx="15" cy="10" r="0.5" fill="currentColor" />
          <circle cx="17" cy="12" r="0.5" fill="currentColor" />
          <path
            d="M2 15.5V8a4 4 0 0 1 4-4h12a4 4 0 0 1 4 4v7.5a2.5 2.5 0 0 1-2.5 2.5h-2.06a2 2 0 0 1-1.66-.88L14.2 14.5H9.8l-1.58 2.62A2 2 0 0 1 6.56 18H4.5A2.5 2.5 0 0 1 2 15.5Z" />
        </svg>
      </div>
      <!-- Plain <img> (no @nuxt/image / IPX): thumbnails come from the game
           provider CDN (e.g. slots.ps9launcher.com), which isn't whitelisted
           for IPX and shouldn't be re-encoded server-side. Opacity (not
           v-show) reveals it on load so a lazy image keeps a layout box and
           can actually intersect the viewport to fetch. -->
      <img
        v-if="game.game_img && !imgError" ref="imgEl" :src="game.game_img" alt=""
        :loading="eager ? 'eager' : 'lazy'" :fetchpriority="priority ? 'high' : undefined" width="185"
        height="185"
        class="relative w-full h-full object-cover transition-opacity duration-300"
        :class="imgLoaded ? 'opacity-100' : 'opacity-0'"
        @load="imgLoaded = true" @error="imgError = true">
      <!-- Hover effects: dim overlay + shimmer sweep (no scale) -->
      <span class="hot-dim" aria-hidden="true" />
      <span class="hot-shimmer" aria-hidden="true" />
      <!-- NEW badge — bottom-right corner of the thumbnail. cqw scales with the
           card width (root has [container-type:inline-size]). -->
      <span
        v-if="game.is_new"
        class="absolute bottom-1 right-1 z-10 rounded-[5px] bg-[#1FBF5C] px-1.5 py-0.5 font-bold uppercase leading-none text-white shadow-md ring-1 ring-black/20"
        style="font-size: clamp(7px, 4cqw, 11px);">
        {{ $t("game.new") }}
      </span>
    </div>

    <!-- Decorative frame — same pure-CSS frame as HomeGameCard (orange
         border on .hot-card + this gradient band). Sits BEHIND the thumbnail
         (z-10); the game image renders on top. Label stays topmost (z-30). -->
    <span class="hot-frame-band" :style="{ background: siteConfig.theme.cardFrame.bandGradient }" aria-hidden="true" />

    <!-- Label area -->
    <div class="absolute left-3 right-3 text-center z-30" style="bottom: 3.5%;">
      <!-- Label scales with card width (container units): 14px at the 191px
           desktop card, smaller as the card shrinks to 3-per-row on mobile,
           capped at [8px, 14px]. -->
      <p
        class="text-white font-bold leading-tight truncate"
        style="font-size: clamp(8px, 7.5cqw, 14px);" :title="game.game_name_en">
        {{ game.game_name_en }}
      </p>
      <p
        v-if="game.lobby"
        class="text-[#b0b0b0] font-medium leading-tight truncate mt-0.5"
        style="font-size: clamp(8px, 7.5cqw, 14px);">
        {{ game.lobby }}
      </p>
    </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const siteConfig = useSiteConfig();

interface Game {
  id: string | number;
  game_name_en: string;
  game_img?: string;
  lobby?: string;
  is_new?: boolean;
}

const imgError = ref(false);
const imgLoaded = ref(false);
const imgEl = ref<HTMLImageElement | null>(null);

// Cached/fast images can finish loading before Vue attaches the `@load`
// listener during hydration, so the event never fires and the opacity reveal
// stays stuck at 0 (invisible despite a fully-loaded image). Sync the flag
// from the element's `complete` state on mount to cover that race.
onMounted(() => {
  if (imgEl.value?.complete && imgEl.value.naturalWidth > 0) imgLoaded.value = true;
});

withDefaults(
  defineProps<{
    game: Game;
    eager?: boolean;
    priority?: boolean;
    // When true the card fills its grid cell and keeps the `aspect` ratio
    // (used by the /mini grid and the homepage hot row). When false (default)
    // it renders at the fixed 200×250 size.
    fluid?: boolean;
    // Fluid aspect ratio. Defaults to the card's native 200:250; the homepage
    // hot row passes 191:240 to match the other game rows' fixed size.
    aspect?: string;
  }>(),
  {
    eager: false,
    priority: false,
    fluid: false,
    aspect: "200 / 250",
  },
);
</script>

<style scoped>
/* Rounded surface — fixed corner radius, matching the casino cards. */
.hot-surface {
  border-radius: 20.32px;
}

/* Smaller corner radius on mobile (the frame band inherits this). */
@media (max-width: 767px) {
  .hot-surface {
    border-radius: 15px;
  }
  .hot-frame-band {
    /* 15px surface radius − 2.5px border = 12.5px inner (padding-box) radius. */
    border-radius: 12.5px;
  }
}

/* Top + bottom dark→orange gradient bands. Gradient injected via
   :style from siteConfig.theme.cardFrame.bandGradient. */
.hot-frame-band {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  /* The band sits at the padding box (inside the 2.5px border), whose corner
     radius is the surface radius minus the border width. Using the full outer
     radius (`inherit`) left the band's corners too round, exposing the dark
     card fill as a gap at each rounded corner. 20.32px − 2.5px = 17.82px. */
  border-radius: 17.82px;
}

/* Dim overlay — darkens the thumbnail slightly on hover. */
.hot-dim {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: #000;
  opacity: 0;
  transition: opacity 0.25s ease;
}
.hot-card:hover .hot-dim {
  opacity: 0.18;
}

/* Shimmer / shine sweep on hover (replaces the previous hover scale). A
   diagonal highlight crosses the thumbnail once, clipped to its rounded box. */
.hot-shimmer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
}
.hot-shimmer::before {
  content: "";
  position: absolute;
  top: -25%;
  left: -75%;
  width: 50%;
  height: 150%;
  transform: skewX(-20deg);
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.5) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  opacity: 0;
}
.hot-card:hover .hot-shimmer::before {
  animation: hot-shimmer 2s ease infinite;
}
@keyframes hot-shimmer {
  0% {
    left: -75%;
    opacity: 0;
  }
  8% {
    opacity: 1;
  }
  40% {
    left: 125%;
    opacity: 0;
  }
  100% {
    left: 125%;
    opacity: 0;
  }
}

/* Loading skeleton — a gentle light sweep over the gray placeholder while
   the thumbnail image is still loading. Sits above the gray box but below
   the controller SVG/image. Subtle and continuous (1.4s). */
.hot-skeleton {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
  background: linear-gradient(
    100deg,
    rgba(255, 255, 255, 0) 30%,
    rgba(255, 255, 255, 0.35) 50%,
    rgba(255, 255, 255, 0) 70%
  );
  background-size: 220% 100%;
  animation: hot-skeleton 1.4s ease-in-out infinite;
}
@keyframes hot-skeleton {
  0% {
    background-position: 150% 0;
  }
  100% {
    background-position: -150% 0;
  }
}
@media (prefers-reduced-motion: reduce) {
  .hot-skeleton {
    animation: none;
  }
}
</style>
