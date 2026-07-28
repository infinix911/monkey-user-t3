import { defineStore } from "pinia";
import { ref } from "vue";
import axiosClient from "@/lib/axios-client";

/**
 * UI store — modal visibility, the site notice, device detection and layout
 * flags. Split out of the former monolithic `app` store. See [[useAuthStore]]
 * for session state and [[useSiteStore]] for site data.
 */
export const useUiStore = defineStore("ui", () => {
  // Modal States
  const showLoginModal = ref(false);
  const showSignupModal = ref(false);
  // Promotions modal (opened from the bottom nav Promosi button).
  const showPromotionModal = ref(false);
  const showInquiryModal = ref(false);
  const showFaqModal = ref(false);
  const showContactModal = ref(false);
  const showProfileModal = ref(false);
  const showDepositModal = ref(false);
  const showWithdrawalModal = ref(false);
  // Point-conversion modal (opened from the header point icon).
  const showPointModal = ref(false);
  const hasUnreadInquiries = ref(false);
  const showNoticeModal = ref(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const noticeContent = ref<any>(null);

  // Device Detection
  const isIOS = ref(false);
  const isMobile = ref(false);

  // Layout State
  const isNavSticky = ref(false);

  // ----- Device detection -----

  /**
   * Initialize device detection (browser-only)
   * Detects iOS and mobile devices based on user agent and window width
   */
  const initDeviceDetection = () => {
    if (typeof window !== "undefined") {
      isIOS.value = /iPad|iPhone|iPod/.test(navigator.userAgent);
      isMobile.value = window.innerWidth <= 768;
    }
  };

  /**
   * Manually set mobile state (useful for resize handlers)
   */
  const setMobile = (value: boolean) => {
    isMobile.value = value;
  };

  const setNavSticky = (value: boolean) => {
    isNavSticky.value = value;
  };

  // ----- Modal management -----

  const setShowLoginModal = (open: boolean) => {
    showLoginModal.value = open;
  };

  const setShowSignupModal = (open: boolean) => {
    showSignupModal.value = open;
  };

  const setShowPromotionModal = (open: boolean) => {
    showPromotionModal.value = open;
  };

  const setShowInquiryModal = (open: boolean) => {
    showInquiryModal.value = open;
  };

  const setShowFaqModal = (open: boolean) => {
    showFaqModal.value = open;
  };

  const setShowContactModal = (open: boolean) => {
    showContactModal.value = open;
  };

  const setShowProfileModal = (open: boolean) => {
    showProfileModal.value = open;
  };


  const setShowDepositModal = (open: boolean) => {
    showDepositModal.value = open;
  };

  const setShowWithdrawalModal = (open: boolean) => {
    showWithdrawalModal.value = open;
  };

  const setShowPointModal = (open: boolean) => {
    showPointModal.value = open;
  };

  const setHasUnreadInquiries = (hasUnread: boolean) => {
    hasUnreadInquiries.value = hasUnread;
  };

  const setShowNoticeModal = (open: boolean) => {
    showNoticeModal.value = open;
    // When user agrees (modal closed), persist in sessionStorage so it survives refresh
    if (!open && typeof window !== "undefined") {
      sessionStorage.setItem("noticeAgreed", "1");
    }
  };

  /**
   * Fetch site notice and show modal if notice exists
   */
  const fetchNotice = async () => {
    try {
      // Skip if user already agreed to the notice in this session
      if (
        typeof window !== "undefined" &&
        sessionStorage.getItem("noticeAgreed") === "1"
      )
        return;

      const response = await axiosClient.get("/site/notice");
      const data = response.data;

      // Respect the CMS active/inactive toggle. `/site/notice` returns the
      // Tiptap doc with an `isActive` flag; when it's explicitly false the
      // notice is disabled, so don't show the warning.
      if (data && typeof data === "object" && data.isActive === false) return;

      // Only show notice if data has actual content
      if (!data) return;
      if (typeof data === "object" && Object.keys(data).length === 0) return;
      if (typeof data === "string" && data.trim() === "") return;

      noticeContent.value = data;
      showNoticeModal.value = true;
    } catch {
      // swallow — notice is non-critical
    }
  };

  return {
    showLoginModal,
    showSignupModal,
    showPromotionModal,
    showInquiryModal,
    showFaqModal,
    showContactModal,
    showProfileModal,
    showDepositModal,
    showWithdrawalModal,
    showPointModal,
    hasUnreadInquiries,
    showNoticeModal,
    noticeContent,
    isIOS,
    isMobile,
    isNavSticky,
    initDeviceDetection,
    setMobile,
    setNavSticky,
    setShowLoginModal,
    setShowSignupModal,
    setShowPromotionModal,
    setShowInquiryModal,
    setShowFaqModal,
    setShowContactModal,
    setShowProfileModal,
    setShowDepositModal,
    setShowWithdrawalModal,
    setShowPointModal,
    setHasUnreadInquiries,
    setShowNoticeModal,
    fetchNotice,
  };
});
