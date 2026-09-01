// Must match the API's versioned, per-origin CSRF cookie. The V2 name avoids
// colliding with host-only cookies issued before direct API browser access.
export const CSRF_COOKIE_NAME = "XSRF-TOKEN-V2";
export const CSRF_HEADER_NAME = "X-CSRF-Token";

export function getBrowserCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  if (!match?.[1]) return null;
  try {
    return decodeURIComponent(match[1]);
  } catch {
    return null;
  }
}

export function getCsrfHeaders(): Record<string, string> {
  const token = getBrowserCookie(CSRF_COOKIE_NAME);
  return token ? { [CSRF_HEADER_NAME]: token } : {};
}
