/**
 * Unread-inquiry gate (auto-imported).
 *
 * While a member has unread inquiry replies, they cannot deposit, withdraw,
 * convert points, launch a game, or open another account panel: every one of
 * those entry points calls this first, and a truthy return means "stop, the
 * warning has been shown".
 *
 * The rule exists because an unread reply is usually the operator asking for
 * something — a document, a corrected bank account, an explanation of a
 * deposit — and letting the member carry on transacting buries it.
 *
 * The guard is deliberately NOT inside the ui-store setters. Those are plain
 * synchronous flag writes used by code that does not await them, so a modal
 * would open behind the alert. Gating the click handler instead keeps the
 * decision where the intent is.
 *
 * `uiStore.hasUnreadInquiries` is the account-wide flag maintained by the
 * inquiry feed — the same one that already blocks closing the inquiry modal
 * (InquiryModal.handleCloseClick, useProfileMenu.closeMobileModal), so the two
 * halves of the rule cannot disagree.
 *
 * @see app/components/inquiry/InquiryContent.vue — 전체 읽기 clears the flag
 */
import { showErrorAlert } from "~~/utils/swal-alert";

/**
 * Whether the action should be blocked because unread replies are waiting.
 *
 * Shows the warning and opens the inquiry modal when it blocks, so the member
 * lands on the thing they have to deal with instead of being told "no" twice.
 *
 * @returns {Promise<boolean>} True when the caller must abort.
 */
export async function blockedByUnreadInquiries(): Promise<boolean> {
  // Never gates SSR — the flag is populated client-side after the feed loads.
  if (import.meta.server) return false;

  const uiStore = useUiStore();
  if (!uiStore.hasUnreadInquiries) return false;

  const { $i18n } = useNuxtApp();
  const t = (key: string): string => String($i18n.t(key));

  // Awaited: the warning is dismissed (OK pressed) BEFORE the inquiry surface
  // opens, so the two never stack. Only then take them to the unread thread —
  // otherwise the warning names a screen they have to go and find.
  await showErrorAlert(t("inquiry.unreadMessages"), t("inquiry.mustReadMessages"));
  await nextTick();
  openInquirySurface();
  return true;
}

/**
 * Open inquiries the same way the sidebar does.
 *
 * Deliberately NOT `uiStore.setShowInquiryModal(true)`: that renders the
 * standalone `InquiryModal`, which carries its own chrome and therefore looked
 * like a different screen from the one the sidebar opens. Both surfaces render
 * the same `AccountSectionPanel`, so selecting the section gives one consistent
 * inquiry UI however the member got there.
 *
 * Desktop: `AppSidebar` renders the panel as soon as a section is selected.
 * Mobile: the panel lives inside `NewProfileModal`, which has to be opened too
 * — the same pair the bottom nav's 공지사항 button uses.
 */
function openInquirySurface(): void {
  const uiStore = useUiStore();
  useAccountSection().open("inquiry");
  if (uiStore.isMobile) uiStore.setShowProfileModal(true);
}
