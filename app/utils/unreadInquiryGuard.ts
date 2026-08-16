/**
 * Unread-inquiry gate (auto-imported).
 *
 * While a member has unread inquiry replies, they cannot deposit, withdraw,
 * convert points, launch a game, or open another account panel: every one of
 * those entry points calls this first, and a truthy return means "stop".
 *
 * The rule exists because an unread reply is usually the operator asking for
 * something — a document, a corrected bank account, an explanation of a
 * deposit — and letting the member carry on transacting buries it.
 *
 * When it blocks it shows a warning (so the member knows they must read the
 * pending inquiry) and then opens the standalone `InquiryModal`
 * (`uiStore.setShowInquiryModal`). That modal is a full-screen overlay that
 * cannot be dismissed until every unread reply is read
 * (InquiryModal.handleCloseClick), so it blocks the attempted action — and
 * everything else — until the member deals with the message. The layout also
 * calls this whenever the flag flips (see default.vue), so the block is not
 * limited to explicitly-guarded actions. The alert is suppressed when the modal
 * is already open, so the two paths never stack two warnings.
 *
 * @see app/components/inquiry/InquiryContent.vue — 전체 읽기 clears the flag
 */
import { showErrorAlert } from "~~/utils/swal-alert";

/**
 * Whether the action should be blocked because unread replies are waiting.
 * Warns the member and opens the (non-dismissible) inquiry modal when it blocks.
 *
 * @returns {Promise<boolean>} True when the caller must abort.
 */
export async function blockedByUnreadInquiries(): Promise<boolean> {
  // Never gates SSR — the flag is populated client-side after the feed loads.
  if (import.meta.server) return false;

  const uiStore = useUiStore();
  if (!uiStore.hasUnreadInquiries) return false;

  // Already blocking (modal open) — abort without stacking a second warning.
  if (uiStore.showInquiryModal) return true;

  const { $i18n } = useNuxtApp();
  const t = (key: string): string => String($i18n.t(key));

  // Warn first (so the member knows why), then open the non-dismissible modal.
  await showErrorAlert(
    t("inquiry.unreadMessages"),
    t("inquiry.mustReadMessages"),
  );
  uiStore.setShowInquiryModal(true);
  return true;
}
