import { getSiteUrl } from "@/lib/domain";
import type { CustomSeoEntry } from "@/lib/siteConfig";
import type { ResolvableLink } from "@unhead/vue";

interface AmpHtmlHeadLink {
  rel: "amphtml";
  href: string;
}

function absoluteHttpUrl(raw: string): string | null {
  try {
    const url = new URL(raw);
    return url.protocol === "http:" || url.protocol === "https:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function normalizeImageType(raw?: string): string | undefined {
  if (!raw) return undefined;
  const v = raw.trim().toLowerCase().replace(/^\./, "");
  if (v.startsWith("image/")) return v;
  if (v === "jpg" || v === "jpeg") return "image/jpeg";
  if (v === "png" || v === "webp" || v === "gif") return `image/${v}`;
  return undefined;
}

/**
 * Turn an admin-stored `ampTag` value into a head <link> object.
 *
 * The CMS stores `seo.general.ampTag` as a full tag string, e.g.
 *   `<link rel="amphtml" href="https://example.com/" >`
 * Nuxt's useHead only emits structured tags (no raw HTML strings), so we
 * parse *every* attribute out of the stored string and re-emit them — the
 * rendered tag is therefore verbatim (all attributes preserved).
 *
 * Also accepts a bare URL (older custom-seo rows), which becomes
 * `<link rel="amphtml" href="…">`. Anything else (free text) → null, so a
 * malformed value doesn't emit an invalid tag.
 */
function buildAmpLink(raw?: string | null): AmpHtmlHeadLink | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // Full tag string — accept only its HTTP(S) href. Arbitrary CMS attributes
  // must never become event handlers or unexpected link behavior.
  if (value.includes("<")) {
    const match = value.match(/\bhref\s*=\s*["']([^"']+)["']/i);
    const href = match?.[1] ? absoluteHttpUrl(match[1]) : null;
    return href ? { rel: "amphtml", href } : null;
  }

  // Bare URL.
  const href = absoluteHttpUrl(value);
  return href ? { rel: "amphtml", href } : null;
}

/**
 * Pull a URL out of an admin-stored value that is either a bare URL or a
 * full tag string (`… href="…" …`). Returns "" if no usable URL is found,
 * so junk values don't emit a tag. Used for `ampPageRedirect`.
 */
function hrefFromValue(raw?: string | null): string {
  if (!raw) return "";
  const value = raw.trim();
  if (!value) return "";
  if (value.includes("<")) {
    const m = value.match(/href\s*=\s*["']([^"']+)["']/i);
    return m?.[1] ?? "";
  }
  return /^https?:\/\//i.test(value) ? value : "";
}

function filenameFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  try {
    const path = new URL(url).pathname;
    const seg = path.split("/").filter(Boolean).pop();
    return seg || undefined;
  } catch {
    const seg = url.split("?")[0]?.split("/").filter(Boolean).pop();
    return seg || undefined;
  }
}

/**
 * Per-page SEO head composable.
 *
 * Precedence per field:
 *   1. Matched custom-seo row (if a row's canonical equals the current
 *      pathname — see `useCustomSeoMatch`).
 *   2. `/api/site/config/userpage` (`seo.social.*`, `seo.meta.*`,
 *      `seo.verification.*`) — the CMS admin's defaults.
 *   3. Bundled brand defaults from `useSiteConfigLucky.ts` etc.
 *
 * Empty / null fields on the matched row fall through to the next layer;
 * they do not blank out the userpage value.
 */
