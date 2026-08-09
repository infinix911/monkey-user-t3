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
  /**
   * Whether the list has been read once, INCLUDING a read that came back empty.
   * `notifications.length` cannot tell those apart, and the difference decides
   * whether a mounting header repeats the request SSR already made. Travels in
   * the SSR payload with the list itself.
   */
  const loaded = useState<boolean>("member-notifications-loaded", () => false);

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
    } finally {
      // Set even on failure: a retry belongs to an explicit trigger (login,
      // locale change), not to every component that happens to mount.
      loaded.value = true;
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
    loaded,
    unreadCount,
    fetchNotifications,
    markNotificationsRead,
  };
}

/**
 * SSR loader — call from useAsyncData in app.vue, after the session and locale
 * resolve (it needs both). Server-only: the list and its `loaded` flag are
 * `useState`, so they travel in the payload and the browser makes no request.
 * Anonymous visitors no-op inside `fetchNotifications`.
 */
export async function fetchNotificationsSsr(): Promise<boolean> {
  if (!import.meta.server) return false;
  const { fetchNotifications } = useNotifications();
  await fetchNotifications();
  return true;
}
