<template>
  <!-- Vertical rhythm lives here rather than on the pages: the bar is the only
       thing every section has in common, so spacing it once keeps the homepage's
       stacked sections and the dedicated pages identical. More space above than
       below, so the bar reads as belonging to the row it introduces rather than
       floating between two. GameCarousel's own `py-1` adds 4px on each side. -->
  <div
    class="game-section-bar relative z-10 w-full h-8 md:h-[45px] flex items-center px-4 mt-4 mb-2 md:mt-6 md:mb-3"
    :style="{ background: siteConfig.theme.sectionHeader.gradient }">
    <!-- Icon and label are sized off the bar height (~58% and ~40% of it), so
         the pair keeps the reference proportions at both breakpoints instead of
         the icon crowding the bar. Label is regular weight, not bold. -->
    <div class="flex items-center gap-2 md:gap-3 text-white">
      <NavIcon :name="name" tight class="h-[19px] md:h-[26px] w-auto" />
      <span class="font-normal uppercase leading-none text-sm md:text-lg tracking-tight">{{ label }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import NavIcon from "~/components/navigation/NavIcon.vue";

defineProps<{ name: string; label: string }>();

const siteConfig = useSiteConfig();
</script>

<style scoped>
/* The top margin above is rhythm BETWEEN rows. On the first bar of a page there
   is no row above it — only the banner (homepage) or the navbar — so the full
   margin reads as a black gap rather than separation. 9px is measured off the
   reference design (banner bottom edge to the top of the bar); keep the two in
   step if that design moves. Two cases: the homepage opens straight with a bar,
   while the dedicated category pages (hot/slots/casino/…) open with an sr-only
   <h1> that takes the :first-child slot without occupying any flow space. */
.game-section-bar:first-child,
.sr-only + .game-section-bar {
  margin-top: 9px;
}
</style>
