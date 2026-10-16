import { r2PublicBase } from "../../shared/utils/r2-public-base";

/** Public R2 custom-domain origin, configured at build time. */
export const ASSET_CDN_BASE = r2PublicBase(import.meta.env.R2_PUBLIC_BASE_URL);

/** Rewrite a local `/designs/**` path to its public asset URL. */
export function cdn(path: string): string {
  if (!path || !path.startsWith("/designs/")) return path;
  return ASSET_CDN_BASE + path;
}

/**
 * Keep canvas-readable images same-origin using their copies under `public/`.
 * Cross-origin images can taint the canvas when the asset host omits CORS headers.
 */
export function sameOrigin(url: string): string {
  if (url === ASSET_CDN_BASE) return "/";
  return url.startsWith(`${ASSET_CDN_BASE}/`) ? url.slice(ASSET_CDN_BASE.length) : url;
}
