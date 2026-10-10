/**
 * Deposit / withdraw visibility: `canDepWid` from GET /auth/get-session hides
 * every deposit and withdraw entry point when it is explicitly false. Pins the
 * rule (true / false / missing / guest / payments off), that the live
 * composable follows a re-verified session, and the click safety net.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import {
  isDepositWithdrawAllowed,
  useDepositWithdrawAllowed,
} from "@/composables/useDepositWithdrawAllowed";
import {
  defaultUserState,
  mapVerifyUserToState,
  type VerifyUserResponse,
} from "@/interfaces/auth.interface";
import { useAuthStore } from "@/stores/auth";
import { useUiStore } from "@/stores/ui";

const swal = vi.hoisted(() => ({ showErrorAlert: vi.fn(async () => undefined) }));
vi.mock("~~/utils/swal-alert", async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  showErrorAlert: swal.showErrorAlert,
}));

const session = (canDepWid?: boolean): VerifyUserResponse => ({
  id: "m-1", upperId: null, depth: 1, username: "member", bankName: "Bank", bankAccount: "1234",
  bankAccountName: "Holder", phone: "0100000000", userType: 1, wallet: "0", pointWallet: "0",
  ...(canDepWid === undefined ? {} : { canDepWid }),
});

describe("deposit / withdraw permission rule", () => {
  it("shows them when the session allows it", () => {
    expect(isDepositWithdrawAllowed(true, mapVerifyUserToState(session(true), "KRW"))).toBe(true);
  });

  it("hides them when the session explicitly denies it", () => {
    expect(isDepositWithdrawAllowed(true, mapVerifyUserToState(session(false), "KRW"))).toBe(false);
  });

  it("treats a missing canDepWid as allowed (older API)", () => {
    expect(isDepositWithdrawAllowed(true, mapVerifyUserToState(session(), "KRW"))).toBe(true);
  });

  it("keeps them for guests, who get the login prompt instead", () => {
    expect(isDepositWithdrawAllowed(true, defaultUserState)).toBe(true);
  });

  it("hides them when payments are off for the deployment", () => {
    expect(isDepositWithdrawAllowed(false, mapVerifyUserToState(session(true), "KRW"))).toBe(false);
  });
});

describe("useDepositWithdrawAllowed / useNavTransactionActions", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    swal.showErrorAlert.mockClear();
  });

  it("re-evaluates live when the session is re-verified", () => {
    const auth = useAuthStore();
    const allowed = useDepositWithdrawAllowed();
    expect(allowed.value).toBe(true); // guest defaults
    auth.user = mapVerifyUserToState(session(false), "KRW");
    expect(allowed.value).toBe(false);
    auth.user = mapVerifyUserToState(session(true), "KRW");
    expect(allowed.value).toBe(true);
  });

  it("a stale click on a denied member shows the unavailable message instead of the modal", async () => {
    const auth = useAuthStore();
    const ui = useUiStore();
    auth.user = mapVerifyUserToState(session(false), "KRW");
    const { onDeposit, onWithdraw } = useNavTransactionActions();
    await onDeposit();
    await onWithdraw();
    expect(swal.showErrorAlert).toHaveBeenCalledTimes(2);
    expect(ui.showDepositModal).toBe(false);
    expect(ui.showWithdrawalModal).toBe(false);
  });
});
