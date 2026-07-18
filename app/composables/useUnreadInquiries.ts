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

      // Check if any inquiry has unread replies
      const hasUnread = response.data.some(
        (inquiry: InquiryItem) => inquiry.member_unread > 0,
      );

      uiStore.setHasUnreadInquiries(hasUnread);

      // Auto-open the inquiry modal if there are unread inquiries
      if (hasUnread) {
        uiStore.setShowInquiryModal(true);
      }
    } catch (error) {
      console.error("Error checking unread inquiries:", error);
      uiStore.setHasUnreadInquiries(false);
    }
  };

  // Register callback with WebSocket store
  onMounted(() => {
    wsStore.setInquiryCheckCallback(checkUnreadInquiries);
  });

  // Check for unread inquiries when user becomes authenticated
  watch(
    () => authStore.isAuthenticated,
    (isAuthenticated) => {
      if (isAuthenticated) {
        checkUnreadInquiries();
      }
    },
  );

  return {
    checkUnreadInquiries,
  };
}
