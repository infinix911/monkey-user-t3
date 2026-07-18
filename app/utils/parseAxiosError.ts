/**
 * Axios / API error helpers.
 *
 * Several catch blocks repeated the same inline cast:
 *   error as { response?: { data?: { message?: string } }; message?: string }
 * followed by the same extraction chain. These helpers centralize that shape
 * and preserve each call site's exact behavior — notably the `||`
 * short-circuit, so an empty-string message still falls through to the
 * fallback exactly as before.
 */

/** Body an API error response may carry. */
export interface ApiErrorBody {
  message?: string;
  code?: string;
}

/** Response portion of an axios-style error. */
export interface ApiErrorResponse {
  status?: number;
  data?: ApiErrorBody;
}

/** Axios-style error carrying an optional API message payload. */
export interface ApiErrorShape {
  response?: ApiErrorResponse;
  message?: string;
}

/** Type guard: does this unknown value look like an axios-style API error? */
export function isApiError(error: unknown): error is ApiErrorShape {
  return typeof error === "object" && error !== null;
}

/** Narrow an unknown caught value to the axios-style error shape. */
export function asApiError(error: unknown): ApiErrorShape {
  return isApiError(error) ? error : {};
}

/**
 * Raw API message (`response.data.message`), or `undefined` when absent.
 * Use when the message is an i18n key or needs site-specific fallback logic.
 */
export function apiErrorMessage(error: unknown): string | undefined {
  return asApiError(error).response?.data?.message;
}

/**
 * API message, falling back to the error's own `message`, then `fallback`.
 * Mirrors the common `resp?.data?.message || err?.message || fallback` chain.
 */
export function apiErrorMessageOr(error: unknown, fallback: string): string {
  const e = asApiError(error);
  return e.response?.data?.message || e.message || fallback;
}

/** HTTP status from the error response, if present. */
export function apiErrorStatus(error: unknown): number | undefined {
  return asApiError(error).response?.status;
}
