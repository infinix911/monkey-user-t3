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