export function useSeoHead(pageDefaults?: {
  title?: string;
  description?: string;
  keywords?: string;
}) {
  const route = useRoute();
  const { locale: _locale } = useI18n();
  const baseUrl = getSiteUrl();

  const apiCfg = useSiteConfigData() as
    | {
        seo?: {
          social?: {
            defaultOgTitle?: string;
            defaultOgDescription?: string;
            defaultOgImage?: string;
            defaultOgImageWidth?: number;
            defaultOgImageHeight?: number;
            defaultOgImageType?: string;
            defaultTwitterTitle?: string;
            defaultTwitterDescription?: string;
            defaultTwitterImage?: string;
            defaultTwitterImageWidth?: number;
            defaultTwitterImageHeight?: number;
            defaultTwitterImageType?: string;
          };
          meta?: {
            defaultMetaTitle?: string;
            defaultMetaDescription?: string;
            defaultMetaKeywords?: string;
          };
          general?: {
            ampTag?: string;
            ampPageRedirect?: string;
          };
          customSeoRows?: CustomSeoEntry[];
        };
      }
    | null;
  const localCfg = useSiteConfig();
  const seo = apiCfg?.seo || localCfg?.seo;
  const social = seo?.social as
    | {
        defaultOgTitle?: string;
        defaultOgDescription?: string;
        defaultOgImage?: string;
        defaultOgImageWidth?: number;
        defaultOgImageHeight?: number;
        defaultOgImageType?: string;
        defaultTwitterTitle?: string;
        defaultTwitterDescription?: string;
        defaultTwitterImage?: string;
        defaultTwitterImageWidth?: number;
        defaultTwitterImageHeight?: number;
        defaultTwitterImageType?: string;
      }
    | undefined;
  const metaCfg = seo?.meta as
    | {
        defaultMetaTitle?: string;
        defaultMetaDescription?: string;
        defaultMetaKeywords?: string;
      }
    | undefined;
  const generalCfg = seo?.general as
    | { ampTag?: string; ampPageRedirect?: string }
    | undefined;

  const match = useCustomSeoMatch();

  // Per-page defaults (P1): a route may pass a bare label title + description so
  // each page has a distinct <title>/<meta description> even when the CMS only
  // carries a single site-wide default. Precedence sits *between* the per-page
  // custom-seo row (admin, wins) and the site-wide CMS meta (loses). Only the
  // bare label gets the "— {siteName}" suffix; CMS/custom-seo values stay
  // verbatim because admins write full titles.
  const siteName = localCfg?.identity?.siteName || "";
  const pageTitle = pageDefaults?.title
    ? siteName
      ? `${pageDefaults.title} — ${siteName}`
      : pageDefaults.title
    : "";
  const pageDescription = pageDefaults?.description || "";
  const pageKeywords = pageDefaults?.keywords || "";

  // Strict source separation:
  //   - Document <title> / <meta description> come from the `meta.*` block.
  //   - og:* come from `social.defaultOg*`.
  //   - twitter:* come from `social.defaultTwitter*` (falling back to OG when
  //     the admin left the Twitter field blank).
  // A matched custom-seo row is a per-page override (not a "social" key), so
  // it still takes precedence everywhere for that page.

  // Document <title> and <meta name="description"> — `meta.*` block only.
  const documentTitle = computed(
    () =>
      match.value?.metaTitle ||
      pageTitle ||
      metaCfg?.defaultMetaTitle ||
      "",
  );
  const documentDescription = computed(
    () =>
      match.value?.metaDescription ||
      pageDescription ||
      metaCfg?.defaultMetaDescription ||
      "",
  );

  // og:* — social OG keys only.
  const ogTitle = computed(
    () => match.value?.metaTitle || pageTitle || social?.defaultOgTitle || "",
  );
  const ogDescription = computed(
    () =>
      match.value?.metaDescription ||
      pageDescription ||
      social?.defaultOgDescription ||
      "",
  );

  // twitter:* — social Twitter keys, falling back to OG when blank.
  const twitterTitle = computed(
    () =>
      match.value?.metaTitle ||
      pageTitle ||
      social?.defaultTwitterTitle ||
      social?.defaultOgTitle ||
      "",
  );
  const twitterDescription = computed(
    () =>
      match.value?.metaDescription ||
      pageDescription ||
      social?.defaultTwitterDescription ||
      social?.defaultOgDescription ||
      "",
  );
  const keywords = computed(
    () =>
      match.value?.metaKeyword ||
      pageKeywords ||
      metaCfg?.defaultMetaKeywords ||
      "",
  );
  // Google verification: per-page custom-seo row only (no site-wide default).
  const googleVerification = computed(
    () => match.value?.googleVerificationSite || "",
  );
  const image = social?.defaultOgImage;
  const ogWidth = social?.defaultOgImageWidth;
  const ogHeight = social?.defaultOgImageHeight;
  const ogType = normalizeImageType(social?.defaultOgImageType);
  const ogAlt = filenameFromUrl(image);
  const twitterImage = social?.defaultTwitterImage || image;
  const twitterWidth = social?.defaultTwitterImageWidth ?? ogWidth;
  const twitterHeight = social?.defaultTwitterImageHeight ?? ogHeight;
  const twitterType =
    normalizeImageType(social?.defaultTwitterImageType) ?? ogType;
  const twitterAlt = filenameFromUrl(twitterImage);

  // Freshness signal for SEO checkers (og:updated_time + Last-Modified
  // header). Regenerated on every SSR render — reflects the time the page
  // was last served, which is accurate enough for a dynamic casino site.
  const nowIso = new Date().toISOString();
  if (import.meta.server) {
    const lastMod = useResponseHeader("Last-Modified");
    lastMod.value = new Date().toUTCString();
  }

  const canonicalUrl = computed(
    () => match.value?.canonical || `${baseUrl}${route.path}`,
  );
  // amphtml link: per-page custom-seo row wins, then the userpage
  // `seo.general.ampTag` (a full <link> tag the admin pastes in the CMS).
  const ampLink = computed(
    () => buildAmpLink(match.value?.ampTag) || buildAmpLink(generalCfg?.ampTag),
  );
  // amphtml page redirect → emitted as a non-navigating <link rel="alternate">.
  // Per-page custom-seo row wins, then the userpage `seo.general.ampPageRedirect`.
  const ampRedirect = computed(
    () =>
      hrefFromValue(match.value?.ampPageRedirect) ||
      hrefFromValue(generalCfg?.ampPageRedirect),
  );

  // No hreflang alternates: i18n runs `strategy: "no_prefix"`, so each
  // deployment serves a single language (chosen by its currency) under one
  // set of URLs. There are no `/id|/ko|/th` variants to point at.
  // See PLAN-PAGE-LOADS-TWICE.md.

  useHead(() => {
    const link: ResolvableLink[] = [
      { rel: "canonical", href: canonicalUrl.value, key: "canonical" },
      ...(ampLink.value ? [{ ...ampLink.value, key: "amphtml" }] : []),
      ...(ampRedirect.value
        ? [
            {
              rel: "alternate" as const,
              href: ampRedirect.value,
              key: "amp-redirect",
            },
          ]
        : []),
    ];

    return {
    title: documentTitle.value,
    meta: [
      {
        name: "description",
        content: documentDescription.value,
        key: "desc",
      },
      ...(keywords.value
        ? [{ name: "keywords", content: keywords.value, key: "keywords" }]
        : []),
      // Per-page custom-seo Google verification. No `key`: name-dedup keeps a
      // single google-site-verification tag if other sources ever emit one.
      ...(googleVerification.value
        ? [
            {
              name: "google-site-verification",
              content: googleVerification.value,
            },
          ]
        : []),
      { property: "og:title", content: ogTitle.value, key: "og:title" },
      {
        property: "og:description",
        content: ogDescription.value,
        key: "og:desc",
      },
      { property: "og:url", content: canonicalUrl.value, key: "og:url" },
      { property: "og:type", content: "website", key: "og:type" },
      { property: "og:updated_time", content: nowIso, key: "og:updated" },
      ...(image
        ? [
            { property: "og:image", content: image, key: "og:image" },
            ...(ogWidth
              ? [
                  {
                    property: "og:image:width",
                    content: String(ogWidth),
                    key: "og:image:w",
                  },
                ]
              : []),
            ...(ogHeight
              ? [
                  {
                    property: "og:image:height",
                    content: String(ogHeight),
                    key: "og:image:h",
                  },
                ]
              : []),
            ...(ogType
              ? [
                  {
                    property: "og:image:type",
                    content: ogType,
                    key: "og:image:t",
                  },
                ]
              : []),
            ...(ogAlt
              ? [
                  {
                    property: "og:image:alt",
                    content: ogAlt,
                    key: "og:image:a",
                  },
                ]
              : []),
          ]
        : []),
      { name: "twitter:title", content: twitterTitle.value, key: "tw:title" },
      {
        name: "twitter:description",
        content: twitterDescription.value,
        key: "tw:desc",
      },
      ...(twitterImage
        ? [
            { name: "twitter:image", content: twitterImage, key: "tw:image" },
            ...(twitterWidth
              ? [
                  {
                    name: "twitter:image:width",
                    content: String(twitterWidth),
                    key: "tw:image:w",
                  },
                ]
              : []),
            ...(twitterHeight
              ? [
                  {
                    name: "twitter:image:height",
                    content: String(twitterHeight),
                    key: "tw:image:h",
                  },
                ]
              : []),
            ...(twitterType
              ? [
                  {
                    name: "twitter:image:type",
                    content: twitterType,
                    key: "tw:image:t",
                  },
                ]
              : []),
            ...(twitterAlt
              ? [
                  {
                    name: "twitter:image:alt",
                    content: twitterAlt,
                    key: "tw:image:a",
                  },
                ]
              : []),
          ]
        : []),
    ],
      link,
    };
  });
}
