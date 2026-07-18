<template>
  <div class="flex flex-col">
    <span class="text-white/45 text-[10px] uppercase tracking-wider font-bold">{{ label }}</span>
    <span class="text-white font-bold text-[13px] tabular-nums">{{ value }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number }>();
</script>
