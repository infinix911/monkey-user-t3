import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { useApi } from "@/composables/useApi";
import { formatDateAsISO } from "~/lib/date";
import { validateResponse } from "@/lib/validateResponse";
import {
  inquiriesResponseWireSchema,
  inquiryRepliesResponseWireSchema,
  mapInquiriesResponse,
  mapRepliesResponse,
  type InquiriesResponse,
  type RepliesResponse,
} from "@/interfaces/inquiry.interface";
import {
  notificationsResponseSchema,
  mapNotification,
  type NotificationItem,
} from "@/interfaces/notification.interface";

const INQUIRY_DATE_RANGE = 30;
const INQUIRY_LIMIT = 10;

type Status = "idle" | "loading" | "ready" | "error";

interface NotificationEntry {
  data: NotificationItem[];
  status: Status;
}

/**
 * Member-scoped inbox data. This store is intentionally memory-only: it is
 * shared by every authenticated surface during one SPA session and must be
 * cleared when that session ends.
 */
export const useMemberInboxStore = defineStore("memberInbox", () => {
  const notificationEntries = ref<Record<string, NotificationEntry>>({});
  const inquiryPages = ref<Record<number, InquiriesResponse>>({});
  const repliesByInquiry = ref<Record<string, RepliesResponse>>({});
  const currentPage = ref(1);
  const inquiryStatus = ref<Status>("idle");
  const notificationRequests = new Map<string, Promise<void>>();
  const inquiryRequests = new Map<number, Promise<void>>();
  const replyRequests = new Map<string, Promise<RepliesResponse | null>>();

  const currentInquiryData = computed(
    () => inquiryPages.value[currentPage.value] ?? null,
  );
  const unreadInquiryCount = computed(() => {
    const seen = new Set<string>();
    return Object.values(inquiryPages.value).reduce((total, page) =>
      total + page.data.reduce((pageTotal, inquiry) => {
        if (seen.has(inquiry.id)) return pageTotal;
        seen.add(inquiry.id);
        return pageTotal + Math.max(0, inquiry.member_unread ?? 0);
      }, 0), 0);
  });
  const hasUnreadInquiries = computed(() => unreadInquiryCount.value > 0);

  const notificationEntry = (locale: string): NotificationEntry =>
    notificationEntries.value[locale] ?? { data: [], status: "idle" };

  const notificationsFor = (locale: string) =>
    computed(() => notificationEntry(locale).data);
  const notificationsLoadedFor = (locale: string) =>
    computed(() => notificationEntry(locale).status !== "idle");
  const unreadNotificationsFor = (locale: string) =>
    computed(() => notificationsFor(locale).value.filter((item) => !item.is_read).length);

  async function loadNotifications(locale: string, force = false): Promise<void> {
    const existing = notificationEntry(locale);
    if (!force && existing.status === "ready") return;
    const inFlight = notificationRequests.get(locale);
    if (inFlight) return inFlight;

    const request = (async () => {
      notificationEntries.value = {
        ...notificationEntries.value,
        [locale]: { ...existing, status: "loading" },
      };
      try {
        const raw = await useApi()("/notifications", { query: { lang: locale } });
        notificationEntries.value = {
          ...notificationEntries.value,
          [locale]: {
            data: validateResponse(notificationsResponseSchema, raw, "/notifications").map(mapNotification),
            status: "ready",
          },
        };
      } catch {
        notificationEntries.value = {
          ...notificationEntries.value,
          [locale]: { data: [], status: "error" },
        };
      } finally {
        notificationRequests.delete(locale);
      }
    })();
    notificationRequests.set(locale, request);
    return request;
  }

  async function markAllNotificationsRead(locale: string): Promise<void> {
    const entry = notificationEntry(locale);
    if (entry.data.every((item) => item.is_read)) return;
    await useApi()("/notifications/read-all", { method: "PATCH" });
    notificationEntries.value = {
      ...notificationEntries.value,
      [locale]: { ...entry, data: entry.data.map((item) => ({ ...item, is_read: true })) },
    };
  }

  async function loadInquiries(page = 1, force = false): Promise<void> {
    if (!force && inquiryPages.value[page]) {
      currentPage.value = page;
      return;
    }
    const inFlight = inquiryRequests.get(page);
    if (inFlight) return inFlight;
    const request = (async () => {
      inquiryStatus.value = "loading";
      try {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - INQUIRY_DATE_RANGE);
        const raw = await useApi()("/inquiries", {
          query: { page, limit: INQUIRY_LIMIT, startDate: formatDateAsISO(startDate), endDate: formatDateAsISO(endDate) },
        });
        inquiryPages.value = {
          ...inquiryPages.value,
          [page]: mapInquiriesResponse(validateResponse(inquiriesResponseWireSchema, raw, "/inquiries")),
        };
        currentPage.value = page;
        inquiryStatus.value = "ready";
      } catch (error) {
        inquiryStatus.value = "error";
        console.error("Error fetching inquiries:", error);
      } finally {
        inquiryRequests.delete(page);
      }
    })();
    inquiryRequests.set(page, request);
    return request;
  }

  async function refreshInquiries(): Promise<void> {
    await loadInquiries(currentPage.value, true);
  }

  async function loadReplies(inquiryId: string, force = false): Promise<RepliesResponse | null> {
    if (!force && repliesByInquiry.value[inquiryId]) return repliesByInquiry.value[inquiryId];
    const inFlight = replyRequests.get(inquiryId);
    if (inFlight) return inFlight;
    const request = (async () => {
      try {
        const raw = await useApi()(`/inquiries/${inquiryId}/replies`, { query: { limit: 20 } });
        const replies = mapRepliesResponse(validateResponse(inquiryRepliesResponseWireSchema, raw, "/inquiries/replies"));
        repliesByInquiry.value = { ...repliesByInquiry.value, [inquiryId]: replies };
        return replies;
      } catch (error) {
        console.error("Error fetching inquiry replies:", error);
        return null;
      } finally {
        replyRequests.delete(inquiryId);
      }
    })();
    replyRequests.set(inquiryId, request);
    return request;
  }

  function invalidateInquiries(resetPage = true): void {
    inquiryPages.value = {};
    repliesByInquiry.value = {};
    if (resetPage) currentPage.value = 1;
    inquiryStatus.value = "idle";
  }

  function clear(): void {
    notificationEntries.value = {};
    invalidateInquiries();
  }

  return {
    currentPage, currentInquiryData, inquiryPages, inquiryStatus, repliesByInquiry,
    unreadInquiryCount, hasUnreadInquiries, notificationsFor, notificationsLoadedFor,
    unreadNotificationsFor, loadNotifications, markAllNotificationsRead, loadInquiries,
    refreshInquiries, loadReplies, invalidateInquiries, clear,
  };
});
