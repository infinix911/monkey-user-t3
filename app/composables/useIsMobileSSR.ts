/**
 * SSR-safe mobile detection based on the User-Agent header.
 *
 * Unlike `useMobileDetect` (viewport-based, client-only) and
 * `uiStore.isMobile` (defaults to `false` on SSR), this returns the same
 * value on server and client, so it can gate `v-if` without hydration
 * mismatches and without rendering both branches.
 *
 * Use this for *render-time* decisions where one branch loads heavy media
 * (videos, hero images) — viewport-based detection forces both branches
 * into the DOM and the browser fetches both.
 *
 * Tradeoff: UA does not equal viewport. A landscape iPad reports as mobile
 * UA but has a wide viewport; a narrow desktop window reports as desktop
 * UA. The mismatch cases get a slightly cropped video via `object-cover`
 * but avoid the doubled bandwidth cost.
 */
export function useIsMobileSSR() {
  return useState<boolean>("isMobileSSR", () => {
    const MOBILE_UA = /Mobi|Android|iPhone|iPad|iPod/i;
    if (import.meta.server) {
      const ua = useRequestHeaders(["user-agent"])["user-agent"] || "";
      return MOBILE_UA.test(ua);
    }
    if (import.meta.client) {
      return MOBILE_UA.test(navigator.userAgent);
    }
    return false;
  });
}
