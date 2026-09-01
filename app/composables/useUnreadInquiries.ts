import { storeToRefs } from "pinia";
import { useWebSocketStore } from "~/stores/websocket";
import { useMemberInboxStore } from "~/stores/member-inbox";

/** Bridges websocket/auth lifecycle events to the shared member inbox store. */
export function useUnreadInquiries() {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  const wsStore = useWebSocketStore();
  const inbox = useMemberInboxStore();
  const { hasUnreadInquiries, unreadInquiryCount } = storeToRefs(inbox);

  const syncUnread = () =>
    uiStore.setHasUnreadInquiries(hasUnreadInquiries.value, unreadInquiryCount.value);

  const checkUnreadInquiries = async () => {
    if (import.meta.server) return;
    if (!authStore.isAuthenticated) {
      inbox.clear();
      uiStore.setHasUnreadInquiries(false);
      return;
    }
    // A websocket summary refresh must not yank an open inquiry panel back to
    // page one merely to recompute its badge.
    const selectedPage = inbox.currentPage;
    await inbox.loadInquiries(1, true);
    inbox.currentPage = selectedPage;
    syncUnread();
  };

  onMounted(() => wsStore.setInquiryCheckCallback(checkUnreadInquiries));
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated) => {
      if (isAuthenticated) void checkUnreadInquiries();
      else {
        inbox.clear();
        uiStore.setHasUnreadInquiries(false);
      }
    },
    { immediate: true },
  );

  return { checkUnreadInquiries };
}
