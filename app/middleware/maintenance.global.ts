/**
 * Maintenance gate (global).
 *
 * Sends every page to `/maintenance` while the admin `maintenance:enabled` site
 * setting is on, and back to the homepage when it is off. The flag rides in the
 * public `/site/settings` payload (`fetchSiteSettings`, cached in the site
 * store) — a read the API keeps reachable during maintenance — so the gate
 * stays correct even while every other endpoint is returning 503.
 *
 * This is the UX layer; the user-api guard is the hard gate. If the flag is
 * flipped on mid-session the API starts returning 503 immediately, and this
 * redirect follows on the next navigation or full load.
 */
export default defineNuxtRouteMiddleware(async (to) => {
  const settings = await fetchSiteSettings();
  const enabled =
    settings?.["maintenance:enabled"]?.trim().toLowerCase() === "true";
  const onMaintenance = to.path === "/maintenance";

  if (enabled && !onMaintenance) return navigateTo("/maintenance");
  if (!enabled && onMaintenance) return navigateTo("/");
});
