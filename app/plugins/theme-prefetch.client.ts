/**
 * Apply the CMS theme before the app's first render when the static HTML's
 * early request (lib/theme-prefetch.ts) has already landed — on a cold visit
 * the bundle takes seconds to download, so it usually has. Without this the
 * first frame used the bundled default theme and restyled ~0.5s later.
 *
 * Never waits: if the response is still in flight, the app renders its
 * bundled fallback as before and fetchSiteConfig() applies it on arrival.
 */
import { applyThemePrefetchIfReady } from "@/lib/siteConfig";

export default defineNuxtPlugin({
  name: "theme-prefetch",
  setup() {
    applyThemePrefetchIfReady();
  },
});
