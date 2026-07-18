<template>
  <!-- Hot-games-style framed thumbnail with the RTP meter + pola INSIDE the
       frame. Natural flow (image then info) so the height fits the content with
       even spacing. Root is the query container so inner sizes scale. -->
  <div class="rtp-card rtp-surface relative group [container-type:inline-size] overflow-hidden"
    :style="{ border: `2.5px solid ${frame.borderColor}`, backgroundColor: frame.bgColor }">
    <!-- Decorative frame band — the SAME dark→orange gradient the Hot Games cards
         use (siteConfig.theme.cardFrame.bandGradient), so the surface matches them
         instead of reading as a flat colour. -->
    <span class="rtp-frame-band" :style="{ background: frame.bandGradient }" aria-hidden="true" />

    <!-- Thumbnail image -->
    <div
      class="relative z-20 mx-auto mt-[3.5cqw] w-[92.5%] aspect-square overflow-hidden flex items-center justify-center"
      style="border-radius: 10%">
      <span v-if="game.game_img && !imgError && !imgLoaded" class="rtp-skeleton" aria-hidden="true" />
      <img v-if="game.game_img && !imgError" ref="imgEl" :src="game.game_img" alt="" loading="lazy"
        class="relative w-full h-full object-cover transition-opacity duration-300"
        :class="imgLoaded ? 'opacity-100' : 'opacity-0'" @load="imgLoaded = true" @error="imgError = true">
      <div v-else class="absolute inset-0 flex items-center justify-center px-2 text-center text-white/40 text-[10px]">
        {{ game.game_name_en }}
      </div>
      <span class="rtp-dim" aria-hidden="true" />
      <span class="rtp-shimmer" aria-hidden="true" />
    </div>

    <!-- Info INSIDE the frame: title + provider + RTP meter + static pola.
         Solid dark backing extends from just under the thumbnail down to the
         bottom of the pola so the white text never sits on the band's bottom
         orange stop — keeps all text legible. The soft top fade blends it into
         the band's transparent mid-section. -->
    <div class="rtp-info relative z-30 flex flex-col gap-[1.6cqw] px-[6%] pt-[2.5cqw] pb-[4cqw]"
      :style="{ '--rtp-info-bg': frame.bgColor }">
      <div class="text-center leading-tight">
        <p class="text-white font-bold truncate" style="font-size: clamp(8px, 7.5cqw, 14px)" :title="game.game_name_en">
          {{ game.game_name_en }}
        </p>
      </div>

      <!-- RTP meter — the value lives INSIDE the bar (no separate label/% row).
           An animated sheen flows across the fill so the bar reads as "live". -->
      <div class="rtp-track relative w-full rounded-full overflow-hidden mt-[5cqw]"
        :style="{ height: 'clamp(16px, 9cqw, 24px)', color: accent }">
        <div class="rtp-fill absolute inset-y-0 left-0 rounded-full"
          :style="{ width: rtp + '%', background: homeGradient }">
          <span class="rtp-flow" aria-hidden="true" />
        </div>
        <span class="rtp-pct absolute inset-0 flex items-center justify-center font-black tabular-nums"
          :style="{ fontSize: 'clamp(9px, 6cqw, 13px)' }">{{ rtp }}%</span>
      </div>

      <!-- Pola panel — random (per-game) spin patterns from the RtpPola pool. -->
      <RtpPola :seed="game.id" :accent="accent" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";

const siteConfig = useSiteConfig();
const frame = computed(() => siteConfig.theme.cardFrame);

interface Game {
  id: string | number;
  game_name_en: string;
  game_img?: string;
  lobby?: string;
}

const props = defineProps<{ game: Game }>();

const imgError = ref(false);
const imgLoaded = ref(false);
const imgEl = ref<HTMLImageElement | null>(null);
onMounted(() => {
  if (imgEl.value?.complete && imgEl.value.naturalWidth > 0) imgLoaded.value = true;
});

