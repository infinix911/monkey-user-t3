import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";
import type { TransactionLimits } from "@/composables/useTransactionLimits";

/** `t` with optional interpolation params (vue-i18n named formatting). */
type TFn = (key: string, params?: Record<string, unknown>) => string;

/**
 * Amount limits come from the CMS (`GET /site/settings` →
 * `deposits:*` / `withdrawals:*`), so the messages interpolate the live values
 * instead of hardcoding "10,000". See `useTransactionLimits`.
 *
 * The limits are read at schema-build time; both call sites rebuild the schema
 * in a `computed`, so a settings refresh re-validates against the new numbers.
 */

/** Format a limit for display in a message (thousands separators). */
const fmt = (n: number): string =>
  Number.isFinite(n) ? n.toLocaleString("en-US") : "";

/** Strip grouping separators before parsing a typed amount. */
const toNum = (v: string): number => Number(v.replace(/,/g, ""));

/**
 * Shared min/max/divisible refinements.
 *
 * `maximum` is skipped when infinite (setting absent) and `divisible` when 0,
 * so an unconfigured site doesn't get an unsatisfiable rule.
 */
function amountRules(
  schema: z.ZodString,
  t: TFn,
  limits: TransactionLimits,
  keys: { invalid: string; min: string; max: string; step: string },
) {
  return schema
    .refine((v) => /^\d[\d,]*(\.\d+)?$/.test(v.replace(/,/g, "")), () => ({
      message: t(keys.invalid),
    }))
    .refine((v) => toNum(v) > 0, () => ({ message: t(keys.invalid) }))
    .refine((v) => toNum(v) >= limits.minimum, () => ({
      message: t(keys.min, { min: fmt(limits.minimum) }),
    }))
    .refine(
      (v) => !Number.isFinite(limits.maximum) || toNum(v) <= limits.maximum,
      () => ({ message: t(keys.max, { max: fmt(limits.maximum) }) }),
    )
    .refine(
      (v) => limits.divisible <= 0 || toNum(v) % limits.divisible === 0,
      () => ({ message: t(keys.step, { step: fmt(limits.divisible) }) }),
    );
}

/**
 * Withdrawal amount schema.
 *
 * @param t - i18n translator.
 * @param limits - Live limits from `useTransactionLimits("withdrawals")`.
 */
export const withdrawalSchema = (t: TFn, limits: TransactionLimits) =>
  toTypedSchema(
    z.object({
      amount: amountRules(z.string(), t, limits, {
        invalid: "withdrawal.validation.amountInvalid",
        min: "withdrawal.validation.amountMinimum",
        max: "withdrawal.validation.amountMaximum",
        step: "withdrawal.validation.amountDivisible",
      }),
    }),
  );

/**
 * Deposit form schema (bank payment).
 *
 * @param t - i18n translator.
 * @param limits - Live limits from `useTransactionLimits("deposits")`.
 */
export const depositSchema = (t: TFn, limits: TransactionLimits) =>
  toTypedSchema(
    z.object({
      depositAmount: amountRules(z.string(), t, limits, {
        invalid: "deposit.validation.amountInvalid",
        min: "deposit.validation.amountMinimum",
        max: "deposit.validation.amountMaximum",
        step: "deposit.validation.amountDivisible",
      }),
      bankAccountId: z
        .string()
        .min(1, { message: t("deposit.validation.bankRequired") }),
    }),
  );
