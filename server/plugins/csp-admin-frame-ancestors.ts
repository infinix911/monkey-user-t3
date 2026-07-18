/**
 * Runtime CSP `frame-ancestors` injection for the admin theme-preview iframe.
 *
 * The admin panel (`/cms/userpage-theme`) embeds this site in a cross-origin
 * iframe (`<userSiteUrl>/?themePreview=1`) to drive a live theme preview. For
 * the browser to allow that framing, the admin origin must appear in this
 * site's `Content-Security-Policy: frame-ancestors` directive.
 *
 * nuxt-security bakes the `frame-ancestors` list into the response header at
 * BUILD time (from `process.env.NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN` in
 * nuxt.config.ts). In the Docker image that env var is unset at build, so the
 * baked value is only `'self' http://localhost:*` and cannot be changed by the
 * runtime `.env`.
 *
 * This plugin closes that gap: it reads the SAME runtime value the client
 * postMessage allowlist uses (`runtimeConfig.public.adminPreviewOrigin`,
 * comma-separated) and injects any missing origins into the already-set CSP
 * header. It runs in the `render:response` hook AFTER nuxt-security's
 * `70-securityHeaders` plugin (user `server/plugins/*` register after
 * module-added plugins), mirroring `cache-bypass-authenticated.ts`.
 *
 * Note: `frame-ancestors` is enforced only via the HTTP header — the CSP
 * `<meta>` tag is ignored by browsers for this directive — so patching the
 * response header is sufficient.
 */

const CSP_HEADER = "content-security-policy";

/**
 * Inject `origins` into the `frame-ancestors` directive of a CSP header string,
 * skipping any origin already present. Returns the CSP unchanged when there is
 * no `frame-ancestors` directive or nothing new to add.
 */
export function injectFrameAncestors(csp: string, origins: string[]): string {
  if (origins.length === 0) return csp;

  let changed = false;
  const directives = csp.split(";").map((directive) => {
    const trimmed = directive.trim();
    if (!trimmed) return directive;

    const tokens = trimmed.split(/\s+/);
    const name = tokens[0]?.toLowerCase();
    if (name !== "frame-ancestors") return directive;

    const existing = new Set(tokens.slice(1));
    const toAdd = origins.filter((origin) => !existing.has(origin));
    if (toAdd.length === 0) return directive;

    changed = true;
    return [trimmed, ...toAdd].join(" ");
  });

  return changed ? directives.join(";") : csp;
}

export default defineNitroPlugin((nitroApp) => {
  const raw = (useRuntimeConfig().public.adminPreviewOrigin as
    | string
    | undefined) ?? "";
  const origins = raw
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (origins.length === 0) return;

  nitroApp.hooks.hook("render:response", (_response, { event }) => {
    if (event.node.res.headersSent) return;

    const current = getResponseHeader(event, CSP_HEADER);
    if (typeof current !== "string" || !current.includes("frame-ancestors")) {
      return;
    }

    const patched = injectFrameAncestors(current, origins);
    if (patched !== current) {
      setResponseHeader(event, CSP_HEADER, patched);
    }
  });
});
