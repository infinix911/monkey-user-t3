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
 * (InquiryModal.handleCloseClick), so it blocks the attempted action until the
 * member deals with the message.
 *
 * ONLY guarded actions reach here. `useUnreadInquiryGate` — which runs on every
 * page — raises `showUnreadInquiryAlert()` alone when replies arrive, so simply
 * being on the site no longer forces the modal open; the member is interrupted
 * where money or a game launch is at stake, not on arrival.
 *
 * @see app/components/inquiry/InquiryContent.vue — 전체 읽기 clears the flag
 */
import { showSwalAlert } from "~~/utils/swal-alert";

/**
 * True from the moment the warning is raised until the member dismisses it.
 *
 * `showInquiryModal` alone cannot carry this: it is only set AFTER the member
 * clicks OK, leaving the whole time the dialog is on screen unlatched. The gate
 * in useUnreadInquiryGate watches several flags that settle a tick apart, so a
 * second trigger arrives inside that window and queued a duplicate dialog
 * behind the first - the member dismissed the warning and got it again.
 */
let warningInFlight = false;

/**
 * The unread-reply warning, shared by every surface that raises it (this guard
 * and the two close handlers) so the wording and the icon cannot drift apart.
 *
 * The icon is the envelope, not the red `error` cross: nothing failed - there
 * is a message waiting, which is what the dialog is there to say.
 */
export async function showUnreadInquiryAlert(): Promise<void> {
  if (warningInFlight) return;
  warningInFlight = true;
  try {
    const { $i18n } = useNuxtApp();
    await showSwalAlert({
      title: String($i18n.t("inquiry.unreadMessages")),
      icon: "message",
    });
  } finally {
    warningInFlight = false;
  }
}

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

  // Already blocking (warning up, or modal open) — abort without stacking a
  // second warning.
  if (warningInFlight || uiStore.showInquiryModal) return true;

  // Warn first (so the member knows why), then open the non-dismissible modal.
  await showUnreadInquiryAlert();
  uiStore.setShowInquiryModal(true);
  return true;
}
