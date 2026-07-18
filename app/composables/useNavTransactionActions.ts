/**
 * Deposit / withdraw click behaviour shared by every nav transaction skin
 * (NavTransactionDefault, NavTransactionLucky, …). Opens the relevant modal
 * when authenticated, otherwise prompts login. Keeping it here avoids
 * duplicating the auth gate in each skin component.
 */
export function useNavTransactionActions() {
  const authStore = useAuthStore();
  const uiStore = useUiStore();

  const onDeposit = () => {
    if (authStore.isAuthenticated) {
      uiStore.setShowDepositModal(true);
    } else {
      uiStore.setShowLoginModal(true);
    }
  };

  const onWithdraw = () => {
    if (authStore.isAuthenticated) {
      uiStore.setShowWithdrawalModal(true);
    } else {
      uiStore.setShowLoginModal(true);
    }
  };

  return { onDeposit, onWithdraw };
}
