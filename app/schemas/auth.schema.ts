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
        .max(32, t("auth.validation.usernameTooLong"))
        .regex(/^[a-zA-Z0-9_-]+$/, t("auth.validation.usernameInvalidChars")),
      password: z
        .string()
        .min(1, t("auth.validation.passwordCheck"))
        .max(128, t("auth.validation.passwordTooLong")),
    }),
  );

/**
 * Signup form raw Zod schema (for type inference)
 */
const signupRawSchema = (t: TFn) =>
  z
    .object({
      username: z
        .string()
        .min(4, t("signup.validation.usernameMinLength"))
        .max(12, t("signup.validation.usernameMaxLength")),
      password: z
        .string()
        .min(6, t("password.validation.newPasswordMinLength"))
        .max(20, t("signup.validation.passwordMaxLength")),
      confirmPassword: z
        .string()
        .min(1, t("password.validation.confirmPasswordRequired")),
      email: z
        .string()
        .email(t("signup.validation.emailInvalid"))
        .or(z.literal("")),
      mobile: z
        .string()
        .min(1, t("signup.validation.mobileRequired"))
        .regex(/^\+?\d+$/, t("signup.validation.mobileInvalid"))
        .refine(
          (v) => v.replace(/\D/g, "").length >= 8,
          t("signup.validation.mobileMinLength"),
        ),
      currency: z.string().min(1, t("signup.validation.currencyRequired")),
      bankName: z
        .string()
        .min(1, t("signup.validation.bankNameRequired"))
        .max(30, t("signup.validation.bankNameTooLong")),
      bankAccountName: z
        .string()
        .min(4, t("signup.validation.accountNameMinLength")),
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
