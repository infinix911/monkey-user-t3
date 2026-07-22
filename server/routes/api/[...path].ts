import { createError, proxyRequest } from "h3";
import { TLSSocket } from "node:tls";
import { getApiHostUrl } from "../../utils/upstream-config";
import {
  getCanonicalAuthority,
  getCanonicalClientIp,
} from "../../utils/request-security";

/**
 * Same-origin REST proxy. Forwards /api/<anything> from the browser to the
 * backend at NUXT_API_URL. The backend URL is read only from the server
 * process environment and never reaches the client bundle.
 *
 * `cookieDomainRewrite: { "*": "" }` strips the Domain attribute from any
 * Set-Cookie the backend returns, so cookies (bn.session, XSRF-TOKEN) attach
 * to the frontend origin rather than the backend host.
 *
 * Forwarding headers are generated here, never trusted from the client. The
 * request Host has already passed the deployment allowlist middleware.
 */
export default defineEventHandler(async (event) => {
  const apiUrl = getApiHostUrl();

  const path = (event.context.params?.path as string | undefined) ?? "";
  const search = getRequestURL(event).search;
  const target = `${apiUrl.replace(/\/$/, "")}/${path}${search}`;

  const originalHost = getCanonicalAuthority(event);
  if (!originalHost) {
    throw createError({ statusCode: 421, statusMessage: "Misdirected Request" });
  }
  const originalProto =
    process.env.NODE_ENV === "production"
      ? "https"
      : event.node.req.socket instanceof TLSSocket &&
          event.node.req.socket.encrypted
        ? "https"
        : "http";
  const clientIp = getCanonicalClientIp(event);

  // proxyRequest otherwise copies arbitrary inbound forwarding headers. Remove
  // them before setting the canonical values below.
  for (const name of [
    "forwarded",
    "x-forwarded-host",
    "x-forwarded-proto",
    "x-forwarded-for",
    "cf-connecting-ip",
  ]) {
    Reflect.deleteProperty(event.node.req.headers, name);
  }

  return proxyRequest(event, target, {
    sendStream: true,
    cookieDomainRewrite: { "*": "" },
    fetchOptions: { redirect: "manual" },
    headers: {
      "x-forwarded-host": originalHost,
      "x-forwarded-proto": originalProto,
      ...(clientIp
        ? { "x-forwarded-for": clientIp, "cf-connecting-ip": clientIp }
        : {}),
    },
  });
});
