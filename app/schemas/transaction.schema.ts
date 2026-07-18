import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

type TFn = (key: string) => string;

/**
 * Withdrawal amount schema
 */
export const withdrawalSchema = (t: TFn) =>
  toTypedSchema(
    z.object({
      amount: z
        .string()
        .refine(
          (v) => /^\d[\d,]*(\.\d+)?$/.test(v.replace(/,/g, "")),
          (_v) => ({ message: t("withdrawal.withdrawCheck") }),
        )
        .refine(
          (v) => Number(v.replace(/,/g, "")) > 0,
          (_v) => ({ message: t("withdrawal.withdrawCheck") }),
        )
        .refine(
          (v) => Number(v.replace(/,/g, "")) >= 10000,
          (_v) => ({ message: t("withdrawal.withdrawCheck") }),
        )
        .refine(
          (v) => Number(v.replace(/,/g, "")) % 10000 === 0,
          (_v) => ({ message: t("withdrawal.withdrawDivCheck") }),
        ),
    }),
  );

/**
 * Deposit form schema (for bank payment)
 */
export const depositSchema = (t: TFn) =>
  toTypedSchema(
    z.object({
      depositAmount: z
        .string()
        .refine(
          (v) => /^\d+$/.test(v),
          () => ({ message: t("deposit.validation.amountInvalid") }),
        )
        .refine(
          (v) => Number(v) > 0,
          () => ({ message: t("deposit.validation.amountMinimum") }),
        ),
      bankAccountId: z
        .string()
        .min(1, { message: t("deposit.validation.bankRequired") }),
    }),
  );
