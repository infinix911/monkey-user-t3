<template>
  <!-- Vertical rhythm lives here rather than on the pages: the bar is the only
       thing every section has in common, so spacing it once keeps the homepage's
       stacked sections and the dedicated pages identical. More space above than
       below, so the bar reads as belonging to the row it introduces rather than
       floating between two. GameCarousel's own `py-1` adds 4px on each side. -->
  <div class="relative z-10 w-full h-8 md:h-[45px] flex items-center px-4 mt-4 mb-2 md:mt-6 md:mb-3"
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
