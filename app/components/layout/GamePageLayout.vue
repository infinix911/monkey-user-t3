<template>
  <div :class="['flex flex-col font-sans mt-0']">
    <div class="relative flex w-full justify-center pb-8">
      <!-- Center vertical gradient overlay -->
      <div v-if="(!gameSectionBgEnabled && !hasMainBackground)"
        class="hidden lg:block absolute inset-y-0 left-1/2 -translate-x-1/2 z-10 pointer-events-none max-w-[1200px]"
        style="background: linear-gradient(270deg, rgba(0,0,0,0) 0%, #000000 50%, rgba(0,0,0,0) 100%);" />

      <div class="game-page-bg relative z-20 flex w-full flex-col items-center px-1.5 lg:px-0"
        :class="{ 'game-page-bg--solid': hasMainBackground }"
        :style="{ '--game-page-bg': gamePageBg }">
        <!-- Background blur layer (hidden on providers page) -->
        <div v-if="!isProvidersPage && !gameSectionBgEnabled && !hasMainBackground"
          class="hidden lg:block w-full min-h-full absolute top-0 left-0" style="
            background: rgba(0, 0, 0, 0.45);
            filter: blur(25.149999618530273px);
          " />

        <!-- Games Container -->
        <div
          :class="['w-full pt-0 pb-8 relative z-[100] px-0 lg:px-3 lg:px-2.5', !gameSectionBgEnabled ? 'xl:px-2' : 'xl:px-0']">
          <slot />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const siteConfig = useSiteConfig();
const route = useRoute();
const pathname = computed(() => route.path);
const gameSectionBgEnabled = computed(
  () => siteConfig.assets.homepage.gameSectionBg.enabled || true,
);
// Brands that set a full-page background image (assets.images.mainBackground)
// want the centered game column to sit on a solid bodyBgColor panel rather
// than letting the busy page image show through it on desktop. Driven by the
// site/config theme — no per-brand slug hardcoding.
const hasMainBackground = computed(
  () => !!siteConfig.assets.images.mainBackground,
);

/**
 * The game column's background: `theme.bodyBgColor` at 90% opacity, so a little
 * of the page background reads through the column instead of it being a fully
 * opaque panel. Mixed here rather than at each `background-color` in the
 * stylesheet, so the mobile fill and the desktop `--solid` fill cannot drift
 * apart. `color-mix` takes the CMS colour in whatever form it ships (hex/rgba).
 */
const gamePageBg = computed(
  () => `color-mix(in srgb, ${siteConfig.theme.bodyBgColor} 90%, transparent)`,
);

// Check page types
const isProvidersPage = computed(
  () => pathname.value?.startsWith("/providers/") || false,
);
</script>

<style scoped>
/* Mobile/iPad-portrait: bodyBgColor at 90% opacity fills the container (see
   `gamePageBg`). Desktop + iPad-landscape (>=1024px): fully transparent so the
   page background image shows through. Done via CSS var + media query because
   an inline :style would override any Tailwind lg: utility. */
.game-page-bg {
  background-color: var(--game-page-bg);
}

@media (min-width: 1024px) {
  .game-page-bg {
    background-color: transparent;
  }

  /* Brands with a full-page background image keep the solid bodyBgColor game
     column on desktop instead of letting that image show through. */
  .game-page-bg.game-page-bg--solid {
    background-color: var(--game-page-bg);
  }
}
</style>
