/**
 * validateResponse — runtime-validate an API payload against a zod schema.
 *
 * Companion to `useApi().validated()` for call sites that fetch via
 * `axios-client` (Pinia store actions) instead of the isomorphic `$fetch`.
 * Both paths throw the same {@link ApiValidationError} on a shape mismatch, so
 * a backend contract drift surfaces loudly (and to Sentry) instead of silently
 * producing `undefined` fields — important for auth/money reads.
 *
 * Usage:
 *   const raw = (await axiosClient.get("/auth/get-session")).data;
 *   const user = validateResponse(getSessionResponseSchema, raw, "/auth/get-session");
 */

import type { ZodType } from "zod";
import { ApiValidationError } from "@/composables/useApi";

export function validateResponse<T>(
  schema: ZodType<T>,
  data: unknown,
  request: string,
): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new ApiValidationError(request, result.error.issues);
  }
  return result.data;
}
