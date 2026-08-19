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
        .regex(/^[a-zA-Z0-9_-]+$/, t("auth.validation.usernameInvalidChars")),
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
      // 4-8, matching the API's registerSchema exactly. It was 5-12, which is
      // the mismatch behind the bare 400s on /auth/register: a 9-12 character
      // id passed this form and was then rejected by the server's schema before
      // the controller ran, so the member got no message at all. The old min of
      // 5 also contradicted this field's own error text, which already said 4.
      //
      // ⚠ The API is not self-consistent here: /auth/check/username accepts
      // 4-12 (checkUsernameSchema), so a 9-12 character id is reported
      // AVAILABLE and then fails registration. Registration is the binding
      // rule, so the form follows that one; fixing the check endpoint's bound
      // is an API-side change.
      username: z
        .string()
        .min(4, t("signup.validation.usernameMinLength"))
        .max(8, t("signup.validation.usernameMaxLength")),
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
