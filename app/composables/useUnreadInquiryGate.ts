import { watch } from "vue";

/**
 * Keeps unread inquiry replies authoritative and opens the required inquiry
 * modal whenever they block the current surface.
 */
export function useUnreadInquiryGate(): void {
  const uiStore = useUiStore();

  useUnreadInquiries();

  watch(
    () => uiStore.hasUnreadInquiries,
    (hasUnread) => {
      if (hasUnread) void blockedByUnreadInquiries();
    },
    { immediate: true },
  );
}
