/**
 * Member notifications, shared by every surface that opens the panel.
 *
 * The list lives in `useState` rather than in one component: the desktop header
 * bell and the mobile bottom nav's 공지사항 button both render a
 * NotificationDropdown, and they must show the same items and the same
 * mark-all-read state from a single `/notifications` request.
 *
 * The read is member-scoped and locale-scoped, so it re-runs on login and on a
 * language switch, and empties on logout.
 */
import { computed } from "vue";
import { useApi } from "@/composables/useApi";
import { validateResponse } from "@/lib/validateResponse";
import {
  notificationsResponseSchema,
  mapNotification,
  type NotificationItem,
} from "@/interfaces/notification.interface";

export function useNotifications() {
  const authStore = useAuthStore();
  const { locale } = useI18n();
  const notifications = useState<NotificationItem[]>(
    "member-notifications",
    () => [],
  );

  const unreadCount = computed(
    () => notifications.value.filter((n) => !n.is_read).length,
  );

  const fetchNotifications = async () => {
    if (!authStore.isAuthenticated) return;
    try {
      const api = useApi();
      const raw = await api("/notifications", { query: { lang: locale.value } });
      notifications.value = validateResponse(
        notificationsResponseSchema,
        raw,
        "/notifications",
      ).map(mapNotification);
    } catch {
      notifications.value = [];
    }
  };

  /** Local-only: the panel marks everything read server-side as it opens. */
  const markNotificationsRead = () => {
    notifications.value = notifications.value.map((notification) => ({
      ...notification,
      is_read: true,
    }));
  };

  return {
    notifications,
    unreadCount,
    fetchNotifications,
    markNotificationsRead,
  };
}
