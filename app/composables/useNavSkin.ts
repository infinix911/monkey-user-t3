import type { Component } from "vue";
import type { NavIconsType } from "~/composables/useDefaultThemeConfig";
import NavTransactionDefault from "~/components/navigation/NavTransactionDefault.vue";
import NavTransactionLucky from "~/components/navigation/NavTransactionLucky.vue";

/** Glyph box geometry passed to NavGlyph (fixed w/h, or w + aspect-ratio). */
export interface NavGlyphBox {
  w: string;
  h?: string;
  aspectRatio?: string;
}

/** Per-breakpoint layout class tokens for one skin. */
export interface NavSkinLayout {
  mobile: {
    /** Mobile/tablet bar wrapper classes (height + padding). */
    bar: string;
    /** Per-item button classes (width/height/padding). */
    button: string;
    /** Glyph box geometry. */
    box: NavGlyphBox;
  };
  desktop: {
    /** Outer desktop nav wrapper height class. */
    outer: string;
    /** Gap of the row holding nav-items + transaction panel. */
    rowGap: string;
    /** Scrollable nav-items area classes (height + margin). */
    area: string;
    /** Gap between the nav-item buttons. */
    innerGap: string;
    /** Per-item button classes. */
    button: string;
    /** Glyph box geometry. */
    box: NavGlyphBox;
  };
}

/**
 * A nav "skin" — the coordinated UI set selected by the icon render type.
 * Everything that differs between looks (glyph rendering, layout tokens, the
 * transaction panel) lives here as data, so consumers never branch on the type.
 */
export interface NavSkin {
  /** Skin identifier. */
  key: "default" | "gif";
  /** Glyph rendering: which NavGlyph mode, and whether to show the text label. */
  glyph: { type: NavIconsType; showLabel: boolean };
  /** Layout class tokens (replaces the old inline `type === 'gif' ? …` logic). */
  layout: NavSkinLayout;
  /** Deposit/withdraw panel component for this skin. */
  transaction: Component;
}

/** Tile aspect ratio for the Lucky 3-layer art (single source of the literal). */
const GIF_TILE_ASPECT = "320 / 302";

/**
 * Registry of nav skins. Add a new look by adding an entry here (and mapping a
 * render type to it in `useNavSkin`) — no component or template ever branches
 * on the type. Token strings are the source of truth for each skin's layout.
 */
const NAV_SKINS: Record<NavSkin["key"], NavSkin> = {
  // Default (template-3) masked-silhouette icons + text labels.
  default: {
    key: "default",
    glyph: { type: "png", showLabel: true },
    layout: {
      mobile: {
        bar: "h-[90px] pb-[7px]",
        button:
          "w-[calc((100vw-8px)/6)] max-w-[131px] h-[78px] md:w-[78px] md:h-[76px] pt-1.5 gap-2 hover:scale-105",
        box: { w: "56px", h: "56px" },
      },
      desktop: {
        outer: "lg:h-[129px]",
        rowGap: "gap-[30px]",
        area: "h-[100px] mt-[-8px]",
        innerGap: "gap-[30px]",
        button: "w-12 md:w-[74px] pt-1 md:pt-0 hover:scale-105",
        box: { w: "72px", h: "76px" },
      },
    },
    transaction: NavTransactionDefault,
  },
  // Lucky-nuxt 3-layer composite tiles (no text label) + Lucky transaction panel.
  gif: {
    key: "gif",
    glyph: { type: "gif", showLabel: false },
    layout: {
      mobile: {
        bar: "h-[95px]",
        button: "w-[calc((100vw-8px)/4.5)] max-w-[84px] py-0",
        box: { w: "100%", aspectRatio: GIF_TILE_ASPECT },
      },
      desktop: {
        outer: "lg:h-[122px]",
        rowGap: "gap-[10px]",
        area: "h-[122px] mt-0",
        innerGap: "gap-0",
        button: "w-16 md:w-[104px] py-2.5",
        box: { w: "100%", aspectRatio: GIF_TILE_ASPECT },
      },
    },
    transaction: NavTransactionLucky,
  },
};

/**
 * Resolves the active nav skin from `theme.nav.type`. Single source of
 * truth for the type → skin mapping: `gif` → gif skin, everything else →
 * default skin (backward compatible). Consumers read `skin.glyph` /
 * `skin.layout` / `skin.transaction` instead of branching on the type.
 */
export function useNavSkin(): NavSkin {
  const siteConfig = useSiteConfig();
  const type = siteConfig.theme.nav.type ?? "png";
  return NAV_SKINS[type === "gif" ? "gif" : "default"];
}
