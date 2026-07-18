/**
 * Asset CDN helper.
 *
 * Local `/designs/**` images are served from the Linode (S3) bucket that
 * mirrors them. `cdn()` rewrites a local path to its CDN URL; absolute URLs and
 * non-`/designs` paths (e.g. `/images/**`, routes) pass through untouched.
 */

/** Origin of the Linode bucket mirroring `public/designs`. */
const ASSET_CDN_BASE = "https://banana.sg-sin-1.linodeobjects.com";

/** Rewrite a local `/designs/**` path to its CDN URL (no-op otherwise). */
export function cdn(path: string): string {
  if (!path || !path.startsWith("/designs/")) return path;
  return ASSET_CDN_BASE + path;
}

/**
 * Strip the asset-CDN origin so the file is served same-origin from `public/`.
 *
 * Use for images read pixel-by-pixel on a `<canvas>` (TrimmedImage's alpha trim):
 * the Linode bucket sends no CORS headers, so a cross-origin image taints the
 * canvas and the read throws — the trim silently fails and the logo renders tiny.
 * The same files exist under `public/`, so serving them same-origin makes the
 * trim work. No-op for relative or non-CDN URLs.
 */
export function sameOrigin(url: string): string {
  if (!url) return url;
  return url.startsWith(ASSET_CDN_BASE) ? url.slice(ASSET_CDN_BASE.length) : url;
}
