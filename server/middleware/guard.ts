/**
 * Server-side auth guard
 *
 * Runs before the renderer. If a request targets a protected path but has no
 * bn.session cookie, redirect to the locale-aware home page. Authenticated
 * requests pass through and get full SSR.
 *
 * This is a fast cookie-presence check only — it does not call the backend.
 * The canonical session check happens on the API side via axios/$fetch.
 */
const PROTECTED_PREFIXES: string[] = [];

const LOCALE_PREFIXES = ["/id", "/ko", "/th"];

// Strip locale prefix so /id/some/path becomes /some/path for comparison.
function stripLocale(path: string): { locale: string; path: string } {
  for (const lp of LOCALE_PREFIXES) {
    if (path === lp || path.startsWith(lp + "/")) {
      return { locale: lp, path: path.slice(lp.length) || "/" };
    }
  }
  return { locale: "", path };
}

// Matches game URLs like /slot/GAME_abc or /casino/GAME_xyz
const GAME_ROUTE_PATTERN = /^\/[a-z][a-z0-9-]*\/GAME_[A-Za-z0-9_-]+$/;

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const { locale, path } = stripLocale(url.pathname);

  const isProtected =
    PROTECTED_PREFIXES.some((p) => path === p || path.startsWith(p + "/")) ||
    GAME_ROUTE_PATTERN.test(path);
  if (!isProtected) return;

  const cookie = getHeader(event, "cookie") || "";
  if (/\bbn\.session=/.test(cookie)) return;

  return sendRedirect(event, locale || "/", 302);
});
