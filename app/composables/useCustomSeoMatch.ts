import type { CustomSeoEntry } from "@/lib/siteConfig";

/**
 * Normalize a canonical/path value for comparison.
 *
 *  - Full URLs (contain `://`) are parsed; only `pathname` is kept. The host
 *    portion is discarded — the hostname pre-filter in `applyCustomSeo`
 *    already guarantees the row belongs to the current domain, so the host
 *    portion of `canonical` is treated as a display string only.
 *  - Path-only values pass through.
 *  - Result is lowercased, trailing slash collapsed (except root `/`),
 *    query string and fragment stripped.
 *  - Empty / undefined / unparseable inputs return `""` which never matches
 *    a real path.
 */
export function normalizePath(value: string | undefined | null): string {
  if (!value) return "";
  let path: string;
  if (value.includes("://")) {
    try {
      path = new URL(value).pathname;
    } catch {
      return "";
    }
  } else {
    const stripped = value.split("?")[0]?.split("#")[0] ?? "";
    path = stripped;
  }
  path = path.toLowerCase();
  if (path.length > 1 && path.endsWith("/")) path = path.slice(0, -1);
  return path;
}

/**
 * Per-page resolver for `/api/site/custom-seo` rows.
 *
 * Matching rule:
 *  - **Exact normalized pathname only.** No prefix matching (a row with
 *    canonical `/casino` does NOT match `/casino/sgp`).
 *  - **No fallback to the `/` row** for non-`/` pages. A row only applies
 *    to the page whose URL it explicitly names.
 *
 * Returns `null` when:
 *  - the userpage payload didn't include `customSeoRows` (older cache /
 *    pre-deploy), OR
 *  - no row's normalized canonical equals the current normalized pathname.
 *
 * In that case, callers fall through to userpage's `seo.*` values, then to
 * the bundled brand defaults.
 */
export function useCustomSeoMatch() {
  const route = useRoute();

  const cfg = useSiteConfigData() as
    | { seo?: { customSeoRows?: CustomSeoEntry[] } }
    | null;

  return computed<CustomSeoEntry | null>(() => {
    const rows = cfg?.seo?.customSeoRows;
    if (!rows || !rows.length) return null;

    let currentPath = route.path;
    if (import.meta.server) {
      try {
        currentPath = useRequestURL().pathname;
      } catch {
        // fall back to route.path
      }
    }
    const target = normalizePath(currentPath);
    if (!target) return null;

    return (
      rows.find((r) => normalizePath(r.canonical) === target) ?? null
    );
  });
}
