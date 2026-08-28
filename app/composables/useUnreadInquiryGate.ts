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
 * It fires on ARRIVAL AND ON EVERY NAVIGATION while a reply is unread, which is
 * the behavior 415491f narrowed to a single edge and this restores. That commit
 * was fixing a real complaint — the warning opened a modal that cannot be
 * dismissed until everything is read, so landing anywhere pinned the member to
 * their inbox — and the complaint still stands, so the escape hatch is the read
 * itself: clear the replies and the gate goes quiet. Nothing here re-warns while
 * the list is open.
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
  const route = useRoute();

  const { checkUnreadInquiries } = useUnreadInquiries();

  /*
    Re-ask the server on every navigation.

    The flag this gate reads is only refreshed by a websocket event or by the
    member signing in. Watching `route.path` in the warning watcher below is not
    enough on its own: it re-evaluates a flag that nothing has updated, so a
    reply that arrived while the socket was down — routine in local dev, where
    the ws proxy is often not running — leaves `hasUnreadInquiries` false and
    every menu click reads that stale false and returns. Asking here is what
    makes the socket an optimisation rather than a requirement.

    `checkUnreadInquiries` no-ops for guests and on the server, and a navigation
    is already a page-load-sized amount of work, so one small GET alongside it is
    proportionate.
  */
  watch(
    () => route.path,
    () => {
      void checkUnreadInquiries();
    },
  );

  watch(
    [
      () => authStore.isAuthenticated,
      () => uiStore.hasUnreadInquiries,
      // Sources, not conditions: each one can flip `isNoticePending()` below.
      () => uiStore.showNoticeModal,
      () => uiStore.noticeFetching,
      () => uiStore.noticeResolved,
      /*
        Navigation re-raises the warning. The layout that hosts this gate
        persists across route changes, so without this the warning fired once —
        on the `false → true` edge — and a member who dismissed it could then
        move through the whole site with a reply waiting and never be told
        again. `path`, not `fullPath`: a query-string change is not a new page.
      */
      () => route.path,
      /*
        A COUNT change, because `hasUnreadInquiries` is a boolean: once it is
        true a second reply does not move it, so a member sitting still was
        never told about anything after the first message.
      */
      () => uiStore.unreadInquiryCount,
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
