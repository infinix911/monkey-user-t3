/**
 * Deposit / withdrawal amount limits, driven by the CMS.
 *
 * `GET /site/settings` returns flat key/value rows that `fetchSiteSettings()`
 * folds into `useSiteStore().siteSettings`:
 *
 *   deposits:minimum          "10000"
 *   deposits:maximum          "10000000"
 *   deposits:divisible        "1000"
 *   deposits:cooldown-minutes "30"
 *   withdrawals:*             (same four keys)
 *
 * Every value arrives as a **string**, and any key may be absent on a site that
 * hasn't configured it — so parse defensively and fall back rather than letting
 * `NaN` reach a comparison (`amount >= NaN` is always false, which would reject
 * every amount and look like a broken form).
 */

import { useSiteStore } from "@/stores/site";

export type TransactionKind = "deposits" | "withdrawals";

export interface TransactionLimits {
  minimum: number;
  maximum: number;
  /** Amount must be a whole multiple of this. `0` disables the check. */
  divisible: number;
  cooldownMinutes: number;
}

/**
 * Fallbacks used when a key is missing or unparseable. Deliberately permissive:
 * a missing CMS value should not block a legitimate deposit, and the backend
 * validates the real limits again on submit.
 */
const FALLBACK: Record<TransactionKind, TransactionLimits> = {
  deposits: {
    minimum: 0,
    maximum: Number.POSITIVE_INFINITY,
    divisible: 0,
    cooldownMinutes: 0,
  },
  withdrawals: {
    minimum: 0,
    maximum: Number.POSITIVE_INFINITY,
    divisible: 0,
    cooldownMinutes: 0,
  },
};

/** Parse a setting to a finite non-negative number, or `undefined`. */
function toNumber(raw: string | undefined): number | undefined {
  if (raw == null || raw === "") return undefined;
  const n = Number(raw);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

/**
 * Reactive limits for one transaction kind.
 *
 * @param kind - `"deposits"` or `"withdrawals"` (matches the setting prefix).
 */
export function useTransactionLimits(kind: TransactionKind) {
  const siteStore = useSiteStore();

  return computed<TransactionLimits>(() => {
    const s = siteStore.siteSettings ?? {};
    const fallback = FALLBACK[kind];
    return {
      minimum: toNumber(s[`${kind}:minimum`]) ?? fallback.minimum,
      maximum: toNumber(s[`${kind}:maximum`]) ?? fallback.maximum,
      divisible: toNumber(s[`${kind}:divisible`]) ?? fallback.divisible,
      cooldownMinutes:
        toNumber(s[`${kind}:cooldown-minutes`]) ?? fallback.cooldownMinutes,
    };
  });
}
