<template>
  <div class="relative z-10 w-full h-8 md:h-[45px] flex items-center px-4"
    :style="{ background: siteConfig.theme.sectionHeader.gradient }">
    <div class="flex items-center gap-2 text-white">
      <NavIcon :name="name" tight class="h-[22px] md:h-[38px] w-auto" />
      <span class="font-bold uppercase leading-none text-lg md:text-2xl tracking-tight">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavIcon from "~/components/navigation/NavIcon.vue";

defineProps<{ name: string; label: string }>();

const siteConfig = useSiteConfig();
</script>
