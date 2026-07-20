import { proxyRequest, getRequestHost, getRequestProtocol } from "h3";

/**
 * Same-origin REST proxy. Forwards /api/<anything> from the browser to the
 * backend at NUXT_API_URL. The backend URL is server-only (runtimeConfig.apiUrl)
 * and never reaches the client bundle.
 *
 * `cookieDomainRewrite: { "*": "" }` strips the Domain attribute from any
 * Set-Cookie the backend returns, so cookies (bn.session, XSRF-TOKEN) attach
 * to the frontend origin rather than the backend host.
 *
 * `x-forwarded-host` / `x-forwarded-proto` preserve the browser-visible host
 * and scheme because proxyRequest rewrites the outbound Host header to the
 * internal Docker service (banusrapi:4000). Cloudflare's cf-connecting-ip
 * passes through unchanged so the API can see the real client IP.
 */
export default defineEventHandler(async (event) => {
  const cfg = useRuntimeConfig();
  const apiUrl = cfg.apiUrl as string | undefined;

  if (!apiUrl) {
    throw createError({
      statusCode: 500,
      statusMessage: "NUXT_API_URL is not configured",
    });
  }

  const path = (event.context.params?.path as string | undefined) ?? "";
  const search = getRequestURL(event).search;
  const target = `${apiUrl.replace(/\/$/, "")}/${path}${search}`;

  const originalHost = getRequestHost(event, { xForwardedHost: true });
  const originalProto = getRequestProtocol(event, { xForwardedProto: true });

  try {
    return await proxyRequest(event, target, {
      // Buffer in dev so a client/upstream abort throws here (caught below)
      // instead of erroring mid-stream and restarting the Nuxt dev server.
      // Keep streaming in production for efficiency.
      sendStream: !import.meta.dev,
      cookieDomainRewrite: { "*": "" },
      fetchOptions: { redirect: "manual" },
      headers: {
        "x-forwarded-host": originalHost,
        "x-forwarded-proto": originalProto,
      },
    });
  } catch (err) {
    // Benign connection aborts: the client cancelled (navigation / HMR reload)
    // or the upstream backend dropped the socket mid-stream (e.g. it hot-
    // reloaded). Swallow these so they don't surface as dev "Restarting Nuxt
    // due to error" churn. Re-throw anything else.
    const code = (err as { code?: string })?.code;
    const msg = (err as { message?: string })?.message ?? "";
    const isAbort =
      code === "ECONNABORTED" ||
      code === "ECONNRESET" ||
      code === "ABORT_ERR" ||
      /aborted|socket hang up|ECONNRESET|ECONNABORTED/i.test(msg);
    if (isAbort) return null;
    throw err;
  }
});
