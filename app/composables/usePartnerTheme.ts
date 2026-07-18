import { computed } from "vue";

/**
 * Partner-section theme — single mapping of the `theme.partner.*` tokens onto
 * the partner UI roles (nav bar, body container, cards, tables). Themed
 * independently of the site-wide `theme.brandColor` and the shared
 * `theme.panel.*` palette, so the partner dashboard can be re-skinned on its
 * own from the theme document. Retarget here to re-skin the whole partner
 * section at once.
 */
export const usePartnerTheme = () => {
  const siteConfig = useSiteConfig();
  const partner = computed(() => siteConfig.theme.partner);
  const accent = computed(() => partner.value.accentColor);

  return {
    /** Accent color — icons, active states, table header text. */
    accent,
    /** Container border — nav bar, body container, cards. */
    border: computed(() => partner.value.borderColor),
    /** Container background — nav bar, partner body, drawers. */
    panelBg: computed(() => partner.value.panelBgColor),
    /** Card background — section cards, tables, submenus. */
    cardBg: computed(() => partner.value.cardBgColor),
    /** Table header background. */
    headBg: computed(() => partner.value.headBgColor),
    /** Active nav tab / primary button — accent fill with a lightened top. */
    activeGradient: computed(
      () =>
        `linear-gradient(180deg, color-mix(in srgb, ${accent.value} 100%, #fff 10%) 0%, ${accent.value} 100%)`,
    ),
    /** Text color on the active tab / primary button. */
    activeText: computed(() => partner.value.activeTextColor),
  };
};
