/**
 * useApi — isomorphic $fetch wrapper for SSR-safe API calls.
 *
 * - On server: targets the private backend URL from runtimeConfig.apiUrl and
 *   forwards the incoming request's Cookie header so authenticated SSR data
 *   renders for the visitor's session.
 * - On client: targets the same-origin /api prefix, which is forwarded by
 *   the Nitro proxy (server/routes/api/[...path].ts) to the real backend.
 *   credentials: "include" keeps bn.session attached.
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
import { getApiBase, forwardHostHeaders } from "@/lib/domain";

/**
 * Mutating methods get a CSRF double-submit header (parity with axios-client).
 * They are never retried (money safety) — useApi already sets `retry: 0`.
 */
const MUTATING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/** Read a cookie value by name (client only). */
const getCookieValue = (name: string): string | null => {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "=([^;]*)",
    ),
  );
  return match ? decodeURIComponent(match[1]!) : null;
};

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
        issues.map((i) => `${i.path.join(".") || "<root>"} ${i.message}`).join("; "),
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

  // Forward the visitor's host so the multi-tenant backend resolves the right
  // tenant on direct SSR fetches (see forwardHostHeaders). Client is same-origin
  // (proxy sets it), so this is a server-only no-op there.
  const headers: Record<string, string> = { ...forwardHostHeaders() };
  if (import.meta.server) {
    try {
      const forwarded = useRequestHeaders(["cookie"]);
      if (forwarded.cookie) headers.cookie = forwarded.cookie;
    } catch {
      // no request context
    }
  }

  const fetcher = $fetch.create({
    baseURL: base,
    credentials: "include",
    headers,
    retry: 0,
    timeout: 10000,
    // CSRF double-submit on mutating requests (parity with axios-client):
    // read the XSRF-TOKEN cookie and echo it as a header. Client-only — the
    // cookie only exists in the browser.
    onRequest({ options }) {
      if (!import.meta.client) return;
      const method = (options.method ?? "GET").toString().toUpperCase();
      if (!MUTATING_METHODS.has(method)) return;
      const token = getCookieValue("XSRF-TOKEN");
      if (!token) return;
      const merged = new Headers(options.headers as HeadersInit | undefined);
      merged.set("X-XSRF-TOKEN", token);
      options.headers = merged;
    },
    // Clear the auto-logout latch on any successful auth response, mirroring
    // axios-client's response interceptor so re-login re-enables auto-logout.
    onResponse({ request, response }) {
      if (!import.meta.client || !response.ok) return;
      const url = String(request);
      if (url.includes("/auth/login") || url.includes("/auth/v")) {
        sessionStorage.removeItem("session_logged_out");
      }
    },
    // 401 auto-logout (parity with axios-client): reset user + redirect home,
    // once per session, excluding the login attempt and the /auth/v probe
    // (anonymous first-load 401 is expected — must NOT trigger a reload loop).
    onResponseError({ request, response }) {
      if (!import.meta.client || response?.status !== 401) return;
      const reqUrl = String(request);
      if (reqUrl.includes("/auth/login") || reqUrl.includes("/auth/v")) return;
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
