/**
 * Legacy locale-prefix redirect.
 *
 * i18n moved to `strategy: "no_prefix"` — the locale is no longer carried in
 * the URL (it follows the deployment's API currency instead). The old `/id`,
 * `/ko`, `/th` URL trees no longer exist as routes, so 301 any such request
 * to its unprefixed equivalent — indexed/bookmarked links keep working
 * instead of 404ing. See PLAN-PAGE-LOADS-TWICE.md.
 *
 * Matches only a whole leading segment (`/id`, `/id/...`) — paths like
 * `/identity` are left untouched.
 */
const LEGACY_LOCALE = /^\/(id|ko|th)(\/.*)?$/;

export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const match = LEGACY_LOCALE.exec(url.pathname);
  if (!match) return;

  const rest = match[2] || "/";
  return sendRedirect(event, `${rest}${url.search}`, 301);
});
