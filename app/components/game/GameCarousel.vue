<template>
  <div class="relative z-10 w-full" :class="py">
    <div ref="scrollRef"
      class="carousel-scroll w-full overflow-x-auto overflow-y-hidden scrollbar-hide cursor-grab"
      style="scroll-snap-type: x mandatory">
      <div class="carousel-track flex flex-nowrap items-stretch min-w-max" :class="gap">
        <slot />
      </div>
    </div>
    <CarouselArrow v-show="!isAtLeft" direction="left" @click="scrollLeft" />
    <CarouselArrow v-show="!isAtRight" direction="right" @click="scrollRight" />
  </div>
</template>

<style scoped>
/* Each card snaps to the start of the row so swiping (and the arrows) always
   land on a card boundary instead of stopping mid-card. scroll-snap-type is set
   inline on the scroller (Tailwind's snap-* utilities resolved to `none` under
   Tailwind 4); here we mark the slotted items (direct children of the track) as
   snap targets. */
.carousel-track > :deep(*) {
  scroll-snap-align: start;
}
</style>

<script setup lang="ts">
import { ref } from "vue";
import CarouselArrow from "./CarouselArrow.vue";
import { useCarouselScroll } from "~/composables/useCarouselScroll";

const props = withDefaults(
  defineProps<{
    step: number;
    perPage: number;
    py?: string;
    gap?: string;
  }>(),
  { py: "py-1", gap: "gap-1.5" },
);

const scrollRef = ref<HTMLElement | null>(null);
const { isAtLeft, isAtRight, scrollLeft, scrollRight } = useCarouselScroll(
  scrollRef,
  { step: props.step, perPage: props.perPage },
);
</script>
