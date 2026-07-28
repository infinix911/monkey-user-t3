/**
 * useProfileMenuItems — the profile menu as data.
 *
 * Builds the two CMS-ordered item pages (and their bundled fallbacks) with no
 * knowledge of how they are presented. The modal renders them as a swipeable
 * grid of tiles, the desktop sidebar as a list of rows; both read this.
 *
 * Extracted from useProfileMenu, which owned the construction alongside the
 * modal's DOM lifecycle — the coupling is why the sidebar originally hardcoded
 * its own copy of the list.
 */

import {
  useMenuSettings,
  type MenuSetting,
} from "@/composables/useMenuSettings";
import { PROFILE_MENU_ICON_DEFAULTS } from "@/composables/useDefaultThemeConfig";

/** One entry in the profile menu. */
export interface MenuItem {
  id: string;
  labelKey: string;
  href?: string;
  image: string;
}

/**
 * The profile menu's items, labels, and the Telegram deep link.
 *
 * @returns {object} Page 1, page 2, every item, and the label/link helpers.
 */
export function useProfileMenuItems() {
  const { t, te } = useI18n();

  /**
   * Translates a menu label, falling back to the raw key when no translation
   * exists (CMS ids can outrun the locale files).
   *
   * @param key - Translation key or raw label.
   * @returns {string} Display label.
   */
  const tLabel = (key: string): string => (te(key) ? t(key) : key);

  // `assets.profileMenu` is the ordered items array (see useMenuSettings);
  // default item ICONS live in this bundled key→path map. Aliased as
  // `profileMenu` so the per-item defaults below read naturally.
  const profileMenu = PROFILE_MENU_ICON_DEFAULTS;

  // userPageConfig is populated from the /site/config/userpage API in app.vue
  const { config: apiConfig } = useSiteConfigState();
  const telegramHref = computed(() => {
    const raw = apiConfig.value?.contact?.handles?.telegram || "";
    const trimmed = String(raw).trim();
    if (!trimmed) return "";
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    return `https://t.me/${trimmed.replace(/^@/, "")}`;
  });

  // Lookup config for known page-1 item IDs (used as fallback when API
  // doesn't provide image).
  const MENU_ITEM_DEFAULTS: Record<string, Omit<MenuItem, "id">> = {
    activity: { labelKey: "profile.activity", image: profileMenu.activity },
    referral: {
      labelKey: "myAccount.referral.title",
      image: profileMenu.referral,
    },
    bettingReport: {
      labelKey: "myAccount.bettingReport",
      image: profileMenu.bettingReport,
    },
    transaksi: {
      labelKey: "profile.transaction",
      image: profileMenu.bettingReport,
    },
    transaction: {
      labelKey: "profile.transaction",
      image: profileMenu.bettingReport,
    },
    loginHistory: {
      labelKey: "myAccount.loginHistory.label",
      image: profileMenu.loginHistory,
    },
    changePassword: {
      labelKey: "myAccount.changePassword",
      image: profileMenu.changePassword,
    },
    promotion: { labelKey: "profile.promotion", image: profileMenu.promotions },
    faq: { labelKey: "myAccount.faq", image: profileMenu.faq },
    apk: { labelKey: "profile.apk", image: profileMenu.apk },
    telegram: {
      labelKey: "profile.telegram",
      href: "https://t.me/luckycsn777_bot",
      image: profileMenu.telegram,
    },
    inquiry: { labelKey: "profile.inquiry", image: profileMenu.inquiry },
    contact: { labelKey: "profile.contact", image: profileMenu.contact },
    livechat: { labelKey: "common.liveChat", image: profileMenu.livechat },
    // RTP (slot-RTP page). The live CMS places it on page 1, so it needs a
    // label here as well as in PAGE2_ITEM_DEFAULTS — without it the id would
    // fall through to prettifyItemId() and render as "Rtp". Icon comes from
    // the API `image`.
    rtp: { labelKey: "navbar.rtp", image: "" },
  };

  // Hardcoded fallback list (used when API returns nothing)
  const MENU_ITEMS: MenuItem[] = Object.entries(MENU_ITEM_DEFAULTS).map(
    ([id, cfg]) => ({ id, ...cfg }),
  );

  const PAGE2_ITEM_DEFAULTS: Record<string, Omit<MenuItem, "id">> = {
    transaksi: {
      labelKey: "profile.transaction",
      image: profileMenu.bettingReport,
    },
    transaction: {
      labelKey: "profile.transaction",
      image: profileMenu.bettingReport,
    },
    telegram: {
      labelKey: "profile.telegram",
      href: "https://t.me/luckycsn777_bot",
      image: profileMenu.telegram,
    },
    // activity + livechat may be placed on page 2 by the CMS
    // (the live theme API does). Map their labels here so they don't fall back
    // to a prettified id (e.g. "Livechat"). Icons come from the API `image`.
    activity: { labelKey: "profile.activity", image: profileMenu.activity },
    livechat: { labelKey: "common.liveChat", image: profileMenu.livechat },
    // RTP (slot-RTP page) — label maps to the nav's RTP string; icon from API.
    rtp: { labelKey: "navbar.rtp", image: "" },
  };

  // Hardcoded fallback list (used when API returns nothing)
  const PAGE2_ITEMS: MenuItem[] = Object.entries(PAGE2_ITEM_DEFAULTS).map(
    ([id, cfg]) => ({ id, ...cfg }),
  );

  // Menu items whose panels no longer exist in this fork. The live CMS theme
  // payload still ships them, so they must be dropped here or they'd render as
  // tiles that open nothing. Matched on a normalized id so CMS spelling
  // variants (cara_bermain, cara-bermain, Menang, bonus_history) are caught.
  //
  // - togel group (invoice … carabermain): ADR togel/qris removal — routes gone.
  // - bonushistory / levelsystem: backed only by GET /promotions/bonuses and
  //   GET /promotions/level-rewards, which don't exist in monkey-user-api.
  // - partner group: ADR-020 — the /partner* routes, components, and partner
  //   deposit/withdraw flows are gone.
  const REMOVED_ITEM_IDS = new Set([
    "invoice",
    "meanang",
    "menang",
    "hadiah",
    "history",
    "carabermain",
    "bonushistory",
    "levelsystem",
    "partner",
    "partnerdashboard",
    "partnerdeposit",
    "partnerwithdraw",
    "partnermembers",
    "partnersettlement",
    "partnersettlements",
    "partnersettlementrequest",
    "partnerbethistory",
    "partnergamestats",
  ]);
  const isRemovedItem = (id: string) =>
    REMOVED_ITEM_IDS.has(id.replace(/[^a-z]/gi, "").toLowerCase());

  // Pre-fetched server-side in app.vue via useAsyncData('menuSettings').
  const menuSettings = useMenuSettings();

  /** Convert camelCase/snake_case item ID to a readable label */
  function prettifyItemId(id: string): string {
    return id
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Build a MenuItem from an API setting, falling back to a defaults map */
  function buildMenuItem(
    s: MenuSetting,
    defaults: Record<string, Omit<MenuItem, "id">>,
  ): MenuItem {
    const known = defaults[s.item];
    return {
      id: s.item,
      labelKey: known?.labelKey ?? prettifyItemId(s.item),
      href: known?.href,
      image: s.image || known?.image || "",
    };
  }

  const visibleMenuItems = computed(() => {
    const settings = menuSettings.value;
    if (!settings || settings.length === 0) {
      return MENU_ITEMS;
    }
    const page1 = settings
      .filter((s) => s.enabled && s.page === 1 && !isRemovedItem(s.item))
      .sort((a, b) => a.sort - b.sort);
    if (page1.length === 0) {
      return MENU_ITEMS;
    }
    return page1.map((s) => buildMenuItem(s, MENU_ITEM_DEFAULTS));
  });

  const visiblePage2Items = computed(() => {
    const settings = menuSettings.value;
    if (!settings || settings.length === 0) {
      return PAGE2_ITEMS;
    }
    const page2 = settings
      .filter((s) => s.enabled && s.page === 2 && !isRemovedItem(s.item))
      .sort((a, b) => a.sort - b.sort);
    if (page2.length === 0) {
      return PAGE2_ITEMS;
    }
    return page2.map((s) => buildMenuItem(s, PAGE2_ITEM_DEFAULTS));
  });
  /**
   * The display label for a menu id. Both pages are searched, because an
   * account section can sit on either depending on the admin's menu settings;
   * an id with no item left (a section opened from elsewhere) is prettified.
   *
   * @param id - Menu item id.
   * @returns {string} Display label.
   */
  function labelForId(id: string): string {
    const item =
      visibleMenuItems.value.find((i) => i.id === id) ??
      visiblePage2Items.value.find((i) => i.id === id);
    return item ? tLabel(item.labelKey) : prettifyItemId(id);
  }

  /** Both pages in CMS order — what a single-list surface (the sidebar) shows. */
  const allMenuItems = computed(() => [
    ...visibleMenuItems.value,
    ...visiblePage2Items.value,
  ]);

  return {
    tLabel,
    telegramHref,
    visibleMenuItems,
    visiblePage2Items,
    allMenuItems,
    labelForId,
  };
}
