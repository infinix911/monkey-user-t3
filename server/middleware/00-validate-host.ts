import { createError, getHeader, getRequestURL } from "h3";
import { isTrustedInternalI18nRequest } from "../../shared/utils/request-security";
import { getCanonicalAuthority } from "../utils/request-security";

/** Reject host-header poisoning before SSR, tenant lookup, or cache selection. */
export default defineEventHandler((event) => {
  if (
    isTrustedInternalI18nRequest(
      getHeader(event, "host"),
      event.node.req.socket.remoteAddress,
      getRequestURL(event).pathname,
    )
  ) {
    return;
  }

  if (!getCanonicalAuthority(event)) {
    throw createError({ statusCode: 421, statusMessage: "Misdirected Request" });
  }
});
