/**
 * useAccountSections — the single source of truth for "My Account" sections.
 *
 * A section is a menu id that opens a panel (transaction ledger, betting report,
 * inquiry, …) rather than navigating or opening a feature modal. The id → panel
 * map used to live inside NewProfileModal.vue, which meant the modal was the
 * only surface that could resolve a section; the desktop sidebar had to poke at
 * the modal to show one. It lives here so every surface resolves sections the
 * same way.
 *
 * The selection itself is `useState`, so the sidebar (which opens a section) and
 * the panel (which renders it) are the same state rather than two copies kept in
 * sync by hand.
 */

import type { Component } from "vue";
import { storeToRefs } from "pinia";
import Referral from "~/components/my-account/Referral.vue";
import BettingReport from "~/components/my-account/BettingReport.vue";
import LoginHistory from "~/components/my-account/LoginHistory.vue";
import ChangePassword from "~/components/my-account/ChangePassword.vue";
import TransactionLogs from "~/components/my-account/TransactionLogs.vue";
import PromotionContent from "~/components/promotion/PromotionContent.vue";
import NoticeContent from "~/components/notice/NoticeContent.vue";
import InquiryContent from "~/components/inquiry/InquiryContent.vue";
import ContactContent from "~/components/contact/ContactContent.vue";
import ProfileFeatureModals from "~/components/profile/ProfileFeatureModals.vue";

/** A selected account section id, or `null` when none is open. */
export type AccountSection = string | null;

/**
 * Menu id → panel component. Keys match the CMS item names (camelCase) and the
 * bundled menu ids; `transaksi`/`transaction` are the same ledger under two ids
 * the API has used.
 */
export const ACCOUNT_SECTION_COMPONENTS = {
  referral: Referral,
  bettingReport: BettingReport,
  loginHistory: LoginHistory,
  changePassword: ChangePassword,
  transaksi: TransactionLogs,
  transaction: TransactionLogs,
  promotion: PromotionContent,
  // `faq` is the CMS id for this slot; the surface it opens is the notices
  // list — only the label ever said FAQ, and the product no longer has one.
  faq: NoticeContent,
  notice: NoticeContent,
  inquiry: InquiryContent,
  contact: ContactContent,
  activity: ProfileFeatureModals,
} satisfies Record<string, Component>;

/**
 * Whether a menu id opens an account panel.
 *
 * @param id - Menu item id, as supplied by the CMS or the bundled fallback.
 * @returns {boolean} True when the id resolves to a panel component.
 */
export function isAccountSection(id: string): boolean {
  return id in ACCOUNT_SECTION_COMPONENTS;
}

/**
 * Shared account-section selection.
 *
 * @returns {object} The current section, its component, and open/close actions.
 */
export function useAccountSection() {
  const uiStore = useUiStore();
  const { accountSection: section } = storeToRefs(uiStore);

  /** The panel component for the current section, or `null` when none/unknown. */
  const component = computed<Component | null>(() => {
    const id = section.value;
    if (!id || !isAccountSection(id)) return null;
    return ACCOUNT_SECTION_COMPONENTS[
      id as keyof typeof ACCOUNT_SECTION_COMPONENTS
    ];
  });

  /**
   * Opens a section. Unknown ids are ignored, so a stale CMS id leaves the
   * current view alone instead of opening a blank panel.
   *
   * @param id - Section id to open.
   * @returns {void}
   */
  function open(id: string): void {
    if (isAccountSection(id)) uiStore.setAccountSection(id);
  }

  /**
   * Closes the open section.
   *
   * @returns {void}
   */
  function close(): void {
    uiStore.setAccountSection(null);
  }

  return { section, component, open, close };
}
