/**
 * Auth backend contracts (monkey-user-api).
 *
 * These are the **wire shapes** returned by the API, in camelCase, mirroring
 * the TypeBox validators in `monkey-user-api/src/validators/auth.validator.ts`.
 * They are zod schemas (not bare interfaces) so responses can be
 * runtime-validated via `validateResponse()` / `useApi().validated()` before
 * the store maps them onto internal state. Backend is the source of truth —
 * keep these in lock-step with the server validators.
 */

import { z } from "zod";

/** Authenticated response of Better Auth `GET /api/auth/get-session`. */
export const verifyUserResponseSchema = z.object({
  id: z.string(),
  upperId: z.string().nullable(),
  depth: z.number(),
  username: z.string(),
  bankName: z.string(),
  bankAccount: z.string(),
  bankAccountName: z.string(),
  phone: z.string(),
  userType: z.number(),
  wallet: z.string(),
  pointWallet: z.string(),
  level: z.number(),
  // Level-detail fields are optional — the backend omits them in some
  // responses. The mapper defaults them (|| "" / || 0), so verifyUser must not
  // fail validation when they're absent (would leave the app "logged out").
  levelName: z.string().nullable().optional(),
  levelExp: z.string().optional(),
  levelMinExp: z.string().nullable().optional(),
  nextLevel: z.number().optional(),
  nextLevelName: z.string().optional(),
  nextLevelMinExp: z.string().optional(),
});

export type VerifyUserResponse = z.infer<typeof verifyUserResponseSchema>;

/** Better Auth returns `null` with HTTP 200 when no session cookie is valid. */
export const getSessionResponseSchema = verifyUserResponseSchema.nullable();
export type GetSessionResponse = z.infer<typeof getSessionResponseSchema>;

/**
 * Internal auth/session state (snake_case) consumed across the app. The API
 * wire shape above is mapped onto this by {@link mapVerifyUserToState}, so
 * components never depend on the backend's field naming.
 */
export interface UserState {
  id: string;
  username: string;
  level: number;
  level_name: string;
  level_exp: string;
  level_min_exp: string;
  next_level: number;
  next_level_name: string;
  next_level_min_exp: string;
  wallet: string;
  point_wallet: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  phone: string;
  user_type: number;
  currency: string;
  upper_id: string;
}

/** Empty/logged-out user state. */
export const defaultUserState: UserState = {
  id: "",
  username: "",
  level: 0,
  level_name: "",
  level_exp: "",
  level_min_exp: "",
  next_level: 0,
  next_level_name: "",
  next_level_min_exp: "",
  wallet: "",
  point_wallet: "",
  bank_name: "",
  bank_account: "",
  bank_account_name: "",
  phone: "",
  user_type: 0,
  currency: "",
  upper_id: "",
};

/**
 * Map the authenticated `GET /auth/get-session` wire shape onto internal
 * {@link UserState}.
 * Single source of the auth field mapping — reused by the store and the
 * server session-hydrate plugin so the two never drift. `currency` is not part
 * of the profile response and is passed in (derived from the site config).
 */
// --- Login history: GET /auth/login-histories (bare array) ---

export const loginHistoryWireSchema = z.object({
  id: z.number(),
  ipAddress: z.string(),
  userAgent: z.string(),
  createdAt: z.string(),
});
export const loginHistoriesResponseSchema = z.array(loginHistoryWireSchema);

export interface LoginLog {
  id: number;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export const mapLoginHistory = (
  w: z.infer<typeof loginHistoryWireSchema>,
): LoginLog => ({
  id: w.id,
  ip_address: w.ipAddress,
  user_agent: w.userAgent,
  created_at: w.createdAt,
});

// --- Referrals: GET /auth/referrals (bare array) ---

export const referralWireSchema = z.object({
  username: z.string(),
  createdAt: z.string(),
});
export const referralsResponseSchema = z.array(referralWireSchema);

export interface Referral {
  username: string;
  created_at: string;
}

export const mapReferral = (
  w: z.infer<typeof referralWireSchema>,
): Referral => ({
  username: w.username,
  created_at: w.createdAt,
});

export function mapVerifyUserToState(
  res: VerifyUserResponse,
  currency: string,
): UserState {
  return {
    id: res.id,
    username: res.username,
    level: res.level,
    level_name: res.levelName || "",
    level_exp: res.levelExp || "",
    level_min_exp: res.levelMinExp || "",
    next_level: res.nextLevel || 0,
    next_level_name: res.nextLevelName || "",
    next_level_min_exp: res.nextLevelMinExp || "",
    wallet: res.wallet,
    point_wallet: res.pointWallet,
    bank_name: res.bankName,
    bank_account: res.bankAccount,
    bank_account_name: res.bankAccountName,
    phone: res.phone,
    user_type: res.userType,
    currency,
    upper_id: res.upperId || "",
  };
}
