import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

type TFn = (key: string) => string;

/**
 * Change password form schema
 */
export const changePasswordSchema = (t: TFn) =>
  toTypedSchema(
    z
      .object({
        oldPassword: z
          .string()
          .min(1, t("password.validation.oldPasswordRequired")),
        newPassword: z
          .string()
          .min(6, t("password.validation.newPasswordMinLength"))
          .max(20, t("password.validation.newPasswordMaxLength")),
        confirmPassword: z
          .string()
          .min(1, t("password.validation.confirmPasswordRequired")),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: t("password.validation.passwordsMismatch"),
        path: ["confirmPassword"],
      }),
  );

/**
 * Withdrawal-password form schema — the 출금 비밀번호, a separate credential from
 * the login password above.
 *
 * New + confirm only: `POST /auth/change-withdrawal-password` takes just
 * `newPassword`, and the session proves identity. Bounds mirror that endpoint's
 * 4–20, which is looser than the login password's 6–20, so the form must not
 * borrow `changePasswordSchema` or it would reject a valid 4-character value.
 * Confirm never leaves the browser — it only stops a typo becoming the
 * credential that guards withdrawals.
 *
 * @param t - i18n translator.
 */
export const withdrawalPasswordSchema = (t: TFn) =>
  toTypedSchema(
    z
      .object({
        newPassword: z
          .string()
          .min(4, t("password.validation.withdrawalMinLength"))
          .max(20, t("password.validation.withdrawalMaxLength")),
        confirmPassword: z
          .string()
          .min(1, t("password.validation.confirmPasswordRequired")),
      })
      .refine((data) => data.newPassword === data.confirmPassword, {
        message: t("password.validation.passwordsMismatch"),
        path: ["confirmPassword"],
      }),
  );
