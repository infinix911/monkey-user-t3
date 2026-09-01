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
  const accountSection = ref<string | null>(null);
  const hasUnreadInquiries = ref(false);
  /** Total unread inquiry replies, for the sidebar badge. */
  const unreadInquiryCount = ref(0);
  const showNoticeModal = ref(false);
  /** True while `fetchNotice()` is deciding whether a notice is due. */
  const noticeFetching = ref(false);
  /** True once `fetchNotice()` has run — the notice question is settled. */
  const noticeResolved = ref(false);
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
  const setAccountSection = (section: string | null) => { accountSection.value = section; };

  const setHasUnreadInquiries = (hasUnread: boolean, count = 0) => {
    hasUnreadInquiries.value = hasUnread;
    // Kept beside the boolean so the flag and the badge can never disagree.
    unreadInquiryCount.value = hasUnread ? count : 0;
  };

  /**
   * Whether agreeing to the notice should reload the page.
   *
   * Set only by the login flow. Logging in deliberately does NOT reload yet and
   * does NOT verify the session — verifyUser() would flip `isAuthenticated` and
   * the watchers on it would fire /notifications and /games/lobbies twice. So
   * login fetches the notice and nothing else; agreeing is what reloads, and
   * the reloaded page is server-rendered with all of that already in the HTML.
   *
   * On an ordinary page load the notice is already on an SSR page, so agreeing
   * must NOT reload — this flag is what keeps the two cases apart.
   */
  const reloadAfterNoticeAgree = ref(false);
  const setReloadAfterNoticeAgree = (reload: boolean) => {
    reloadAfterNoticeAgree.value = reload;
  };

  /**
   * Persist the agreement WITHOUT touching the modal's visibility.
   *
   * The login flow reloads on agree, and the modal has to stay on screen until
   * the document is replaced — closing it first would flash the logged-out page
   * underneath. But the agreement still has to be recorded before the reload,
   * or fetchNotice() shows the same notice again on the way back in.
   */
  const markNoticeAgreed = () => {
    if (typeof window !== "undefined") {
      sessionStorage.setItem("noticeAgreed", "1");
    }
  };

  const setShowNoticeModal = (open: boolean) => {
    showNoticeModal.value = open;
    // Closing the modal IS the agreement — persist it so it survives a refresh.
    if (!open) markNoticeAgreed();
  };

  /**
   * Fetch site notice and show modal if notice exists
   */
  const fetchNotice = async () => {
    noticeFetching.value = true;
    try {
      // Master CMS switch (theme.noticeModal.enabled): when the admin turns the
      // notice modal off, never fetch or show it, whatever content is published.
      if (useSiteConfig().theme.noticeModal.enabled === false) return;

      // Skip if user already agreed to the notice in this session
      if (
        typeof window !== "undefined" &&
        sessionStorage.getItem("noticeAgreed") === "1"
      )
        return;

      // Prefer the copy SSR already fetched (composables/useNoticePrefetch.ts):
      // the content is identical, and using it means the browser makes no
      // /site/notice request at all. Falls back to fetching when SSR could not
      // supply it — an anonymous render, or a failed prefetch.
      const prefetched = useNoticePrefetch();
      const data =
        prefetched.value ?? (await axiosClient.get("/site/notice")).data;

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
    } finally {
      // Every path lands here, including the early returns above (disabled in
      // the CMS, already agreed, empty content) — a stuck-pending state would
      // mute the unread-inquiry warning for the rest of the session.
      noticeFetching.value = false;
      noticeResolved.value = true;
    }
  };

  /**
   * Whether a consent notice is on screen, being decided, or still to come.
   *
   * The unread-inquiry gate waits on this: its warning must not cover the
   * notice's agree/disagree buttons. "Not showing" is not the same as "not
   * coming" — `fetchNotice()` runs from an idle callback after mount, so the
   * unread check can easily resolve first.
   *
   * Answering the "still to come" part cheaply is why this reads the same two
   * conditions `fetchNotice` opens with instead of waiting for it to run: after
   * the member agrees and the page reloads, the session flag is already set, so
   * the gate knows immediately that nothing is coming and fires without waiting
   * on an idle callback. Keep the checks below in step with fetchNotice's.
   */
  const isNoticePending = (): boolean => {
    if (showNoticeModal.value || noticeFetching.value) return true;
    if (noticeResolved.value) return false;
    // Session flag first: it is the path taken right after agreeing (the case
    // that has to be fast) and it needs no Nuxt context to read.
    if (
      typeof window !== "undefined" &&
      sessionStorage.getItem("noticeAgreed") === "1"
    )
      return false;
    if (useSiteConfig().theme.noticeModal.enabled === false) return false;
    // Not settled and not ruled out — a notice may still appear.
    return true;
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
    accountSection,
    hasUnreadInquiries,
    unreadInquiryCount,
    showNoticeModal,
    noticeFetching,
    noticeResolved,
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
    setAccountSection,
    setHasUnreadInquiries,
    setShowNoticeModal,
    markNoticeAgreed,
    isNoticePending,
    reloadAfterNoticeAgree,
    setReloadAfterNoticeAgree,
    fetchNotice,
  };
});
