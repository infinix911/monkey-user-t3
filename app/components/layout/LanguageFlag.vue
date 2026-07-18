<template>
  <svg
    :viewBox="`0 0 60 40`" xmlns="http://www.w3.org/2000/svg"
    preserveAspectRatio="xMidYMid slice" :aria-label="code" role="img">
    <!-- USA -->
    <g v-if="code === 'en'">
      <rect width="60" height="40" fill="#B22234" />
      <rect y="3.08" width="60" height="3.08" fill="#fff" />
      <rect y="9.23" width="60" height="3.08" fill="#fff" />
      <rect y="15.38" width="60" height="3.08" fill="#fff" />
      <rect y="21.54" width="60" height="3.08" fill="#fff" />
      <rect y="27.69" width="60" height="3.08" fill="#fff" />
      <rect y="33.85" width="60" height="3.08" fill="#fff" />
      <rect width="24" height="21.54" fill="#3C3B6E" />
    </g>
    <!-- Indonesia -->
    <g v-else-if="code === 'id'">
      <rect width="60" height="20" fill="#E70011" />
      <rect y="20" width="60" height="20" fill="#fff" />
    </g>
    <!-- South Korea -->
    <g v-else-if="code === 'ko'">
      <rect width="60" height="40" fill="#fff" />
      <clipPath :id="krId">
        <circle cx="30" cy="20" r="9" />
      </clipPath>
      <g :clip-path="`url(#${krId})`">
        <rect x="21" y="11" width="18" height="9" fill="#CD2E3A" />
        <rect x="21" y="20" width="18" height="9" fill="#0047A0" />
        <circle cx="25.5" cy="20" r="4.5" fill="#CD2E3A" />
        <circle cx="34.5" cy="20" r="4.5" fill="#0047A0" />
      </g>
    </g>
    <!-- Thailand -->
    <g v-else-if="code === 'th'">
      <rect width="60" height="6.67" fill="#A51931" />
      <rect y="6.67" width="60" height="6.67" fill="#F4F5F8" />
      <rect y="13.33" width="60" height="13.33" fill="#2D2A4A" />
      <rect y="26.67" width="60" height="6.67" fill="#F4F5F8" />
      <rect y="33.33" width="60" height="6.67" fill="#A51931" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { useId } from "vue";

defineProps<{ code: "en" | "id" | "ko" | "th" }>();

const krId = `kr-clip-${useId()}`;
</script>
