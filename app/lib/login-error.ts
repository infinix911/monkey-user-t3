import { resolveApiToken } from "@/composables/useApiMessage";

const credentialCodes = new Set([
  "INVALID_CREDENTIALS",
  "INVALID_USERNAME_OR_PASSWORD",
  "INVALID_EMAIL_OR_PASSWORD",
]);
const accountCodes = new Set([
  "ACCOUNT_NEW",
  "ACCOUNT_PENDING_APPROVAL",
  "ACCOUNT_INACTIVE",
  "ACCOUNT_BLOCKED",
  "ACCOUNT_BANNED",
  "ACCOUNT_REJECTED",
  "ACCOUNT_DELETED",
  "ACCOUNT_UNAVAILABLE",
  "LOGIN_UNAVAILABLE_HERE",
]);
const validationCodes = new Set([
  "USERNAME_TOO_SHORT",
  "USERNAME_TOO_LONG",
  "INVALID_USERNAME",
  "PASSWORD_TOO_SHORT",
  "EMAIL_NOT_VERIFIED",
]);

interface LoginErrorShape {
  status?: unknown;
  statusCode?: unknown;
  response?: { status?: unknown };
  cause?: { name?: unknown; message?: unknown };
  name?: unknown;
  message?: unknown;
}

export interface LoginErrorResolution {
  key: string;
  unexpected: boolean;
  status?: number;
  code?: string;
}

/** Select member-facing login copy without treating unknown failures as bad credentials. */
export function resolveLoginError(error: unknown): LoginErrorResolution {
  const shape = (error && typeof error === "object" ? error : {}) as LoginErrorShape;
  const rawStatus = shape.response?.status ?? shape.statusCode ?? shape.status;
  const status = typeof rawStatus === "number" && rawStatus > 0
    ? rawStatus
    : undefined;
  const rawCode = resolveApiToken(error);
  // Keep telemetry limited to machine codes; Better Auth's human prose and
  // unexpected server payloads can contain user-supplied data.
  const code = rawCode && /^[A-Z][A-Z0-9_]{0,79}$/.test(rawCode) ? rawCode : undefined;

  if (status === 429) {
    return { key: "login.apiMessages.TOO_MANY_REQUESTS", unexpected: false, status, code };
  }
  if (code && (
    (status === 401 && credentialCodes.has(code)) ||
    (status === 403 && accountCodes.has(code)) ||
    (status === 422 && validationCodes.has(code)) ||
    (status === 403 && code === "EMAIL_NOT_VERIFIED")
  )) {
    return { key: `login.apiMessages.${code}`, unexpected: false, status, code };
  }
  if (status === 408 || status === 504) {
    return { key: "login.apiMessages.LOGIN_TIMEOUT", unexpected: true, status, code };
  }
  if (status === undefined) {
    const name = shape.cause?.name ?? shape.name;
    const message = shape.cause?.message ?? shape.message;
    const timedOut = name === "TimeoutError" ||
      (typeof message === "string" && /\b(?:timeout|timed out)\b/i.test(message));
    if (timedOut) {
      return { key: "login.apiMessages.LOGIN_TIMEOUT", unexpected: true, code };
    }
    const networkFailure = name === "FetchError" || shape.name === "FetchError" ||
      (typeof message === "string" && /\b(?:fetch failed|failed to fetch|network error)\b/i.test(message));
    return networkFailure
      ? { key: "login.apiMessages.LOGIN_NETWORK_ERROR", unexpected: true, code }
      : { key: "login.apiMessages.LOGIN_UNEXPECTED_ERROR", unexpected: true, code };
  }
  return { key: "login.apiMessages.LOGIN_UNEXPECTED_ERROR", unexpected: true, status, code };
}
