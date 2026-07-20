/**
 * useProfileMenu — state, menu construction, navigation, API calls and
 * DOM lifecycle for NewProfileModal.vue.
 *
 * Extracted from the component so the .vue stays a thin presentation layer.
 * All behavior is preserved exactly: menu/page2 item building from API
 * settings, language selector, click/escape/outside
 * handlers, carousel swipe, logout, mobile inquiry + referral-count fetches
 * and the open/close watcher.
 *
 * The component keeps ownership of the account-section component map (it
 * imports the .vue panels and resolves `<component :is>`); this composable
 * exposes `selectedAccountSection` so the component can derive that map.
 */

import { useApi } from "@/composables/useApi";
import { formatDateAsISO } from "~/lib/date";
import { validateResponse } from "@/lib/validateResponse";
import {
  inquiriesResponseWireSchema,
  mapInquiriesResponse,
  type InquiriesResponse,
} from "@/interfaces/inquiry.interface";
import {
  showErrorAlert,
  showWarningAlert,
  showAutoAlert,
} from "~~/utils/swal-alert";
import { useMenuSettings, type MenuSetting } from "@/composables/useMenuSettings";
import { PROFILE_MENU_ICON_DEFAULTS } from "@/composables/useDefaultThemeConfig";
import { useCarouselSwipe } from "@/composables/useCarouselSwipe";

export type AccountSection = string | null;

export interface MenuItem {
  id: string;
  labelKey: string;
  href?: string;
  image: string;
}

export interface UseProfileMenuOptions {
  isOpen: () => boolean;
  position: () => "top" | "bottom" | undefined;
  onClose: () => void;
  /** Returns true when the id maps to a sliding-panel account section. */
  isAccountSection: (id: string) => boolean;
}

const INQUIRY_DATE_RANGE = 30;
const INQUIRY_LIMIT = 10;

