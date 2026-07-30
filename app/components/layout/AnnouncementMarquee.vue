<template>
  <!-- Single-copy scrolling ticker: the message enters from the right, scrolls
       fully off the left, then loops (shows the message once per cycle). Fills
       the available bar width so the padding-led entrance covers the whole bar. -->
  <div
    ref="viewport"
    class="relative flex flex-1 items-center justify-start overflow-hidden min-w-0 w-full py-1 px-2 md:px-4">
    <!-- No font-weight utility on the track: `textStyle` owns the weight, since
         it depends on whether an outline is being painted. -->
    <div
      v-if="hasText"
      ref="track"
      class="announce-scroll whitespace-nowrap leading-normal"
      :class="sizeClass"
      :style="[textStyle, { animationDuration: duration }]">
      {{ text }}
    </div>
  </div>
</template>

<script setup lang="ts">
const props = defineProps<{
  /** The announcement message. */
  text: string;
  /** Tailwind text-size classes for this surface (desktop vs mobile differ). */
  sizeClass: string;
  /** Stroke (outline) colour of the text. */
  textStroke: string;
  /** Fill colour of the text. */
  textFill: string;
}>();

/** Scroll speed in px/s — keeps the pace steady regardless of message length. */
const SPEED = 60;

const viewport = ref<HTMLElement | null>(null);
const track = ref<HTMLElement | null>(null);
const duration = ref('20s');

const hasText = computed(() => !!props.text && props.text.trim().length > 0);

/** An empty/blank stroke colour means "no outline" — not a 0.6px blank stroke. */
const hasStroke = computed(
  () => !!props.textStroke && props.textStroke.trim().length > 0,
);

const textStyle = computed(() => {
  const base = {
    // Noto Sans for the ticker; LINE Seed backs it for Korean/Thai glyphs the
    // latin-subset Noto file doesn't carry.
    fontFamily: '"Noto Sans", "LINE Seed", system-ui, sans-serif',
    letterSpacing: '0.5px',
  };

  // Without an outline the text is painted as a plain colour — using the
  // stroke/text-fill pair here would leave `-webkit-text-fill-color` overriding
  // `color` for no reason and can render an invisible hairline in some engines.
  // The weight drops with the outline: 700 exists only to survive the stroke
  // (see below), and an unstroked 700 ticker just reads as heavy.
  if (!hasStroke.value) {
    return { ...base, fontWeight: 500, color: props.textFill };
  }

  return {
    ...base,
    // Bold: at ticker sizes a 0.6px outline eats most of a 400-weight glyph,
    // which reads as a dark smudge rather than as the fill colour.
    fontWeight: 700,
    WebkitTextStroke: `0.6px ${props.textStroke}`,
    WebkitTextFillColor: props.textFill,
  };
});

function measure() {
  const t = track.value;
  if (!t) return;
  // offsetWidth = padding-left (one viewport width) + text width = the exact
  // distance translateX(-100%) travels. Scale duration by it for steady speed.
  const distance = t.offsetWidth;
  if (distance <= 0) return;
  duration.value = `${Math.max(6, distance / SPEED)}s`;
}

let ro: ResizeObserver | null = null;

onMounted(() => {
  nextTick(measure);
  if (typeof ResizeObserver !== 'undefined') {
    ro = new ResizeObserver(() => measure());
    if (viewport.value) ro.observe(viewport.value);
  }
});

watch(() => props.text, () => nextTick(measure));

onBeforeUnmount(() => ro?.disconnect());
</script>
