/**
 * Member notifications, shared by every surface that opens the panel.
 *
 * The desktop header bell and mobile bottom-nav button share the Pinia inbox
 * store, including its locale-keyed cache and mark-all-read mutation.
 *
 * The read is member-scoped and locale-scoped, so it re-runs on login and on a
 * language switch, and empties on logout.
 */
import { computed } from "vue";
import { useMemberInboxStore } from "@/stores/member-inbox";

export function useNotifications() {
  const authStore = useAuthStore();
  const { locale } = useI18n();
  const inbox = useMemberInboxStore();
  const notifications = computed(() => inbox.notificationsFor(locale.value).value);
  const loaded = computed(() => inbox.notificationsLoadedFor(locale.value).value);
  const unreadCount = computed(() => inbox.unreadNotificationsFor(locale.value).value);

  const fetchNotifications = async (force = false) => {
    if (!authStore.isAuthenticated) return;
    await inbox.loadNotifications(locale.value, force);
  };

  /** Local-only: the panel marks everything read server-side as it opens. */
  const markNotificationsRead = () => inbox.markAllNotificationsRead(locale.value);

  return {
    notifications,
    loaded,
    unreadCount,
    fetchNotifications,
    markNotificationsRead,
    clear: inbox.clear,
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
