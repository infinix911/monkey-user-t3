/**
 * Deposit / withdraw click behaviour shared by every entry point (the nav
 * transaction skins NavTransactionDefault / NavTransactionLucky, the desktop
 * rail, the mobile bottom nav). Opens the relevant modal when authenticated,
 * otherwise prompts login. Keeping it here avoids duplicating the auth gate in
 * each skin component.
 */
import { showErrorAlert } from "~~/utils/swal-alert";

export function useNavTransactionActions() {
  const authStore = useAuthStore();
  const uiStore = useUiStore();
  const { $i18n } = useNuxtApp();
  // Deposit / withdraw permission (useDepositWithdrawAllowed). Every entry
  // point is already hidden when it is false; this is the safety net for a
  // stale button (the flag can flip when the session is re-verified).
  const depWidAllowed = useDepositWithdrawAllowed();

  /**
   * Gate then open. Unread inquiry replies block transacting — see
   * `blockedByUnreadInquiries`. Checked after the auth gate: a guest has no
   * inquiries, and login is the more useful prompt for them.
   */
  const open = async (kind: "deposit" | "withdrawal") => {
    if (!authStore.isAuthenticated) {
      uiStore.setShowLoginModal(true);
      return;
    }
    if (!depWidAllowed.value) {
      await showErrorAlert(String($i18n.t("apiMessages.DEPOSIT_WITHDRAWAL_NOT_ALLOWED")));
      return;
    }
    if (await blockedByUnreadInquiries()) return;
    if (kind === "deposit") uiStore.setShowDepositModal(true);
    else uiStore.setShowWithdrawalModal(true);
  };

  const onDeposit = () => open("deposit");
  const onWithdraw = () => open("withdrawal");

  return { onDeposit, onWithdraw };
}
