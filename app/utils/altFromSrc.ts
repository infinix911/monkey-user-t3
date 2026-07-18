/**
 * Derive an accessible `alt` string from an image `src` URL or path.
 *
 * Returns the basename without the extension, so
 *   "/designs/template-3/banners/banner-left.png?v=2" → "banner-left".
 *
 * Nuxt auto-imports files under `app/utils/`, so templates can call
 * `altFromSrc(...)` without an explicit import.
 */
export function altFromSrc(src: unknown): string {
  if (!src) return "";
  const s = String(src).split(/[?#]/)[0] ?? "";
  const last = s.split("/").pop() ?? "";
  return last.replace(/\.[^.]+$/, "");
}
