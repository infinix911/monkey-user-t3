import type { H3Event } from "h3";
import { getSiteCurrency } from "./site-currency";

/**
 * Server-side counterpart of `useFeatures()` for Nitro handlers and
 * server middleware. Mirrors the same rules so client and server agree on
 * what's gated. Async because the underlying currency comes from a backend
 * fetch (cached per-isolate in `getSiteCurrency`).
 */
export async function getFeatures(event: H3Event) {
  const currency = await getSiteCurrency(event);
  return {
    payments: currency !== "THB",
  };
}