// Bar fill = the home section gradient; accent = its brightest stop.
const homeGradient = computed(() => siteConfig.theme.sectionHeader.gradient);
const accent = computed(() => {
  const hexes = homeGradient.value.match(/#[0-9a-fA-F]{6}/g) ?? [];
  const lum = (h: string) =>
    parseInt(h.slice(1, 3), 16) + parseInt(h.slice(3, 5), 16) + parseInt(h.slice(5, 7), 16);
  return [...hexes].sort((a, b) => lum(b) - lum(a))[0] ?? "#FFB300";
});

// Deterministic pseudo-random RTP (10–96%) from a string seed (FNV-1a), stable
// across SSR/client. Replace with the live RTP value when available.
function seedFromId(id: string | number): number {
  const s = String(id);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// RTP re-rolls every 5 minutes. `bucket` is the current 5-minute window; it stays
// 0 for SSR + the first client paint (so hydration matches), then switches to the
// live window on mount and advances on a timer — giving every card a fresh random
// value each interval.
const RTP_WINDOW_MS = 5 * 60 * 1000;
const bucket = ref(0);
let rtpTimer: ReturnType<typeof setInterval> | undefined;
onMounted(() => {
  const sync = () => {
    bucket.value = Math.floor(Date.now() / RTP_WINDOW_MS);
  };
  sync();
  rtpTimer = setInterval(sync, RTP_WINDOW_MS);
});
onUnmounted(() => clearInterval(rtpTimer));

// 10–96% inclusive (87 possible values).
const rtp = computed(() => 10 + (seedFromId(`${props.game.id}:${bucket.value}`) % 87));
</script>

<style scoped>
.rtp-surface {
  border-radius: 20.32px;
}

@media (max-width: 767px) {
  .rtp-surface {
    border-radius: 15px;
  }
}

.rtp-frame-band {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  border-radius: inherit;
}

/* Solid dark backing behind the title/RTP/pola block. Fades in over the top so
   it blends into the band's transparent mid-section, stays solid behind all the
   text, then fades back out near the very bottom so the band's decorative orange
   stop still shows as a thin strip (matching the top frame) — kept small so it
   sits below the pola text, not behind it. */
.rtp-info {
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--rtp-info-bg) 12%,
    var(--rtp-info-bg) 90%,
    transparent 100%
  );
}

.rtp-dim {
  position: absolute;
  inset: 0;
  z-index: 4;
  pointer-events: none;
  background: #000;
  opacity: 0;
  transition: opacity 0.25s ease;
}

.rtp-card:hover .rtp-dim {
  opacity: 0.18;
}

.rtp-shimmer {
  position: absolute;
  inset: 0;
  z-index: 5;
  pointer-events: none;
  overflow: hidden;
}

.rtp-shimmer::before {
  content: "";
  position: absolute;
  top: -25%;
  left: -75%;
  width: 50%;
  height: 150%;
  transform: skewX(-20deg);
  background: linear-gradient(90deg, rgba(255, 255, 255, 0) 0%, rgba(255, 255, 255, 0.5) 50%, rgba(255, 255, 255, 0) 100%);
  opacity: 0;
}

.rtp-card:hover .rtp-shimmer::before {
  animation: rtp-card-shimmer 2s ease infinite;
}

@keyframes rtp-card-shimmer {
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

.rtp-skeleton {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
  background: linear-gradient(100deg, rgba(255, 255, 255, 0) 30%, rgba(255, 255, 255, 0.35) 50%, rgba(255, 255, 255, 0) 70%);
  background-size: 220% 100%;
  animation: rtp-skeleton 1.4s ease-in-out infinite;
}

@keyframes rtp-skeleton {
  0% {
    background-position: 150% 0;
  }

  100% {
    background-position: -150% 0;
  }
}

/* Flat 2D bar — no inset shadow, gloss, glow or shine sweep; just a flat border
   (colour comes from the theme accent, set inline). */
.rtp-track {
  background: rgba(0, 0, 0, 0.5);
  border: 0.5px solid currentColor;
  overflow: hidden;
}

.rtp-fill {
  overflow: hidden;
  transition: width 0.6s cubic-bezier(0.22, 1, 0.36, 1);
}

/* Flowing sheen that sweeps across the filled portion so the bar looks alive
   (like a loading/progress flow). Bounded by the fill via overflow:hidden. */
.rtp-flow {
  position: absolute;
  inset: 0;
  pointer-events: none;
  background-image: linear-gradient(
    115deg,
    rgba(255, 255, 255, 0) 25%,
    rgba(255, 255, 255, 0.4) 50%,
    rgba(255, 255, 255, 0) 75%
  );
  background-size: 220% 100%;
  animation: rtp-flow 1.8s linear infinite;
}

@keyframes rtp-flow {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* RTP value centred inside the bar, legible over both filled + empty portions. */
.rtp-pct {
  z-index: 3;
  color: #fff;
  letter-spacing: 0.02em;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.9), 0 0 3px rgba(0, 0, 0, 0.7);
}

@media (prefers-reduced-motion: reduce) {
  .rtp-skeleton,
  .rtp-flow {
    animation: none;
  }
}
</style>
