<template>
  <!-- Read-only labeled row used across the partner modals. -->
  <div class="flex flex-col gap-1.5">
    <span class="text-white/55 text-[11px] font-bold uppercase tracking-wider">{{ label }}</span>
    <div class="h-10 flex items-center px-3 rounded-lg bg-white/[0.04] border border-white/10 text-white text-[13px] font-semibold">
      {{ value }}
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ label: string; value: string | number }>();
</script>
