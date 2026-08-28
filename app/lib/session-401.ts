/**
 * Which 401s mean "your session ended" — and which mean "the password you just
 * typed is wrong".
 *
 * Both HTTP clients treat a 401 as session expiry: they reset the user and
 * force-navigate home (`useApi.ts` `onResponseError`, `axios-client.ts`
 * response interceptor). That is right for the auth macro's bare `status(401)`,
 * which is what a revoked or expired `bn.session` earns on any protected route.
 *
 * It is wrong for the endpoints that verify a credential carried in the request
 * *body*. Those answer 401 too, and the session behind the request is perfectly
 * valid — the member simply mistyped:
 *
 * | Endpoint                            | Token                          |
 * | ----------------------------------- | ------------------------------ |
 * | `/transactions/withdrawal`          | `INVALID_WITHDRAWAL_PASSWORD`  |
 * | `/auth/change-withdrawal-password`  | `INVALID_WITHDRAWAL_PASSWORD`  |
 * | `/auth/change-password`             | `INVALID_CURRENT_PASSWORD`     |
 * | `/auth/sign-in/username`            | `INVALID_CREDENTIALS`          |
 *
 * Left unfiltered, one wrong withdrawal password reloaded the page (or bounced
 * the member home) and destroyed the error dialog before it could be read —
 * and because the one-shot `session_logged_out` latch fires only once per tab,
 * it happened on the *first* mistake only, which is what made it look random.
 *
 * Matching on the token rather than the URL keeps this route-independent: a new
 * credential-checking endpoint only has to answer with a token listed here, and
 * an unrecognised 401 still falls through to the logout path. Fails safe.
 */

/**
 * Tokens the API returns when a 401 is about a credential in the request body.
 *
 * Deliberately NOT included, because they do mean the session is unusable:
 * - a bare `status(401)` from the auth macro (no token in the body at all),
 * - `INVALID_AUTH` — `/auth/get-session` resolved a user with no member row,
 * - `INVALID_USER` — the session's member row has gone.
 */
const CREDENTIAL_FAILURE_TOKENS: ReadonlySet<string> = new Set([
  "INVALID_WITHDRAWAL_PASSWORD",
  "INVALID_CURRENT_PASSWORD",
  "INVALID_CREDENTIALS",
]);

/** Error body shape returned by the API on a 4xx. */
interface ApiErrorBody {
  code?: unknown;
  message?: unknown;
}

/**
 * Whether a 401 body reports a bad credential rather than a dead session.
 *
 * Two response shapes exist and they disagree about which field holds the
 * token — the same split `resolveApiToken()` handles in `useApiMessage.ts`:
 * custom controllers (`responseHandler`) send `{ message: TOKEN }`, while
 * Better Auth sends `{ code: TOKEN, message: "human prose" }`. A *numeric*
 * `code` is an HTTP status, never a token.
 *
 * @param body - Parsed response body (`response._data` for ofetch,
 *   `error.response.data` for axios). Anything unparseable reads as `false`.
 */
export function isCredentialFailure(body: unknown): boolean {
  if (!body || typeof body !== "object") return false;
  const { code, message } = body as ApiErrorBody;
  const token = typeof code === "string" ? code : message;
  return typeof token === "string" && CREDENTIAL_FAILURE_TOKENS.has(token);
}
