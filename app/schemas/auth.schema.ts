import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

type TFn = (key: string) => string;

/**
 * Login form schema
 */
export const loginSchema = (t: TFn) =>
  toTypedSchema(
    z.object({
      username: z
        .string()
        .min(1, t("auth.validation.usernameCheck"))
        .max(12, t("auth.validation.usernameTooLong"))
        .regex(/^[a-zA-Z0-9]+$/, t("auth.validation.usernameInvalidChars")),
      password: z
        .string()
        .min(6, t("auth.validation.passwordMinLength"))
        .max(20, t("auth.validation.passwordTooLong")),
    }),
  );

/**
 * Signup form raw Zod schema (for type inference)
 */
const signupRawSchema = (t: TFn) =>
  z
    .object({
      // 4-8, matching the API's registerSchema exactly (`username: t.String({
      // minLength: 4, maxLength: 8 })`). Verified against that schema directly:
      // a 10-character id fails with "Expected string length less or equal to
      // 8" and the same payload passes at 8.
      //
      // Without this the form was the looser of the two, so a 9-12 character id
      // passed here and was rejected by Elysia BEFORE the controller ran; the
      // member got `{"message":"VALIDATION_ERROR"}`, which the API returns for
      // every schema failure and which names no field. The old min of 5 also
      // contradicted this field's own error text, which already said 4.
      //
      // ⚠ /auth/check/username still accepts 4-12, so it will call a 9-12
      // character id AVAILABLE. The form no longer lets one through, but that
      // endpoint's bound is still wrong on the API side.
      username: z
        .string()
        .min(4, t("signup.validation.usernameMinLength"))
        .max(8, t("signup.validation.usernameMaxLength"))
        // Letters and digits only - same rule the login form enforces. Without
        // it an id containing "_" or "-" could be registered here and then be
        // rejected at login, locking the member out of the account they just
        // made.
        .regex(/^[a-zA-Z0-9]+$/, t("auth.validation.usernameInvalidChars")),
      password: z
        .string()
        .min(6, t("password.validation.newPasswordMinLength"))
        .max(20, t("signup.validation.passwordMaxLength")),
      confirmPassword: z
        .string()
        .min(1, t("password.validation.confirmPasswordRequired")),
      // Bounds mirror registerSchema's `withdrawalPassword` in monkey-user-api
      // (6-20), which is also what the withdraw request validates against.
      withdrawalPassword: z
        .string()
        .min(6, t("signup.validation.withdrawalPasswordMinLength"))
        .max(20, t("signup.validation.withdrawalPasswordMaxLength")),
      mobile: z
        .string()
        .min(1, t("signup.validation.mobileRequired"))
        .regex(/^\+?\d+$/, t("signup.validation.mobileInvalid"))
        .refine(
          (v) => v.replace(/\D/g, "").length >= 8,
          t("signup.validation.mobileMinLength"),
        ),
      bankName: z
        .string()
        .min(1, t("signup.validation.bankNameRequired"))
        .max(30, t("signup.validation.bankNameTooLong")),
      // 2, not 4: this is a Korean account-holder name (예금주명), and Korean
      // names are commonly two or three syllables - 김민, 이준 - so a 4 floor
      // rejected ordinary real names. 2 is also exactly what the API enforces
      // (`bankAccountName` minLength 2 in registerSchema), so the form and the
      // server now agree instead of the form being the stricter of the two.
      bankAccountName: z
        .string()
        .min(2, t("signup.validation.accountNameMinLength")),
      bankAccount: z
        .string()
        .min(1, t("signup.validation.accountNumberRequired"))
        // Bank account numbers are digits only. The submit handler trims the
        // value (see SignupModal.vue), so allow surrounding whitespace here
        // and rely on the trim before sending to the API.
        .regex(/^\s*\d+\s*$/, t("signup.validation.accountNumberDigitsOnly")),
      referral: z.string().optional(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("password.validation.passwordsMismatch"),
      path: ["confirmPassword"],
    });

/**
 * Signup form schema for vee-validate
 */
export const signupSchema = (t: TFn) => toTypedSchema(signupRawSchema(t));

export type SignupFormValues = z.infer<ReturnType<typeof signupRawSchema>>;
