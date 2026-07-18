<template>
  <!-- png: the icon rendered as-is (full colour, no mask/tint). The active
       state is conveyed by the label colour (set on the parent button). -->
  <img
    v-if="type !== 'gif'"
    :src="src"
    :alt="label"
    class="block flex-shrink-0 object-contain"
    :style="{ width: box.w, height: box.h }"
    loading="lazy"
    decoding="async"
  >

  <!-- gif: Lucky-nuxt layout — 3-layer stack (bg tile / border frame / icon),
       no tint, no text label. Hover == active: the bg, border and icon
       crossfade to their active variants (no scale). Each active asset falls
       back to its base, so a brand can override just some layers. Requires the
       parent button to carry the `group` class for the hover crossfade. -->
  <span
    v-else
    role="img"
    :aria-label="label"
    class="relative block flex-shrink-0"
    :style="{ width: box.w, height: box.h, aspectRatio: box.aspectRatio }"
  >
    <!-- background tile (base + active crossfade) -->
    <img
      v-if="menuBg"
      :src="menuBg"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 z-0 h-full w-full object-contain transition-opacity duration-200"
      :class="baseLayerClass"
      loading="lazy"
      decoding="async"
    >
    <img
      v-if="menuBg || activeMenuBg"
      :src="activeMenuBg || menuBg"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 z-0 h-full w-full object-contain transition-opacity duration-200"
      :class="activeLayerClass"
      loading="lazy"
      decoding="async"
    >
    <!-- border frame (base + active crossfade) -->
    <img
      v-if="menuBorder"
      :src="menuBorder"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 z-10 h-full w-full object-contain transition-opacity duration-200"
      :class="baseLayerClass"
      loading="lazy"
      decoding="async"
    >
    <img
      v-if="menuBorder || activeMenuBorder"
      :src="activeMenuBorder || menuBorder"
      alt=""
      aria-hidden="true"
      class="absolute inset-0 z-10 h-full w-full object-contain transition-opacity duration-200"
      :class="activeLayerClass"
      loading="lazy"
      decoding="async"
    >
    <!-- icon (base + active crossfade) -->
    <span
      class="absolute z-20 flex items-center justify-center"
      :style="{ inset: iconInset ?? '3%' }"
    >
      <img
        :src="src"
        :alt="label"
        class="h-full w-full object-contain transition-opacity duration-200"
        :class="baseLayerClass"
        loading="lazy"
        decoding="async"
      >
      <img
        :src="activeSrc || src"
        alt=""
        aria-hidden="true"
        class="absolute inset-0 h-full w-full object-contain transition-opacity duration-200"
        :class="activeLayerClass"
        loading="lazy"
        decoding="async"
      >
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { NavIconsType } from "~/composables/useDefaultThemeConfig";

const props = defineProps<{
  /** Render mode, resolved from `theme.nav.type`. */
  type: NavIconsType;
  /** Per-category icon path (the z-20 layer in `gif`, the mask in `image`). */
  src: string;
  /** `gif`-mode background tile (z-0). */
  menuBg?: string;
  /** `gif`-mode border frame (z-10). */
  menuBorder?: string;
  /** `gif`-mode active/hover icon (z-20). Falls back to `src`. */
  activeSrc?: string;
  /** `gif`-mode active/hover background tile. Falls back to `menuBg`. */
  activeMenuBg?: string;
  /** `gif`-mode active/hover border frame. Falls back to `menuBorder`. */
  activeMenuBorder?: string;
  /** Whether this is the active/selected route. Crossfades to the active assets. */
  active: boolean;
  /** Accessible label / icon alt text. */
  label: string;
  /**
   * Rendered glyph box. `image` passes fixed `w`/`h`. `gif` may pass `w` + an
   * `aspectRatio` (omitting `h`) so the tile stays proportional as a fluid
   * (vw-based) width changes — preventing the art from stretching on resize.
   */
  box: { w: string; h?: string; aspectRatio?: string };
  /** `image`-mode per-item mask sizing (e.g. hot = "78%"). */
  maskSizePercent?: string;
  /** `gif`-mode inset of the icon inside the border frame. Default "3%". */
  iconInset?: string;
}>();

// Crossfade opacity for the stacked layers. Active route OR hover (they share
// the same look) shows the active layer; otherwise the base layer. Centralised
// so all three base/active layer pairs stay in sync.
const baseLayerClass = computed(() =>
  props.active ? "opacity-0" : "opacity-100 group-hover:opacity-0",
);
const activeLayerClass = computed(() =>
  props.active ? "opacity-100" : "opacity-0 group-hover:opacity-100",
);
</script>
