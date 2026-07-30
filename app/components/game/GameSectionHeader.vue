<template>
  <!-- Vertical rhythm lives here rather than on the pages: the bar is the only
       thing every section has in common, so spacing it once keeps the homepage's
       stacked sections and the dedicated pages identical. More space above than
       below, so the bar reads as belonging to the row it introduces rather than
       floating between two. GameCarousel's own `py-1` adds 4px on each side. -->
  <div class="game-section-bar relative z-10 w-full h-8 md:h-[45px] flex items-center px-4 mt-4 mb-2 md:mt-6 md:mb-3"
    :style="{ background: siteConfig.theme.sectionHeader.gradient }">
    <!-- Icon and label are sized off the bar height (~58% and ~40% of it), so
         the pair keeps the reference proportions at both breakpoints instead of
         the icon crowding the bar. Label is regular weight, not bold, and the
         group is set in Inter. -->
    <div class="font-inter flex items-center gap-2 md:gap-3 text-white">
      <NavIcon :name="name" tight class="h-[19px] md:h-[26px] w-auto" />
      <!-- The two labels are baseline-aligned, not box-centred: in the
           reference the Latin subtitle sits on the same baseline as the
           localised title despite being the smaller of the two. -->
      <span class="flex items-baseline gap-2 md:gap-3">
        <span class="font-normal uppercase leading-none text-sm md:text-lg tracking-tight">{{ label }}</span>
        <!-- Latin subtitle — see `latinLabel`. Set in a flat neutral grey, not
             white-at-opacity, which over the orange band would read warm rather
             than grey. Size is a deliberate step ABOVE the reference render:
             that render puts the subtitle at ~0.69 of the title (cap height 11px
             against 16px of hangul ink, in a capture whose bar is 60px), which
             works out the same as the 12px this started at — but it read too
             small on the real page. 16px against the 18px title is as close as
             the two can sit before the subtitle stops reading as subordinate. -->
        <!-- Nudged down 1px on top of the baseline alignment: the title renders
             in a system hangul fallback (Inter ships no hangul) whose baseline
             sits fractionally below Inter's, so the two are flush by CSS but
             read as misaligned. Measured off the reference at ~1px. -->
        <span v-if="latinLabel"
          class="relative top-[2px] font-normal uppercase leading-none text-[13px] md:text-[16px] tracking-wide text-[#B5B5B5]">{{
            latinLabel }}</span>
      </span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import NavIcon from "~/components/navigation/NavIcon.vue";

const props = defineProps<{ name: string; label: string }>();

const siteConfig = useSiteConfig();

/**
 * The Latin word each section is set beside its localised title, keyed by the
 * same `name` the icon uses. Design content rather than copy: it is always this
 * word, in every locale, so it is NOT read from the i18n bundles — that would
 * both couple the subtitle to translatable nav copy and depend on the `en`
 * messages being loaded while the UI runs in another language (locales are
 * lazy). A section with no entry here simply renders no subtitle.
 */
const LATIN_SUBTITLES: Record<string, string> = {
  hot: "HOT",
  slots: "SLOT",
  casino: "CASINO",
  sports: "SPORTS",
  mini: "MINI",
};

/**
 * The subtitle to render, or "" for none. It is dropped whenever the localised
 * title already reads as that same word — which is what makes the English UI
 * show a single title while Korean shows the pair, without the component
 * needing to know which locale is active.
 */
const latinLabel = computed<string>(() => {
  const latin = LATIN_SUBTITLES[props.name];
  if (!latin) return "";
  return props.label.trim().toUpperCase() === latin ? "" : latin;
});
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
.sr-only+.game-section-bar {
  margin-top: 9px;
}
</style>
