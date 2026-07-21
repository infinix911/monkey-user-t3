/**
 * API token → localized message.
 *
 * The backend speaks in UPPER_SNAKE tokens (`USERNAME_ALREADY_TAKEN`,
 * `INQUIRY_CREATED`) that the client turns into copy via
 * `<namespace>.apiMessages.<TOKEN>`. Interpolating an *unrecognised* token into
 * that key makes vue-i18n echo the key path back to the user — which is exactly
 * how `login.apiMessages.Invalid username or password` reached the screen.
 *
 * Two response shapes exist, and they disagree about which field holds the token:
 *
 * - **Custom controllers** (`responseHandler`) → `{ message: TOKEN }`.
 *   `handleError` may also attach a *numeric* `code` (the HTTP status), which is
 *   never a translation key.
 * - **Better Auth** (`/auth/sign-in/username`, `/auth/get-session`) →
 *   `{ code: TOKEN, message: "human prose" }`. Here `message` is NOT a key.
 *
 * `useApiMessage()` resolves either shape and only translates when the key
 * actually exists, so anything unexpected degrades to a sane fallback instead of
 * leaking a path.
 */

/** Error body carried by an ofetch/$fetch or axios rejection. */
interface ApiErrorLike {
  data?: { code?: unknown; message?: string };
  response?: { data?: { code?: unknown; message?: string } };
}

/**
 * Extract the token to translate.
 *
 * Accepts either a raw token string (success responses, where the caller
 * already read `response.data.message`) or a thrown error. For errors, prefers a
 * **string** `code` (Better Auth) and falls back to `message` (custom
 * controllers); a numeric `code` is ignored — it's an HTTP status, not a key.
 *
 * @param source - A token string, or the caught error.
 * @returns The token, or `undefined` when none is present.
 */
export function resolveApiToken(source: unknown): string | undefined {
  if (typeof source === "string") return source || undefined;
  const body =
    (source as ApiErrorLike)?.data ?? (source as ApiErrorLike)?.response?.data;
  if (!body) return undefined;
  return typeof body.code === "string" ? body.code : body.message;
}

/**
 * Build a message resolver bound to the caller's i18n instance.
 *
 * Must be called from a component/composable `setup` scope (it uses
 * `useI18n()`); the returned function is safe to call later, e.g. inside a
 * `catch`.
 *
 * @example
 * const apiMessage = useApiMessage();
 * // error path
 * catch (err) {
 *   showErrorAlert(t("login.failed"), apiMessage(err, "login", "login.invalidCredentials"));
 * }
 * // success path
 * showSuccessAlert(t("inquiry.success"), apiMessage(token, "inquiry", "inquiry.closeInquirySuccess"));
 */
export function useApiMessage() {
  const { t, te } = useI18n();

  /**
   * @param source - A token string, or the caught error.
   * @param namespace - i18n namespace holding the `apiMessages` map (e.g.
   *   `"login"`, `"signup"`, `"deposit"`).
   * @param fallbackKey - Full i18n key used when the token is missing or has no
   *   translation. Defaults to the namespace's `INTERNAL_ERROR`.
   */
  return function apiMessage(
    source: unknown,
    namespace: string,
    fallbackKey = `${namespace}.apiMessages.INTERNAL_ERROR`,
  ): string {
    const token = resolveApiToken(source);
    const key = `${namespace}.apiMessages.${token}`;
    if (token && te(key)) return t(key);
    return te(fallbackKey) ? t(fallbackKey) : t("common.error");
  };
}
