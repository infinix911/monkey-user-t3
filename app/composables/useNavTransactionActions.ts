/**
 * Deposit / withdraw click behaviour shared by every nav transaction skin
 * (NavTransactionDefault, NavTransactionLucky, …). Opens the relevant modal
 * when authenticated, otherwise prompts login. Keeping it here avoids
 * duplicating the auth gate in each skin component.
 */
export function useNavTransactionActions() {
  const authStore = useAuthStore();
  const uiStore = useUiStore();

  // Unread inquiry replies block transacting — see `blockedByUnreadInquiries`.
  // Checked after the auth gate: a guest has no inquiries, and login is the
  // more useful prompt for them.
  const onDeposit = async () => {
    if (!authStore.isAuthenticated) {
      uiStore.setShowLoginModal(true);
      return;
    }
    if (await blockedByUnreadInquiries()) return;
    uiStore.setShowDepositModal(true);
  };

  const onWithdraw = async () => {
    if (!authStore.isAuthenticated) {
      uiStore.setShowLoginModal(true);
      return;
    }
    if (await blockedByUnreadInquiries()) return;
    uiStore.setShowWithdrawalModal(true);
  };

  return { onDeposit, onWithdraw };
}
