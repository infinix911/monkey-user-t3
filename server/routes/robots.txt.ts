/**
 * Dynamic robots.txt — generated per-request so every deployed subdomain
 * (idr-demo1, demo6, jaeisol.com, …) serves a correct absolute Sitemap URL
 * without any per-site env-var configuration.
 */
export default defineEventHandler((event) => {
  const url = getRequestURL(event);
  const origin = `${url.protocol}//${url.host}`;

  setHeader(event, "content-type", "text/plain; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600");

  return [
    "User-Agent: *",
    "Allow: /",
    "",
    `Sitemap: ${origin}/sitemap.xml`,
    "",
  ].join("\n");
});
