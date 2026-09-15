import { z } from "zod";
import { toTypedSchema } from "@vee-validate/zod";

type TFn = (key: string) => string;

/**
 * Username bounds.
 *
 * `USERNAME_MIN`/`USERNAME_MAX` are 4-12, taken from the only component that
 * decides whether an id can start a session: the better-auth username plugin
 * in monkey-user-api (`minUsernameLength` / `maxUsernameLength` in
 * `src/lib/auth.ts`). They are the LOGIN bounds and must stay there.
 *
 * A LOGIN form must never be stricter than the endpoint it posts to: reject
 * there and the member is locked out of a working account with no server error
 * to diagnose, because no request is ever sent. Ids longer than 8 exist —
 * `createPartnerMemberSchema` still mints 4-12, and everyone registered before
 * the signup rule tightened kept their name — so login stays at 12.
 *
 * `SIGNUP_USERNAME_MAX` is 8: the product rule for self-registration, and the
 * same window `registerSchema` / `checkUsernameSchema` enforce in
 * monkey-user-api. Being stricter than login is safe in this direction only —
 * every id this form can create is one the sign-in endpoint accepts.
 */
export const USERNAME_MIN = 4;
export const USERNAME_MAX = 12;
export const SIGNUP_USERNAME_MAX = 8;

/**
 * Login form schema
 */
export const loginSchema = (t: TFn) =>
  toTypedSchema(
    z.object({
      // The sign-in endpoint's own bounds, NOT signup's (which is 4-8): this
      // form has to accept every id that can still authenticate. Login once
      // accepted 1-12 and, past 12, showed a message reading "32 characters
      // or fewer" — three different numbers for one field.
      username: z
        .string()
        .min(USERNAME_MIN, t("auth.validation.usernameMinLength"))
        .max(USERNAME_MAX, t("auth.validation.usernameMaxLength"))
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
      // 4-8, matching the API's registerSchema. The form must not be the
      // looser of the two: an id this form accepts and Elysia rejects fails
      // BEFORE the controller runs, and the member gets
      // `{"message":"VALIDATION_ERROR"}` — what the API returns for every
      // schema failure, naming no field.
      //
      // /auth/check/username carries the same bound, so it cannot report an
      // id as available that this form would then refuse.
      username: z
        .string()
        .min(USERNAME_MIN, t("signup.validation.usernameMinLength"))
        .max(SIGNUP_USERNAME_MAX, t("signup.validation.usernameMaxLength"))
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
        // Digits only: the leading + this used to allow was never accepted
        // anywhere downstream, and the number is stored as typed.
        .regex(/^\d+$/, t("signup.validation.mobileInvalid"))
        // Exactly 10 or 11 digits, the two real Korean mobile lengths. The
        // old floor of 8 with no ceiling let obviously wrong numbers through.
        .regex(/^\d{10,11}$/, t("signup.validation.mobileMinLength")),
      // 2-30 is what registerSchema accepts. The floor was 1, so a
      // single-character bank name passed the form and the member got a bare
      // 400 back. The field is a picker in practice, but the schema is what the
      // submit is validated against.
      bankName: z
        .string()
        .min(1, t("signup.validation.bankNameRequired"))
        .min(2, t("signup.validation.bankNameTooShort"))
        .max(30, t("signup.validation.bankNameTooLong")),
      // 2, not 4: this is a Korean account-holder name (예금주명), and Korean
      // names are commonly two or three syllables - 김민, 이준 - so a 4 floor
      // rejected ordinary real names. 2 is also exactly what the API enforces
      // (`bankAccountName` minLength 2 in registerSchema), so the form and the
      // server now agree instead of the form being the stricter of the two.
      bankAccountName: z
        .string()
        // An empty field is "required", not "too short" - the message for it
        // already shipped, it just had no rule pointing at it.
        .min(1, t("signup.validation.accountNameRequired"))
        .min(2, t("signup.validation.accountNameMinLength"))
        .max(100, t("signup.validation.accountNameMaxLength")),
      bankAccount: z
        .string()
        .min(1, t("signup.validation.accountNumberRequired"))
        // Bank account numbers are digits only. The submit handler trims the
        // value (see SignupModal.vue), so allow surrounding whitespace here
        // and rely on the trim before sending to the API.
        .regex(/^\s*\d+\s*$/, t("signup.validation.accountNumberDigitsOnly"))
        // 2-30 is what registerSchema accepts. Without these the form let a
        // longer number through and the member got a bare 400 back.
        .refine(
          (v) => v.trim().length >= 2,
          t("signup.validation.accountNumberMinLength"),
        )
        .refine(
          (v) => v.trim().length <= 30,
          t("signup.validation.accountNumberMaxLength"),
        ),
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
