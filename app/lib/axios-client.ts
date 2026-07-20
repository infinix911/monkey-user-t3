/**
 * Axios HTTP Client with Cookie-Based Session Authentication
 *
 * Centralized HTTP client for all API requests. Authentication is handled
 * via the `bn.session` HttpOnly cookie set by the server on login.
 *
 * **Features**:
 * - Cookie credentials sent with every request (`withCredentials: true`)
 * - CSRF token header on all mutating requests (requires server to set XSRF-TOKEN cookie)
 * - 401 error handling with auto-redirect to home (loop-safe)
 * - TypeScript typed axios instance
 * - Configurable base URL from runtime config (NUXT_PUBLIC_API_BASE)
 *
 * **Usage**:
 * ```typescript
 * import axiosClient from '@/lib/axios-client'
 *
 * // GET request
 * const response = await axiosClient.get('/games', { params: { limit: 24 } })
 * const data = response.data
 *
 * // POST request
 * const response = await axiosClient.post('/auth/sign-in/username', { username, password })
 * // Server sets bn.session cookie on success
 * ```
 */

import axios from "axios";
import type {
  AxiosInstance,
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from "axios";
import { getApiBase } from "@/lib/domain";

const MUTATING_METHODS = new Set(["post", "put", "patch", "delete"]);

/**
 * Idempotent methods are the only ones safe to retry. Money mutations
 * (POST/PUT/PATCH/DELETE) are NEVER retried — a failed-but-applied debit must
 * not be replayed.
 */
const IDEMPOTENT_METHODS = new Set(["get", "head"]);

/** Max automatic retries for an idempotent request before giving up. */
const MAX_RETRIES = 2;
/** Base delay (ms) for exponential backoff: attempt 1 → 300ms, attempt 2 → 600ms. */
const RETRY_BASE_DELAY_MS = 300;

/** Per-request retry bookkeeping carried on the axios config. */
interface RetryableConfig extends InternalAxiosRequestConfig {
  __retryCount?: number;
}

const delay = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/** Whether a method is safe to retry (idempotent only). */
const isIdempotent = (method?: string): boolean =>
  !!method && IDEMPOTENT_METHODS.has(method.toLowerCase());

/**
 * Retry only on transient failures: network errors (no response) or 5xx /
 * 429 statuses. 4xx (except 429) are caller mistakes and are never retried.
 */
const isRetryableError = (error: AxiosError): boolean => {
  const status = error.response?.status;
  if (status === undefined) return true; // network/timeout error, no response
  return status >= 500 || status === 429;
};

/**
 * Stable key for de-duplicating identical concurrent GET requests. Identical
 * URL + serialized params share a single in-flight promise.
 */
const dedupeKey = (config: InternalAxiosRequestConfig): string => {
  const method = (config.method ?? "get").toLowerCase();
  const url = config.url ?? "";
  const params = config.params ? JSON.stringify(config.params) : "";
  return `${method} ${config.baseURL ?? ""}${url}?${params}`;
};

/** Read a cookie value by name (client-side only) */
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
 * Create configured axios instance with interceptors
 *
 * @param baseURL - API base URL for requests
 * @returns {AxiosInstance} Configured axios instance with cookie-based auth
 */
const createAxiosInstance = (baseURL: string): AxiosInstance => {
  const instance = axios.create({
    baseURL,
    headers: {},
    timeout: 10000, // 10 second timeout
    withCredentials: true, // Send bn.session cookie with every request
  });

  /**
   * Request Interceptor:
   * - On SSR: forward the incoming request's Cookie header so the backend sees
   *   the same session as the browser would.
   * - On client: attach CSRF token for mutating requests via double-submit cookie.
   */
  instance.interceptors.request.use((config) => {
    if (import.meta.server) {
      try {
        const headers = useRequestHeaders(["cookie"]);
        if (headers.cookie) {
          config.headers["cookie"] = headers.cookie;
        }
      } catch {
        // useRequestHeaders may not be available outside a request context
      }
    }
    if (
      import.meta.client &&
      config.method &&
      MUTATING_METHODS.has(config.method.toLowerCase())
    ) {
      const csrfToken = getCookieValue("XSRF-TOKEN");
      if (csrfToken) {
        config.headers["X-XSRF-TOKEN"] = csrfToken;
      }
    }
    return config;
  });

  /**
   * Response Interceptor: Handle 401 Unauthorized Errors
   *
   * When a 401 error occurs (session expired/invalid):
   * 1. Skip redirect if the failing request was itself a login attempt (show error to user)
   * 2. Skip redirect if already on the home page (prevent redirect loops)
   * 3. Otherwise reset user state and redirect to home
   */
  instance.interceptors.response.use(
    (response) => {
      // Clear logout flag on any successful auth response (session is valid)
      if (
        import.meta.client &&
        response.config?.url?.includes("/auth/sign-in/username")
      ) {
        sessionStorage.removeItem("session_logged_out");
      }
      return response;
    },
    async (error: AxiosError) => {
      // 401 redirect logic is client-only — never touch window/sessionStorage on server
      if (error.response?.status === 401 && import.meta.client) {
        const reqUrl = error.config?.url || "";
        // Don't redirect on login attempts (show error to user instead)
        const isLoginAttempt = reqUrl.includes("/auth/sign-in/username");
        // Consider locale-prefixed roots (/id, /ko, /th) as "home" too
        const path = window.location.pathname;
        const alreadyAtHome = path === "/" || /^\/(id|ko|th)\/?$/.test(path);

        if (!isLoginAttempt) {
          // Only auto-logout once per session (prevent infinite reload loop)
          const alreadyLoggedOut = sessionStorage.getItem("session_logged_out");
          if (alreadyLoggedOut) return Promise.reject(error);
          sessionStorage.setItem("session_logged_out", "1");

          // Reset in-memory user state before navigating
          try {
            const authStore = useAuthStore();
            authStore.resetUser();
          } catch {
            // Store may not be available in all contexts
          }
          if (alreadyAtHome) {
            window.location.reload();
          } else {
            window.location.href = "/";
          }
        }
      }

      // Retry transient failures for IDEMPOTENT methods only (GET/HEAD).
      // Mutations (POST/PUT/PATCH/DELETE) are intentionally excluded above
      // via isIdempotent() so money-changing requests are never replayed.
      const config = error.config as RetryableConfig | undefined;
      if (config && isIdempotent(config.method) && isRetryableError(error)) {
        const attempt = config.__retryCount ?? 0;
        if (attempt < MAX_RETRIES) {
          config.__retryCount = attempt + 1;
          await delay(RETRY_BASE_DELAY_MS * Math.pow(2, attempt));
          return instance(config);
        }
      }

      return Promise.reject(error);
    },
  );

  return instance;
};

/**
 * Wrap an axios instance's `get` so identical concurrent GET requests share a
 * single in-flight promise. The shared entry is cleared once the underlying
 * request settles, so subsequent calls re-fetch normally. POST/PUT/PATCH/DELETE
 * are untouched — only GETs are de-duplicated.
 */
const withGetDeduplication = (instance: AxiosInstance): AxiosInstance => {
  const inFlight = new Map<string, Promise<AxiosResponse>>();
  const originalGet = instance.get.bind(instance);

  instance.get = function dedupedGet<T = unknown>(
    url: string,
    config?: Parameters<AxiosInstance["get"]>[1],
  ): Promise<AxiosResponse<T>> {
    const key = dedupeKey({
      method: "get",
      url,
      baseURL: config?.baseURL,
      params: config?.params,
    } as InternalAxiosRequestConfig);

    const existing = inFlight.get(key);
    if (existing) {
      return existing as Promise<AxiosResponse<T>>;
    }

    const pending = originalGet<T>(url, config).finally(() => {
      inFlight.delete(key);
    });
    inFlight.set(key, pending as Promise<AxiosResponse>);
    return pending;
  } as AxiosInstance["get"];

  return instance;
};

let _instance: AxiosInstance | null = null;

function getAxiosInstance(): AxiosInstance {
  if (!_instance) {
    _instance = withGetDeduplication(createAxiosInstance(getApiBase()));
  }
  return _instance;
}

/**
 * Axios client instance with cookie-based session authentication
 *
 * Use this for all API calls. The bn.session cookie is automatically
 * sent with every request via withCredentials: true.
 * Instance is created lazily on first use (within Nuxt context).
 */
export const axiosClient = new Proxy({} as AxiosInstance, {
  get(_, prop) {
    return getAxiosInstance()[prop as keyof AxiosInstance];
  },
});

/**
 * Default export for convenience
 */
export default axiosClient;
