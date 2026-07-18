/**
 * Structured Data (JSON-LD) composables for SEO.
 *
 * Injects schema.org markup into <head> via useHead().
 */

import { getSiteUrl } from "@/lib/domain";

type GeneralCfg = {
  siteName?: string;
  organizationName?: string;
  organizationType?: string;
  authorName?: string;
};

// Admin `organizationType` values aren't all valid schema.org types, so map
// the known ones and default to the generic "Organization".
const ORG_TYPE_MAP: Record<string, string> = {
  company: "Organization",
  corporation: "Corporation",
  organization: "Organization",
  localbusiness: "LocalBusiness",
  ngo: "NGO",
  educationalorganization: "EducationalOrganization",
  governmentorganization: "GovernmentOrganization",
};

function mapOrgType(raw?: string): string {
  if (!raw) return "Organization";
  return ORG_TYPE_MAP[raw.trim().toLowerCase()] || "Organization";
}

// `seo.general.*` from /api/site/config/userpage (falls back to brand later).
function useGeneralCfg(): GeneralCfg | undefined {
  const apiCfg = useSiteConfigData() as
    | { seo?: { general?: GeneralCfg } }
    | null;
  return apiCfg?.seo?.general;
}

export function useOrganizationSchema() {
  const baseUrl = getSiteUrl();
  const siteConfig = useSiteConfig();
  const general = useGeneralCfg();

  // Prefer the CMS organizationName, then the CMS siteName, then the bundled
  // brand name — keeps JSON-LD consistent with og:site_name.
  const orgName =
    general?.organizationName ||
    general?.siteName ||
    siteConfig.identity.siteName;

  useHead({
    script: [
      {
        type: "application/ld+json",
        key: "schema-org",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": mapOrgType(general?.organizationType),
          name: orgName,
          url: baseUrl,
          logo: `${baseUrl}/${siteConfig.identity.slug}/icons/icon-512x512.png`,
          contactPoint: {
            "@type": "ContactPoint",
            contactType: "customer service",
            availableLanguage: ["English", "Indonesian", "Korean", "Thai"],
          },
        }),
      },
    ],
  });
}

export function useWebsiteSchema() {
  const baseUrl = getSiteUrl();
  const siteConfig = useSiteConfig();
  const general = useGeneralCfg();

  const siteName = general?.siteName || siteConfig.identity.siteName;

  useHead({
    script: [
      {
        type: "application/ld+json",
        key: "schema-website",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteName,
          url: baseUrl,
          inLanguage: ["en", "id", "ko", "th"],
          potentialAction: {
            "@type": "SearchAction",
            target: `${baseUrl}/slots?q={search_term_string}`,
            "query-input": "required name=search_term_string",
          },
        }),
      },
    ],
  });
}

export function useBreadcrumbSchema(
  items: Array<{ name: string; path: string }>,
) {
  const baseUrl = getSiteUrl();

  useHead({
    script: [
      {
        type: "application/ld+json",
        key: "schema-breadcrumb",
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            item: `${baseUrl}${item.path}`,
          })),
        }),
      },
    ],
  });
}

/**
 * ItemList JSON-LD for listing pages (game-category / lobby grids).
 *
 * Accepts a getter so the schema stays reactive as the list loads via SSR /
 * client fetch — emits nothing until at least one named item is present. A
 * relative `url` is resolved against the site origin; absolute URLs pass
 * through.
 */
export function useItemListSchema(
  getItems: () => Array<{ name: string; url?: string }>,
  key = "schema-itemlist",
) {
  const baseUrl = getSiteUrl();

  // Reactive `script` field (computed ref) rather than a full-function useHead:
  // @unhead resolves a computed field at SSR serialize time, so the schema
  // reflects async-loaded list data (lobbies/games) that isn't present yet when
  // setup first runs. Emits nothing until at least one named item exists.
  const script = computed(() => {
    const items = getItems().filter((i) => i && i.name);
    if (items.length === 0) return [];
    return [
      {
        type: "application/ld+json",
        key,
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "ItemList",
          numberOfItems: items.length,
          itemListElement: items.map((item, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: item.name,
            ...(item.url
              ? {
                  url: /^https?:\/\//i.test(item.url)
                    ? item.url
                    : `${baseUrl}${item.url}`,
                }
              : {}),
          })),
        }),
      },
    ];
  });

  useHead({ script });
}

/**
 * FAQPage JSON-LD — rich-result eligible. Pass plain-text question/answer
 * pairs; entries missing either field are dropped, and nothing is emitted when
 * no valid pair remains.
 */
export function useFaqSchema(
  items: Array<{ question: string; answer: string }>,
  key = "schema-faq",
) {
  const valid = items.filter((i) => i && i.question && i.answer);
  if (valid.length === 0) return;

  useHead({
    script: [
      {
        type: "application/ld+json",
        key,
        innerHTML: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: valid.map((i) => ({
            "@type": "Question",
            name: i.question,
            acceptedAnswer: { "@type": "Answer", text: i.answer },
          })),
        }),
      },
    ],
  });
}
