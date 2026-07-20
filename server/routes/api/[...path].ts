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

  return proxyRequest(event, target, {
    sendStream: true,
    cookieDomainRewrite: { "*": "" },
    fetchOptions: { redirect: "manual" },
    headers: {
      "x-forwarded-host": originalHost,
      "x-forwarded-proto": originalProto,
    },
  });
});
