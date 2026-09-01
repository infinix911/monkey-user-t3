/**
 * useInquiryFeed — the inquiry list behind the "Inquiry" account section.
 *
 * Lifted out of useProfileMenu so any surface that renders the section (the
 * mobile modal, the desktop panel behind the sidebar) reads the same list
 * instead of each fetching its own. State is `useState`, so the unread flag and
 * the page cursor survive moving between those surfaces.
 */

import { storeToRefs } from "pinia";
import { useMemberInboxStore } from "@/stores/member-inbox";

/**
 * Shared inquiry list state and its fetchers.
 *
 * @returns {object} The list, the current page, and load/refresh/reset actions.
 */
export function useInquiryFeed() {
  const inbox = useMemberInboxStore();
  const { currentInquiryData: data, currentPage: page } = storeToRefs(inbox);

  /**
   * Loads one page of inquiries and republishes the unread flag.
   *
   * @param target - 1-based page to load.
   * @returns {Promise<void>} Resolves once the request settles.
   */
  async function load(target: number = 1): Promise<void> { await inbox.loadInquiries(target); }

  /**
   * Reloads the current page.
   *
   * @returns {Promise<void>} Resolves once the request settles.
   */
  async function refresh(): Promise<void> {
    await inbox.refreshInquiries();
  }

  /**
   * Drops the loaded list so the next open starts from page 1.
   *
   * @returns {void}
   */
  function reset(): void {
    inbox.invalidateInquiries();
  }

  return { data, page, load, refresh, reset };
}
