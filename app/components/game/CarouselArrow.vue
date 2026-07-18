<template>
  <button
    type="button"
    class="absolute top-2 bottom-2 flex items-center z-20 cursor-pointer"
    :class="
      direction === 'left'
        ? 'left-0 justify-end -ml-1 pr-2'
        : 'right-0 justify-end -mr-1 pr-2'
    "
    :style="buttonStyle"
    :aria-label="direction === 'left' ? 'Scroll left' : 'Scroll right'"
    @click="$emit('click')">
    <svg
      viewBox="0 0 20 34" fill="none" xmlns="http://www.w3.org/2000/svg" width="20" height="28"
      aria-hidden="true" class="inline-block object-contain"
      style="filter: drop-shadow(1px 1px 0.5px rgba(0,0,0,0.5));">
      <path
        d="M2.5 2.5L15.5 15.8091L2.5 29.1181" stroke="white" stroke-width="5" stroke-linecap="round"
        stroke-linejoin="round" />
    </svg>
  </button>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{ direction: "left" | "right" }>();
defineEmits<{ click: [] }>();

// Shared gradient fade; the left arrow mirrors the chevron via scaleX(-1).
// Both arrows nudge in by the same 3px so their edge padding/margin matches.
const BASE_STYLE =
  "width: 60px; background-image: linear-gradient(to right, rgba(0,0,0,0) 0%, rgba(0,0,0,0.6) 68.5%, rgba(0,0,0,0.6) 100%); background-size: 100% 100%; background-repeat: no-repeat; background-position: right center; border: none; outline: none;";

const buttonStyle = computed(() =>
  props.direction === "left"
    ? `${BASE_STYLE} transform: scaleX(-1); left: 3px;`
    : `${BASE_STYLE} right: 3px;`,
);
</script>
