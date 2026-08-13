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
          .min(6, t("password.validation.oldPasswordMinLength")),
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
        // Sent to the API, which verifies it against the stored hash before
        // writing the new one.
        //
        // Optional HERE on purpose. The same endpoint is also first-time setup:
        // registration never writes `members.withdrawalPassword`, so a member
        // who has never set one has nothing to type, and a client-side
        // requirement would lock them out of ever setting it. The server knows
        // whether a password exists and enforces accordingly, answering
        // INVALID_WITHDRAWAL_PASSWORD when one is stored and this is wrong or
        // missing. The client cannot make that call — no session field says
        // whether the member has one.
        currentPassword: z.string().optional(),
        newPassword: z
          .string()
          .min(6, t("password.validation.withdrawalMinLength"))
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
