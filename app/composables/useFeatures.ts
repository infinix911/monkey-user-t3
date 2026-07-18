/**
 * Feature flags derived from the CMS-driven currency.
 *
 * Currency is read from `useSiteCurrency()` which resolves the
 * `currency` field on the userpage site-config payload. Stays synchronous —
 * by the time any component calls this, `app.vue` has already hydrated
 * `useState('userPageConfig')`.
 *
 * Server-side handlers (server/middleware, server/routes) cannot use this
 * composable; use `getFeatures(event)` from `server/utils/features` instead.
 */
import { useSiteCurrency } from "@/composables/useSiteCurrency";

export function useFeatures() {
  const currency = useSiteCurrency();
  return {
    payments: currency !== "THB",
  };
}
