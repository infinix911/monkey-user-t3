<template>
  <!-- Single-copy scrolling ticker: the message enters from the right, scrolls
       fully off the left, then loops (shows the message once per cycle). Fills
       the available bar width so the padding-led entrance covers the whole bar. -->
  <div
    ref="viewport"
    class="relative flex flex-1 items-center justify-start overflow-hidden min-w-0 w-full py-1 px-2 md:px-4">
    <div
      v-if="hasText"
      ref="track"
      class="announce-scroll whitespace-nowrap font-black leading-normal"
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

const textStyle = computed(() => ({
  letterSpacing: '0.5px',
  WebkitTextStroke: `0.6px ${props.textStroke}`,
  WebkitTextFillColor: props.textFill,
  fontWeight: 700,
}));

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
