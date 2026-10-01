/**
 * Localised label for a `member_wallet_logs.transaction` value (auto-imported).
 *
 * The column holds two kinds of value (full list and sources:
 * `monkey/memberwalletlogs.md`):
 *
 * 1. **Fixed values** written by the APIs — `DEPOSIT_APPROVED`,
 *    `User Withdrawal`, `Agent Wallet Transfer (ADD)`, … — plus values only
 *    filtered on, and historical values older rows still carry. They mix
 *    SCREAMING_SNAKE, Title Case and parenthesised forms, so they map to
 *    camelCase keys under `walletLogs.transactionTypes.*` (spaces and brackets
 *    are not valid i18n key paths). Same keys and wording as monkey-admin.
 * 2. **Game lobby names** written by the game-provider callback
 *    (`Pragmatic Slots`, `Evolution`, …). These reuse `providerDisplayName`
 *    (`game.providers.*`), so a lobby reads the same here as on the game cards;
 *    a trailing stakes marker (`Evolution 1:1`) is kept after the brand.
 *
 * Anything unrecognised is returned unchanged, so a new value from the server
 * shows as itself instead of a raw i18n key.
 */
import { providerDisplayName } from "~/utils/gameProviderLogo";

type Translate = (key: string, params?: Record<string, unknown>) => string;
type Exists = (key: string) => boolean;

/** Fixed `transaction` value → key under `walletLogs.transactionTypes`. */
const FIXED_TYPES: Record<string, string> = {
  // Written by the APIs today.
  DEPOSIT_APPROVED: "depositApproved",
  WITHDRAWAL_REJECTED: "withdrawalRejected",
  AUTO_BET_REFUND: "autoBetRefund",
  "User Withdrawal": "userWithdrawal",
  WALLET_TRANSFER_SEND: "walletTransferSend",
  WALLET_TRANSFER_RECEIVE: "walletTransferReceive",
  "Agent Wallet Transfer (ADD)": "agentWalletTransferAdd",
  "Agent Wallet Transfer (DEDUCT)": "agentWalletTransferDeduct",
  // Filtered on by monkey-user-api but never written.
  WITHDRAWAL_REQUESTED: "withdrawalRequested",
  WITHDRAWAL_CANCELLED: "withdrawalCancelled",
  WITHDRAWAL_APPROVED: "withdrawalApproved",
  ADMIN_WALLET_ADJUSTMENT: "adminWalletAdjustment",
  POINT_EXCHANGE: "pointExchange",
  // Historical — no longer written, still present in older rows.
  WITHDRAW_CANCEL: "withdrawalCancelled",
  WITHDRAWAL_CANCEL: "withdrawalCancelled",
  ADMIN_ADD: "adminAdd",
  ADMIN_DEDUCT: "adminDeduct",
  DEPOSIT: "deposit",
  DEPOSIT_AUTO: "depositAuto",
  POINT_WITHDRAWAL: "pointWithdrawal",
};

/** Historical `<PROVIDER>_WITHDRAWAL` game-wallet withdrawals (SnowPlay / Khan). */
const GAME_WALLET_WITHDRAWAL = /^((?:SNOW_[A-Z0-9]+)|KH)_WITHDRAWAL$/;

/** A trailing stakes marker such as `1:1` / `1:10`. */
const STAKES_SUFFIX = /^(.*?)\s+(\d+\s*:\s*\d+)$/;

/**
 * `<lobby name> - <note>` written by the game-provider callback, e.g.
 * `Pragmatic Slots - 최대 당첨금 초과 차감`. The note arrives in Korean, so it is
 * mapped to `walletLogs.notes.*` for English. Same handling as monkey-admin.
 */
const NOTE_SUFFIX = /^(.+?)\s+-\s+(.+)$/;

/** Game-service note text → key under `walletLogs.notes`. */
const NOTES: Record<string, string> = {
  "최대 당첨금 초과 차감": "maxWinExceededDeduction",
};

/**
 * Localised label for a wallet-log `transaction` value.
 *
 * @param {Translate} t - vue-i18n `t`.
 * @param {Exists} te - vue-i18n `te`.
 * @param {unknown} value - Raw `transaction` value.
 * @returns {string} The label, or the raw value when it is not recognised.
 */
export function walletLogTransactionLabel(t: Translate, te: Exists, value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";

  const fixed = FIXED_TYPES[raw];
  if (fixed) {
    const key = `walletLogs.transactionTypes.${fixed}`;
    return te(key) ? t(key) : raw;
  }

  const withdrawal = GAME_WALLET_WITHDRAWAL.exec(raw);
  if (withdrawal?.[1]) {
    const key = "walletLogs.transactionTypes.gameWalletWithdrawal";
    return te(key) ? t(key, { provider: withdrawal[1] }) : raw;
  }

  // Lobby name + note: label each half; an unknown note passes through as-is.
  const noted = NOTE_SUFFIX.exec(raw);
  if (noted?.[1] && noted[2]) {
    const noteKey = NOTES[noted[2]] ? `walletLogs.notes.${NOTES[noted[2]]}` : "";
    const note = noteKey && te(noteKey) ? t(noteKey) : noted[2];
    return `${walletLogTransactionLabel(t, te, noted[1])} - ${note}`;
  }

  // Game lobby name; providerDisplayName falls back to the name itself.
  const name = providerDisplayName(t, te, null, raw);
  if (name !== raw) return name;
  const stakes = STAKES_SUFFIX.exec(raw);
  if (stakes?.[1] && stakes[2]) {
    const base = providerDisplayName(t, te, null, stakes[1]);
    if (base !== stakes[1]) return `${base} ${stakes[2]}`;
  }
  return raw;
}
