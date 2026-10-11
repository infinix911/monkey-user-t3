/**
 * Whether deposit / withdraw entry points are shown — the single source of
 * truth for every button, slot and panel that opens the deposit or withdrawal
 * modal.
 *
 * UI only: the member API still enforces this on the routes themselves
 * (`DEPOSIT_WITHDRAWAL_NOT_ALLOWED`); hiding the controls just stops a denied
 * member from reaching a form that would be refused.
 *
 * Two gates, both required:
 * - `features.payments` — deployment-wide, derived from the site currency.
 * - `can_dep_wid` — per member, from `GET /auth/get-session` `canDepWid`. It is
 *   false only when the backend explicitly says false (a missing field means
 *   allowed), matching isDepositWithdrawalAllowed() in monkey-user-api.
 *
 * Guests: allowed. The logged-out user state defaults `can_dep_wid` to true,
 * so a guest still sees Deposit / Withdraw where a surface shows them to
 * guests, and gets the login prompt on tap.
 */
import type { UserState } from "~/interfaces/auth.interface";

/**
 * Pure rule, exported for tests.
 *
 * @param payments - Deployment payments feature flag.
 * @param user - Current user state (guest = logged-out defaults).
 * @returns {boolean} True when deposit / withdraw should be shown.
 */
export function isDepositWithdrawAllowed(
  payments: boolean,
  user: Pick<UserState, "can_dep_wid">,
): boolean {
  return payments && user.can_dep_wid !== false;
}

/**
 * Live flag: re-evaluates whenever the session is re-verified (the auth store
 * replaces `user`), so entry points appear/disappear without a reload.
 *
 * @returns {ComputedRef<boolean>} True when deposit / withdraw should be shown.
 */
export function useDepositWithdrawAllowed() {
  const authStore = useAuthStore();
  const features = useFeatures();
  return computed(() =>
    isDepositWithdrawAllowed(features.payments, authStore.user),
  );
}
