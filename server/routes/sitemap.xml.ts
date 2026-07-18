/**
 * Dynamic sitemap.xml — generated per-request so every deployed subdomain
 * (idr-demo1, demo6, jaeisol.com, …) serves correct absolute URLs without
 * any per-site env-var configuration.
 *
 * i18n uses `strategy: "no_prefix"` — the locale is not in the URL, and each
 * deployment serves a single language chosen by its currency. So every page
 * has exactly one URL; there are no `/id|/ko|/th` variants and no per-locale
 * hreflang alternates. See PLAN-PAGE-LOADS-TWICE.md.
 */

type SitemapPage = {
  path: string;
  changefreq: string;
  priority: string;
};

// Canonical list of public, indexable URLs. Must track the navbar
// (`assets.navIcons.menuItems`) — the nav config lives in a client composable
// that isn't cleanly importable here, so this stays the single server-side
// source of truth. Authenticated / sensitive pages (history, invoice,
// partner-deposit/withdraw, activity) are intentionally omitted and
// additionally carry a `noindex` meta tag.
const ALL_PAGES: SitemapPage[] = [
  { path: "/", changefreq: "daily", priority: "1.0" },
  { path: "/hot", changefreq: "daily", priority: "0.9" },
  { path: "/casino", changefreq: "daily", priority: "0.9" },
  { path: "/slots", changefreq: "daily", priority: "0.9" },
  { path: "/sports", changefreq: "daily", priority: "0.8" },
  { path: "/mini", changefreq: "weekly", priority: "0.7" },
  { path: "/fishing", changefreq: "weekly", priority: "0.7" },
  { path: "/virtual", changefreq: "weekly", priority: "0.7" },
  { path: "/promotions", changefreq: "weekly", priority: "0.6" },
  { path: "/partner", changefreq: "monthly", priority: "0.3" },
];

export default defineEventHandler(async (event) => {
  const url = getRequestURL(event);
  const origin = `${url.protocol}//${url.host}`;
  const now = new Date();
  const lastmod = now.toISOString().slice(0, 10); // YYYY-MM-DD

  const urlEntries = ALL_PAGES.map((page) => {
    const loc = page.path === "/" ? "/" : page.path;
    return [
      `  <url>`,
      `    <loc>${origin}${loc}</loc>`,
      `    <lastmod>${lastmod}</lastmod>`,
      `    <changefreq>${page.changefreq}</changefreq>`,
      `    <priority>${page.priority}</priority>`,
      `  </url>`,
    ].join("\n");
  }).join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urlEntries}
</urlset>
`;

  setHeader(event, "content-type", "application/xml; charset=utf-8");
  setHeader(event, "cache-control", "public, max-age=3600");
  setHeader(event, "last-modified", now.toUTCString());
  return xml;
});
