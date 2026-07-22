import { createError } from "h3";
import { getCanonicalAuthority } from "../utils/request-security";

/** Reject host-header poisoning before SSR, tenant lookup, or cache selection. */
export default defineEventHandler((event) => {
  if (!getCanonicalAuthority(event)) {
    throw createError({ statusCode: 421, statusMessage: "Misdirected Request" });
  }
});
