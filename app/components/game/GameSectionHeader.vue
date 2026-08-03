<template>
  <!-- Vertical rhythm lives here rather than on the pages: the bar is the only
       thing every section has in common, so spacing it once keeps the homepage's
       stacked sections and the dedicated pages identical. More space above than
       below, so the bar reads as belonging to the row it introduces rather than
       floating between two. GameCarousel's own `py-1` adds 4px on each side. -->
  <!-- Top margin is rhythm BETWEEN rows, so the FIRST bar on a page drops it:
       there is no row above it, only the banner (homepage) or the navbar, and
       the full margin would read as a black gap rather than as separation.
       Below `lg` — where the sidebar rail is hidden (`hidden lg:block` in
       layouts/default.vue) — that first bar sits flush at 0; from `lg`, with
       the rail in play, it takes the 9px measured off the reference design.
       Two cases, hence the second variant: the homepage opens straight with a
       bar, while the category pages (hot/slots/casino/…) open with an sr-only
       <h1> that takes the :first-child slot without occupying any flow space.
       Every breakpoint that sets a top margin has to restate both, since a
       later breakpoint's plain utility would otherwise win. -->
  <div
    class="game-section-bar relative z-10 w-full h-8 md:h-[45px] flex items-center px-4 mb-2 md:mb-3 mt-[14px] first:mt-0 [.sr-only+&]:mt-0 md:mt-6 md:first:mt-0 md:[.sr-only+&]:mt-0 lg:mt-4 lg:first:mt-[9px] lg:[.sr-only+&]:mt-[9px]"
    :style="{ background: siteConfig.theme.sectionHeader.gradient }">
    <!-- Icon + title only, matching banana-jaeisol-t3-nuxt: one bold white
         label, no Latin subtitle beside it. The icon is sized to nearly fill
         the bar (38 of 45px) so the pair reads as a single strong mark. -->
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
