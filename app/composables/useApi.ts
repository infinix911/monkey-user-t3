/**
 * useApi — browser API wrapper.
 *
 * Targets the validated public API origin directly. `credentials: "include"`
 * keeps the API-host session cookie attached; the API derives tenant identity
 * from the browser Origin rather than frontend-supplied forwarding headers.
 *
 * The returned value is the familiar callable `$Fetch` instance, so existing
 * call sites that pass NO schema keep working unchanged:
 *
 *   const api = useApi();
 *   const { data } = await useAsyncData("hot-games", () => api("/games", {
 *     params: { game_type: "slot", category: "hot" }
 *   }));
 *
 * It additionally exposes `.validated<T>(schema, request, opts)` for callers
 * that want a runtime-validated, typed payload:
 *
 *   const data = await api.validated(mySchema, "/some/endpoint");
 */

import type { $Fetch } from "ofetch";
import type { ZodIssue, ZodType } from "zod";
import { getApiBase } from "@/lib/domain";
import { getCsrfHeaders } from "@/lib/csrf";
import { isCredentialFailure } from "@/lib/session-401";

/**
 * Mutating methods get a CSRF double-submit header (parity with axios-client).
 * They are never retried (money safety) — useApi already sets `retry: 0`.
 */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Option bag accepted by the project's isomorphic `$fetch`. Derived from the
 * live `$fetch` signature (Nuxt augments it to `NitroFetchOptions`) so the
 * validated path stays in lock-step with the base fetcher's accepted options.
 */
type ApiFetchOptions = Parameters<typeof $fetch>[1];

/**
 * Thrown when an API response fails zod validation. Carries the zod issues so
 * callers (and Sentry) get the precise field-level reason instead of a vague
 * runtime crash. Never swallowed silently during SSR.
 */
export class ApiValidationError extends Error {
  readonly issues: ZodIssue[];
  readonly request: string;

  constructor(request: string, issues: ZodIssue[]) {
    super(
      `API response validation failed for "${request}": ` +
        issues
          .map((i) => `${i.path.join(".") || "<root>"} ${i.message}`)
          .join("; "),
    );
    this.name = "ApiValidationError";
    this.issues = issues;
    this.request = request;
  }
}

/** A $Fetch instance with an extra schema-validating method bolted on. */
export interface ValidatingFetch extends $Fetch {
  /**
   * Fetch `request`, then validate the payload against `schema`.
   * On success returns the parsed (and typed) value; on failure throws
   * {@link ApiValidationError} carrying the zod issues.
   */
  validated<TOut>(
    schema: ZodType<TOut>,
    request: string,
    opts?: ApiFetchOptions,
  ): Promise<TOut>;
}

export const useApi = (): ValidatingFetch => {
  const base = getApiBase();

  const fetcher = $fetch.create({
    baseURL: base,
    credentials: "include",
    retry: 0,
    timeout: 10000,
    // CSRF double-submit on mutating requests (parity with axios-client):
    // read the XSRF-TOKEN cookie and echo it as a header. Client-only — the
    // cookie only exists in the browser.
    onRequest({ options }) {
      if (!import.meta.client) return;
      const method = (options.method ?? "GET").toString().toUpperCase();
      if (!MUTATING_METHODS.has(method)) return;
      const merged = new Headers(options.headers as HeadersInit | undefined);
      for (const [name, value] of Object.entries(getCsrfHeaders()))
        merged.set(name, value);
      options.headers = merged;
    },
    // Clear the auto-logout latch on any successful auth response, mirroring
    // axios-client's response interceptor so re-login re-enables auto-logout.
    onResponse({ request, response }) {
      if (!import.meta.client || !response.ok) return;
      const url = String(request);
      if (url.includes("/auth/sign-in/username")) {
        sessionStorage.removeItem("session_logged_out");
      }
    },
    // 401 auto-logout (parity with axios-client): reset user + redirect home,
    // once per session, excluding the login attempt. Better Auth's native
    // session probe returns 200 null for anonymous visitors.
    onResponseError({ request, response }) {
      if (!import.meta.client || response?.status !== 401) return;
      const reqUrl = String(request);
      if (reqUrl.includes("/auth/sign-in/username")) return;
      // A mistyped withdrawal/current password also answers 401 while the
      // session stays valid — logging out on it destroyed the error dialog
      // before it could be read. See lib/session-401.ts.
      if (isCredentialFailure(response?._data)) return;
      if (sessionStorage.getItem("session_logged_out")) return;
      sessionStorage.setItem("session_logged_out", "1");
      try {
        useAuthStore().resetUser();
      } catch {
        // store may be unavailable in some contexts
      }
      const path = window.location.pathname;
      const alreadyAtHome = path === "/" || /^\/(id|ko|th)\/?$/.test(path);
      if (alreadyAtHome) {
        window.location.reload();
      } else {
        window.location.href = "/";
      }
    },
  });

  const validated = async <TOut>(
    schema: ZodType<TOut>,
    request: string,
    opts?: ApiFetchOptions,
  ): Promise<TOut> => {
    const raw = await fetcher(request, opts);
    const result = schema.safeParse(raw);
    if (!result.success) {
      throw new ApiValidationError(request, result.error.issues);
    }
    return result.data;
  };

  return Object.assign(fetcher, { validated }) as ValidatingFetch;
};
