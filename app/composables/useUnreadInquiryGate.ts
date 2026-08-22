import { watch } from "vue";

/**
 * Keeps unread inquiry replies authoritative and tells the member when replies
 * are waiting.
 *
 * The modal never appears on its own: the warning comes first, and pressing OK
 * on it is what opens the list. `blockedByUnreadInquiries` does exactly that
 * pair, which is why the gate calls it rather than the bare alert — dismissing
 * the warning and being left on a page with nothing opened read as a broken
 * button.
 *
 * The warning WAITS for the site notice. On a refresh both land at once, and
 * the alert used to pop over the "이 공지사항은 접속 시 동의가 필수입니다"
 * consent modal — burying the agree/disagree buttons behind a dialog whose own
 * modal then covers them. `uiStore.isNoticePending()` answers "notice showing,
 * being decided, or still to come", and agreeing closes the notice, which
 * re-runs this watcher.
 *
 * It must not wait a moment longer than that. An earlier version held the
 * warning until `onNuxtReady`, which Nuxt schedules on an idle callback — on a
 * busy page that lands seconds after the data is ready, so the member sat on a
 * quiet page and then got a dialog out of nowhere. The pending check is
 * synchronous instead: once the notice is agreed (or ruled out), the warning
 * shows as soon as /inquiries answers.
 */
export function useUnreadInquiryGate(): void {
  const uiStore = useUiStore();
  const authStore = useAuthStore();

  useUnreadInquiries();

  watch(
    [
      () => authStore.isAuthenticated,
      () => uiStore.hasUnreadInquiries,
      // Sources, not conditions: each one can flip `isNoticePending()` below.
      () => uiStore.showNoticeModal,
      () => uiStore.noticeFetching,
      () => uiStore.noticeResolved,
    ],
    ([isAuthenticated, hasUnread]) => {
      if (!isAuthenticated || !hasUnread) return;
      if (uiStore.isNoticePending()) return;
      // Nothing to announce over an open list — they are already reading them.
      if (uiStore.showInquiryModal) return;
      void blockedByUnreadInquiries();
    },
    { immediate: true },
  );
}
