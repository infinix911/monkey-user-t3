/**
 * useProfileMenu — what is specific to NewProfileModal.vue, the MOBILE profile
 * sheet: its open/close lifecycle, the swipeable two-page carousel, the language
 * selector, the outside-click/escape handling, and the referral header count.
 * Desktop uses AppSidebar instead, so there is no desktop position to support.
 *
 * Everything reusable now lives beside it and is shared with the desktop
 * sidebar: the item list (useProfileMenuItems), the click behaviour
 * (useProfileNavigation), the selected section (useAccountSections), and the
 * inquiry list (useInquiryFeed). This composable only presents them.
 */

import { useApi } from "@/composables/useApi";
import { showErrorAlert } from "~~/utils/swal-alert";
import { useCarouselSwipe } from "@/composables/useCarouselSwipe";
import {
  useProfileMenuItems,
  type MenuItem,
} from "@/composables/useProfileMenuItems";
import {
  isAccountSection,
  useAccountSection,
  type AccountSection,
} from "@/composables/useAccountSections";
import { useProfileNavigation } from "@/composables/useProfileNavigation";
import { useInquiryFeed } from "@/composables/useInquiryFeed";

export type { MenuItem };
export type { AccountSection };

export interface UseProfileMenuOptions {
  isOpen: () => boolean;
  onClose: () => void;
}

export function useProfileMenu(options: UseProfileMenuOptions) {
  const uiStore = useUiStore();
  const { t, locale, setLocale } = useI18n();
  const siteConfig = useSiteConfig();
  const api = useApi();

  // The menu itself is data, built once in useProfileMenuItems and shared with
  // the desktop sidebar; this composable only presents it.
  const {
    tLabel,
    telegramHref,
    visibleMenuItems,
    visiblePage2Items,
    labelForId,
  } = useProfileMenuItems();

  const menuRef = ref<HTMLElement | null>(null);
  // Shared with the desktop sidebar, so opening a section from either surface
  // is the same state rather than two refs kept in step by hand.
  const { section: selectedAccountSection } = useAccountSection();
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

  const selectedAccountSectionLabel = computed(() =>
    selectedAccountSection.value ? labelForId(selectedAccountSection.value) : "",
  );

  /**
   * The section id for a menu item, or `null` when it is not a panel. Used by
   * the tiles to mark the open one.
   *
   * @param id - Menu item id.
   * @returns {AccountSection} The id when it opens a panel, else `null`.
   */
  function getAccountSection(id: string): AccountSection {
    return isAccountSection(id) ? id : null;
  }

  function onClose() {
    options.onClose();
  }

  // Item behaviour and logout are shared with the sidebar; this surface only
  // adds "dismiss myself afterwards".
  const { handleItemClick, handleLogout } = useProfileNavigation({
    onNavigate: () => onClose(),
    onPromotion: () => {
      showPromotionModal.value = true;
    },
    onActivity: () => {
      showActivityModal.value = true;
    },
  });

  // The inquiry list is shared with every surface that renders the section.
  const inquiry = useInquiryFeed();

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
    inquiry.reset();
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

  // The referral header count is this surface's own concern; the inquiry list
  // is loaded by AccountSectionPanel, wherever the section is rendered.
  watch(selectedAccountSection, async (section) => {
    if (section === "referral") {
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
    // A full-screen section is on top of the sheet; it closes itself.
    if (selectedAccountSection.value) return;
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
    if (!menuRef.value?.contains(target)) {
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
      if (selectedAccountSection.value) {
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
    selectedAccountSection,
    showPromotionModal,
    showActivityModal,
    carouselPage,
    languages,
    showLangProfileDropdown,
    profileLangCode,
    toggleLangDropdown,
    selectLanguage,
    visibleMenuItems,
    visiblePage2Items,
    selectedAccountSectionLabel,
    getAccountSection,
    onClose,
    handleItemClick,
    handleLogout,
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
