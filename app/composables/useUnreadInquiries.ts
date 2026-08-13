/**
 * Unread inquiries composable
 * Ported from banana-lucky-next/lib/hooks/useUnreadInquiries.ts
 *
 * Converts:
 * - useAppStore (Zustand) → useAuthStore/useUiStore (Pinia)
 * - useWebSocketStore (Zustand) → useWebSocketStore (Pinia) from ~/stores/websocket
 * - useEffect → onMounted + watch
 * - useCallback → plain function
 * - axiosInstance → axiosClient from ~/lib/axios-client
 */

import axiosClient from "~/lib/axios-client";
import { getDateRangeLastNDays } from "~/lib/date";
import { useWebSocketStore } from "~/stores/websocket";
import { validateResponse } from "@/lib/validateResponse";
import {
  inquiriesResponseWireSchema,
  mapInquiriesResponse,
  type InquiryItem,
} from "~/interfaces/inquiry.interface";

const INQUIRY_DATE_RANGE = 30;
const INQUIRY_LIMIT = 10;

export function useUnreadInquiries() {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  const wsStore = useWebSocketStore();

  const checkUnreadInquiries = async () => {
    // Client only. `axiosClient` is the browser mutation client — it carries no
    // cookie jar on the server, so an SSR call reaches /inquiries unauthenticated
    // and logs a 401 on every render. The watcher below is `immediate`, which
    // runs during setup, and setup also runs on the server; this is the guard
    // that keeps it out of SSR.
    if (import.meta.server) return;

    if (!authStore.isAuthenticated) {
      uiStore.setHasUnreadInquiries(false);
      return;
    }

    try {
      const { startDate, endDate } = getDateRangeLastNDays(INQUIRY_DATE_RANGE);
      const apiUrl = `/inquiries?page=1&limit=${INQUIRY_LIMIT}&startDate=${startDate}&endDate=${endDate}`;
      const raw = (await axiosClient.get(apiUrl)).data;
      const response = mapInquiriesResponse(
        validateResponse(inquiriesResponseWireSchema, raw, "/inquiries"),
      );

      // Total unread REPLIES, not the number of tickets holding them: the
      // sidebar badge counts messages the member has not read.
      const unreadCount = response.data.reduce(
        (sum: number, inquiry: InquiryItem) =>
          sum + Math.max(0, inquiry.member_unread ?? 0),
        0,
      );
      const hasUnread = unreadCount > 0;

      // Record the flag only. This composable deliberately does NOT open the
      // inquiry modal — not on load, not on a websocket reply. The member is
      // interrupted when they try to act (deposit, withdraw, point transfer,
      // launch a game, or open another account panel), where
      // `blockedByUnreadInquiries` shows the warning and takes them to the
      // thread. Popping it unbidden meant every page load began with a modal
      // they could not dismiss, since the close guard holds it open while
      // anything is unread.
      uiStore.setHasUnreadInquiries(hasUnread, unreadCount);
    } catch (error) {
      console.error("Error checking unread inquiries:", error);
      uiStore.setHasUnreadInquiries(false);
    }
  };

  // Register callback with WebSocket store
  onMounted(() => {
    wsStore.setInquiryCheckCallback(checkUnreadInquiries);
  });

  // Check for unread inquiries when the user becomes authenticated.
  //
  // `immediate` matters: the session plugin verifies before the layout mounts,
  // so on a reload `isAuthenticated` is ALREADY true here and a lazy watcher
  // would never fire — leaving `hasUnreadInquiries` false and every guard that
  // reads it dead until the member happened to log in again in the same tab.
  // `checkUnreadInquiries` no-ops for guests, so running it eagerly is safe.
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated) => {
      if (isAuthenticated) {
        checkUnreadInquiries();
      }
    },
    { immediate: true },
  );

  return {
    checkUnreadInquiries,
  };
}