export function useProfileMenu(options: UseProfileMenuOptions) {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  const siteStore = useSiteStore();
  const { t, te, locale, setLocale } = useI18n();
  const router = useRouter();
  const siteConfig = useSiteConfig();
  const localePath = useLocalePath();
  const { installPWA } = usePWAInstall();
  const api = useApi();

  /**
   * Translate a menu item label, falling back to the raw label when no
   * translation exists.
   */
  const tLabel = (key: string): string => (te(key) ? t(key) : key);

  // `assets.profileMenu` is now the ordered items array (see useMenuSettings);
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
  };

  // Hardcoded fallback list (used when API returns nothing)
  const MENU_ITEMS: MenuItem[] = Object.entries(MENU_ITEM_DEFAULTS).map(
    ([id, cfg]) => ({ id, ...cfg }),
  );

  const menuRef = ref<HTMLElement | null>(null);
  const slidingPanelRef = ref<HTMLElement | null>(null);
  const selectedAccountSection = ref<AccountSection>(null);
  const showPromotionModal = ref(false);
  const showActivityModal = ref(false);
  const carouselPage = ref(0);

  // Language selector — mirrors the header's selector. Persists the choice to
  // the `ui_locale` cookie that app.vue reads on load.
  const languages: Array<{ code: "en" | "ko"; name: string }> = [
    { code: "en", name: "English" },
    { code: "ko", name: "한국어" },
  ];
  const showLangProfileDropdown = ref(false);
  const profileLangCode = computed(() => locale.value as "en" | "ko");
  const uiLocaleCookie = useCookie<string | null>("ui_locale", {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  const toggleLangDropdown = () => {
    showLangProfileDropdown.value = !showLangProfileDropdown.value;
  };
  const selectLanguage = (code: "en" | "ko") => {
    uiLocaleCookie.value = code;
    setLocale(code);
    showLangProfileDropdown.value = false;
  };

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

  const isBottom = computed(() => options.position() === "bottom");

  // Menu items whose panels no longer exist in this fork. The live CMS theme
  // payload still ships them, so they must be dropped here or they'd render as
  // tiles that open nothing. Matched on a normalized id so CMS spelling
  // variants (cara_bermain, cara-bermain, Menang, bonus_history) are caught.
  //
  // - togel group (invoice … carabermain): ADR togel/qris removal — routes gone.
  // - bonushistory / levelsystem: backed only by GET /promotions/bonuses and
  //   GET /promotions/level-rewards, which don't exist in monkey-user-api.
  const REMOVED_ITEM_IDS = new Set([
    "invoice",
    "meanang",
    "menang",
    "hadiah",
    "history",
    "carabermain",
    "bonushistory",
    "levelsystem",
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

  const positionClasses = computed(() => {
    return isBottom.value
      ? "fixed bottom-0 left-0 right-0 mx-auto w-full max-w-[520px]"
      : "fixed top-[73px] right-[max(0px,calc((100vw-1152px)/2))] mt-2 w-[393px]";
  });

  const selectedAccountSectionLabel = computed(() => {
    if (!selectedAccountSection.value) return "";
    // Search both menu pages — an account section (e.g. transaksi) can live on
    // page 1 or page 2 depending on the admin's menu settings.
    const item =
      visibleMenuItems.value.find(
        (i) => i.id === selectedAccountSection.value,
      ) ??
      visiblePage2Items.value.find(
        (i) => i.id === selectedAccountSection.value,
      );
    if (item) return tLabel(item.labelKey);
    return prettifyItemId(selectedAccountSection.value);
  });

  // Header icons for the mobile full-screen modal (icon + text).
  const ACCOUNT_SECTION_ICONS: Partial<Record<string, string>> = {
    bettingReport: "/designs/template-3/bettingreport.png",
    changePassword: "/designs/template-3/password.png",
    referral: "/designs/template-3/referral.png",
    loginHistory: "/designs/template-3/login.png",
  };

  const selectedAccountSectionIcon = computed(() =>
    selectedAccountSection.value
      ? (ACCOUNT_SECTION_ICONS[selectedAccountSection.value] ?? null)
      : null,
  );

  // Per-section vertical nudge for the overlapping header icon.
  const ACCOUNT_SECTION_ICON_TOP: Partial<Record<string, string>> = {
    referral: "8px",
    changePassword: "3px",
  };

  const selectedAccountSectionIconStyle = computed(() => {
    const top = selectedAccountSection.value
      ? ACCOUNT_SECTION_ICON_TOP[selectedAccountSection.value]
      : undefined;
    return top ? { top } : undefined;
  });

  function getAccountSection(id: string): AccountSection {
    return options.isAccountSection(id) ? id : null;
  }

  function onClose() {
    options.onClose();
  }

  /**
   * Unified click handler for any menu item (page 1 or page 2).
   */
  function handleItemClick(item: MenuItem) {
    // Live chat — open the `site:livechat` URL in a new tab, same as the
    // header's live-chat button. The id is admin/CMS driven, so normalise
    // before matching (catches livechat / liveChat / live_chat / live-chat).
    if (item.id.replace(/[^a-z]/gi, "").toLowerCase() === "livechat") {
      const url = siteStore.siteSettings?.["site:livechat"];
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        console.log("[profile] live chat link (site:livechat) not configured");
      }
      // Drop focus so the tile doesn't linger in a focused/active state
      // (this branch doesn't navigate or close the modal).
      if (import.meta.client && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    if (item.id === "apk") {
      handleApkClick();
      return;
    }

    if (item.id === "promotion") {
      showPromotionModal.value = true;
      return;
    }

    if (item.id === "activity") {
      showActivityModal.value = true;
      return;
    }

    // RTP — navigate to the slot-RTP page (same target as the bottom nav's RTP
    // slot). Normalised to catch rtp / RTP / slot-rtp / slotRtp from the CMS.
    const normalizedId = item.id.replace(/[^a-z]/gi, "").toLowerCase();
    if (normalizedId === "rtp" || normalizedId === "slotrtp") {
      router.push(localePath("/slot-rtp"));
      onClose();
      return;
    }

    const section = getAccountSection(item.id);
    if (section) {
      selectedAccountSection.value = section;
      return;
    }

    if (item.href) {
      router.push(localePath(item.href));
    }
    onClose();
  }

  async function handleLogout() {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      authStore.logout();
      onClose();
      router.push(localePath("/"));
    }
  }

  async function handleApkClick() {
    const isAndroid =
      typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      await showWarningAlert(t("profile.apkAndroidOnly"));
      onClose();
      return;
    }
    const result = await installPWA();
    if (!result.success && result.error === "install_not_available") {
      showAutoAlert(t("profile.installNotAvailableText"), "info");
    }
    onClose();
  }

  // Mobile inquiry data fetching
  const mobileInquiryData = ref<InquiriesResponse | null>(null);
  const mobileInquiryPage = ref(1);

  async function fetchMobileInquiryData(page: number = 1) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - INQUIRY_DATE_RANGE);
      const raw = await api("/inquiries", {
        query: {
          page,
          limit: INQUIRY_LIMIT,
          startDate: formatDateAsISO(startDate),
          endDate: formatDateAsISO(endDate),
        },
      });
      const data = mapInquiriesResponse(
        validateResponse(inquiriesResponseWireSchema, raw, "/inquiries"),
      );
      mobileInquiryData.value = data;
      mobileInquiryPage.value = page;
      const hasUnread = data.data.some(
        (inquiry) => inquiry.member_unread > 0,
      );
      uiStore.setHasUnreadInquiries(hasUnread);
    } catch (error) {
      console.error("Error fetching inquiries:", error);
    }
  }

  async function handleMobileInquiryRefresh() {
    await fetchMobileInquiryData(mobileInquiryPage.value);
  }

  async function handleMobileInquiryPageChange(page: number) {
    await fetchMobileInquiryData(page);
  }

  async function closeMobileModal() {
    if (
      selectedAccountSection.value === "inquiry" &&
      uiStore.hasUnreadInquiries
    ) {
      await showErrorAlert(
        t("inquiry.unreadMessages"),
        t("inquiry.mustReadMessages"),
      );
      return;
    }
    selectedAccountSection.value = null;
    mobileInquiryData.value = null;
    mobileInquiryPage.value = 1;
  }

  // Referral count shown in the mobile modal header, e.g. "Referral (0)".
  const referralCount = ref<number | null>(null);

  async function fetchReferralCount() {
    try {
      const data = await api<unknown[]>("/auth/referrals");
      referralCount.value = Array.isArray(data) ? data.length : 0;
    } catch (err) {
      console.error("Failed to fetch referral count:", err);
      referralCount.value = 0;
    }
  }

  // Fetch inquiry data when inquiry section is opened
  watch(selectedAccountSection, async (section) => {
    if (section === "inquiry") {
      await fetchMobileInquiryData(1);
    } else if (section === "referral") {
      referralCount.value = null;
      await fetchReferralCount();
    }
  });

  // Swipe for the 2-page menu carousel (mouse + touch) via the shared
  // composable. `carouselPage` is the index; the dots follow it.
  const {
    isDragging: menuSwipeDragging,
    trackTransform: menuTrackTransform,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  } = useCarouselSwipe({ count: () => 2, index: carouselPage });

  // Click outside handler
  function handleClickOutside(event: MouseEvent) {
    if (isBottom.value && selectedAccountSection.value) return;
    if (showPromotionModal.value) return;
    if (showActivityModal.value) return;
    const target = event.target as HTMLElement;
    if (
      showLangProfileDropdown.value &&
      !target.closest("[data-lang-selector]")
    ) {
      showLangProfileDropdown.value = false;
    }
    if (target.closest('[data-hamburger-menu="true"]')) return;
    // SweetAlert2 dialogs are teleported to <body>; ignore clicks inside them.
    if (target.closest(".swal2-container")) return;
    const isInsideMenu = menuRef.value && menuRef.value.contains(target);
    const isInsidePanel =
      slidingPanelRef.value && slidingPanelRef.value.contains(target);
    // Desktop: when an account-section panel (e.g. transaksi) is open, a click
    // on the menu — i.e. outside the panel itself — dismisses just the panel
    // rather than tearing down the whole profile modal.
    if (selectedAccountSection.value && isInsideMenu && !isInsidePanel) {
      selectedAccountSection.value = null;
      return;
    }
    if (!isInsideMenu && !isInsidePanel) {
      onClose();
    }
  }

  // Escape key handler
  function handleEscape(event: KeyboardEvent) {
    if (event.key === "Escape") {
      if (showPromotionModal.value) {
        showPromotionModal.value = false;
        return;
      }
      if (showActivityModal.value) {
        showActivityModal.value = false;
        return;
      }
      if (isBottom.value && selectedAccountSection.value) {
        closeMobileModal();
      } else {
        onClose();
      }
    }
  }

  watch(
    options.isOpen,
    (newVal) => {
      if (newVal) {
        if (import.meta.client) {
          document.addEventListener("mousedown", handleClickOutside);
          document.addEventListener("keydown", handleEscape);
        }
      } else {
        if (import.meta.client) {
          document.removeEventListener("mousedown", handleClickOutside);
          document.removeEventListener("keydown", handleEscape);
        }
        selectedAccountSection.value = null;
        showPromotionModal.value = false;
        showActivityModal.value = false;
        carouselPage.value = 0;
      }
    },
    { immediate: true },
  );

  onUnmounted(() => {
    if (import.meta.client) {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    }
  });

  return {
    t,
    tLabel,
    siteConfig,
    telegramHref,
    menuRef,
    slidingPanelRef,
    selectedAccountSection,
    showPromotionModal,
    showActivityModal,
    carouselPage,
    languages,
    showLangProfileDropdown,
    profileLangCode,
    toggleLangDropdown,
    selectLanguage,
    isBottom,
    visibleMenuItems,
    visiblePage2Items,
    positionClasses,
    selectedAccountSectionLabel,
    selectedAccountSectionIcon,
    selectedAccountSectionIconStyle,
    getAccountSection,
    onClose,
    handleItemClick,
    handleLogout,
    mobileInquiryData,
    mobileInquiryPage,
    handleMobileInquiryRefresh,
    handleMobileInquiryPageChange,
    closeMobileModal,
    referralCount,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    menuSwipeDragging,
    menuTrackTransform,
  };
}
