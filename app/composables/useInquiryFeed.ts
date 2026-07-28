/**
 * useInquiryFeed — the inquiry list behind the "Inquiry" account section.
 *
 * Lifted out of useProfileMenu so any surface that renders the section (the
 * mobile modal, the desktop panel behind the sidebar) reads the same list
 * instead of each fetching its own. State is `useState`, so the unread flag and
 * the page cursor survive moving between those surfaces.
 */

import { useApi } from "@/composables/useApi";
import { formatDateAsISO } from "~/lib/date";
import { validateResponse } from "@/lib/validateResponse";
import {
  inquiriesResponseWireSchema,
  mapInquiriesResponse,
  type InquiriesResponse,
} from "@/interfaces/inquiry.interface";

/** How many days back the inquiry list reaches. */
const INQUIRY_DATE_RANGE = 30;
/** Page size for the inquiry list. */
const INQUIRY_LIMIT = 10;

/**
 * Shared inquiry list state and its fetchers.
 *
 * @returns {object} The list, the current page, and load/refresh/reset actions.
 */
export function useInquiryFeed() {
  const api = useApi();
  const uiStore = useUiStore();

  const data = useState<InquiriesResponse | null>("inquiry-feed", () => null);
  const page = useState<number>("inquiry-feed-page", () => 1);

  /**
   * Loads one page of inquiries and republishes the unread flag.
   *
   * @param target - 1-based page to load.
   * @returns {Promise<void>} Resolves once the request settles.
   */
  async function load(target: number = 1): Promise<void> {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - INQUIRY_DATE_RANGE);
      const raw = await api("/inquiries", {
        query: {
          page: target,
          limit: INQUIRY_LIMIT,
          startDate: formatDateAsISO(startDate),
          endDate: formatDateAsISO(endDate),
        },
      });
      const mapped = mapInquiriesResponse(
        validateResponse(inquiriesResponseWireSchema, raw, "/inquiries"),
      );
      data.value = mapped;
      page.value = target;
      uiStore.setHasUnreadInquiries(
        mapped.data.some((inquiry) => inquiry.member_unread > 0),
      );
    } catch (error) {
      console.error("Error fetching inquiries:", error);
    }
  }

  /**
   * Reloads the current page.
   *
   * @returns {Promise<void>} Resolves once the request settles.
   */
  async function refresh(): Promise<void> {
    await load(page.value);
  }

  /**
   * Drops the loaded list so the next open starts from page 1.
   *
   * @returns {void}
   */
  function reset(): void {
    data.value = null;
    page.value = 1;
  }

  return { data, page, load, refresh, reset };
}
