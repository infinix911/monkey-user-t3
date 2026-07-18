<template>
  <!-- Render immediately with the bundled config (always available). The API
       config (userPageConfig) merges in reactively once it resolves, so we
       never block the whole app on the network — no full-screen loader. -->
  <template v-if="localConfig">
    <NuxtRouteAnnouncer />
    <!-- Brand-gold top progress bar; auto-shows on every route navigation
         (lobby->lobby, game launches). Also driven manually by the game-launch
         page via useLoadingIndicator() while it resolves the one-time URL. -->
    <NuxtLoadingIndicator color="#D4AF37" :height="3" />
    <NuxtLayout>
      <NuxtPage />
    </NuxtLayout>
    <Toaster position="top-right" :visible-toasts="5" />
    <AppDialog />
  </template>
  <div v-else-if="configError" class="fixed inset-0 flex items-center justify-center bg-black text-white z-[9999]">
    <div class="text-center p-8">
      <p class="text-xl mb-4">{{ configError }}</p>
      <button class="px-6 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 cursor-pointer" @click="reload">
        Reload
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { fetchSiteConfig } from "@/lib/siteConfig";
import { fetchCustomScripts } from "@/composables/useCustomScripts";
import { fetchSiteSettings } from "@/composables/useSiteSettings";
import { LOCALE_META, type SupportedLocale } from "@/lib/locale-meta";
import { useSiteCurrency } from "@/composables/useSiteCurrency";
import { currencyToLocale, isAppLocale } from "@/utils/locale-from-currency";
import type { SiteConfig } from "@/composables/useDefaultThemeConfig";
import { useOfflineTelegramRegisterHandler } from "./composables/useOfflineTelegramRegisterHandler";

// Fetches site config + custom scripts on both server and client. Both must
// resolve before the head renders so SEO meta and admin-managed <script>
// tags ship in the initial HTML (not added post-hydration). Run in parallel
// via Promise.all so SSR latency tracks max(siteConfig, customScripts).
//
// fetchSiteConfig itself chains the /custom-seo call and merges any matching
// row into the config object before writing to useState, so every useHead
// consumer sees the overrides.
//
// Custom scripts live on a separate endpoint so they cache + invalidate
// independently of the larger userpage payload. fetchCustomScripts catches
// network errors and returns [], so a backend hiccup degrades to "no admin
// scripts" rather than failing the whole render.
await Promise.all([
  useAsyncData("siteConfig", fetchSiteConfig, {
    getCachedData: (key, nuxtApp) => {
      const cached = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
      return cached ?? undefined;
    },
  }),
  // NOTE: the separate "themeDoc" fetch was removed — it hit the SAME
  // /site/config/theme endpoint that fetchSiteConfig already loads (the config
  // endpoint was renamed from /config/userpage to /config/theme), so it was a
  // duplicate request that deep-merged the payload over itself. The admin theme
  // overlay now arrives via fetchSiteConfig. If the theme doc ever splits back
  // onto its own endpoint, restore fetchThemeDoc (composables/useThemeDoc.ts).
  useAsyncData("customScripts", fetchCustomScripts, {
    getCachedData: (key, nuxtApp) => {
      const cached = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
      return cached ?? undefined;
    },
  }),
  // NOTE: the separate "menuSettings" fetch was removed — the profile-menu
  // config now lives in `assets.profileMenu` inside the theme doc that
  // fetchSiteConfig already loads. useMenuSettings() derives it from the
  // resolved site config, so NewProfileModal opens with no extra request.
  // Public site settings (key/value, e.g. `site:livechat`). Pre-fetched here so
  // the live-chat button — present on every page — can read the link from the
  // site store synchronously on click (window.open must run in the click).
  useAsyncData("siteSettings", fetchSiteSettings, {
    getCachedData: (key, nuxtApp) => {
      const cached = nuxtApp.payload.data[key] ?? nuxtApp.static.data[key];
      return cached ?? undefined;
    },
  }),
]);

// ---------------------------------------------------------------------------
// UI language — decided by the deployment's API currency, NOT the browser.
// Runs after fetchSiteConfig above, so useState("userPageConfig").currency is
// populated. A manual choice (the `ui_locale` cookie written by the language
// switcher) wins; otherwise the currency default applies (THB->th, IDR->id,
// KRW->ko, else->id). Awaited before render so the SSR HTML is already in the
// right language — no redirect, no hydration flash. See PLAN-PAGE-LOADS-TWICE.md.
// ---------------------------------------------------------------------------
{
  const { locale: activeLocale, setLocale } = useI18n();
  const uiLocaleCookie = useCookie<string | null>("ui_locale", {
    maxAge: 60 * 60 * 24 * 365,
    sameSite: "lax",
    path: "/",
  });
  const targetLocale = isAppLocale(uiLocaleCookie.value)
    ? uiLocaleCookie.value
    : currencyToLocale(useSiteCurrency());
  if (activeLocale.value !== targetLocale) {
    await setLocale(targetLocale);
  }
}

// Global URL parameter handlers — these composables already guard themselves
// with import.meta.client so they're safe to call unconditionally.
useLoginTokenHandler();
useOfflineTelegramRegisterHandler()
useReferralHandler();

// Session verification + WebSocket runs in plugins/session-verify.client.ts
// after hydration — no need to trigger it here.

const reload = () => {
  if (import.meta.client) window.location.reload();
};

// Reactive site config — updates when async data resolves
const _configState = useState<SiteConfig | null>("userPageConfig", () => null);
const siteConfig = computed(() => _configState.value);
const configError = useState<string | null>("siteConfigError", () => null);

// Dynamic <html lang> from i18n locale — use BCP-47 (e.g. "en-US") so it
// matches the `<meta name="language">` tag below. Mismatched formats
// ("en" vs "en-US") trip "conflicting language markup" SEO audits.
const { locale } = useI18n();
useHead(() => {
  const meta = LOCALE_META[locale.value as SupportedLocale] ?? LOCALE_META.en;
  return { htmlAttrs: { lang: meta.bcp47 } };
});

// Domain-based local config as fallback for SEO. Derived at component setup
// time on both server and client so SSR and CSR produce matching markup
// (useSiteConfig() reads hostname via useRequestURL on server).
const localConfig = useSiteConfig();

// Remove Nuxt's pre-hydration loading template once the app mounts. This used
// to live in PageLoader (now removed); without it the fixed black overlay
// (z-9999) would stay on top and leave the page blank.
onMounted(() => {
  document.getElementById("spa-loading-template")?.remove();
});

// CMS-driven inline scripts loaded from /api/site/custom-scripts. Each row
// in the admin CMS becomes one <script innerHTML="..."> tag in <head>.
// Trusted-admin model — script bodies come straight from the admin CMS.
const { tags: customTags } = useCustomScripts();

// Mobile header sizing — the mobile header is a fixed 786px-wide design that
// is scaled to the viewport. The scale depends on `window.innerWidth`, which
// the server doesn't know, so a JS-ref-driven scale would only be correct
// after hydration (visible flash/resize on load). Instead, emit a tiny
// SYNCHRONOUS inline <head> script that computes the scale before first paint
// and writes it to CSS custom properties; AppHeader.vue and default.vue then
// size off those vars, so the SSR HTML is already correct.
// See PLAN-HEADER-INITIAL-SIZE-FLASH.md.
const mobileHeaderDesignHeight = computed(() => {
  const apiCfg = siteConfig.value as
    | { theme?: { mobileHeaderHeight?: number } }
    | null;
  const brandCfg = localConfig as
    | { theme?: { mobileHeaderHeight?: number } }
    | undefined;
  return (
    Number(
      apiCfg?.theme?.mobileHeaderHeight ||
      brandCfg?.theme?.mobileHeaderHeight,
    ) || 110
  );
});
useHead(() => ({
  script: [
    {
      key: "mobile-header-scale",
      tagPosition: "head",
      tagPriority: "critical",
      innerHTML:
        `(function(){try{var d=document.documentElement,w=window.innerWidth,` +
        `H=${mobileHeaderDesignHeight.value};` +
        `d.style.setProperty('--mh-scale','1');` +
        `d.style.setProperty('--mh-header-height',(w<690?H:83)+'px');}catch(e){}})();`,
    },
  ],
}));

// Reactive head — updates when siteConfig loads
useHead(() => {
  const seo = siteConfig.value?.seo || localConfig?.seo;
  const localIdentity = localConfig?.identity;

  // Favicon — prefer the dedicated CMS asset at `identity.favicon`
  // over the SEO/meta favicon fields. Falls back to the SEO general favicon
  // and the bundled local identity favicon when the asset isn't configured.
  const faviconUrl =
    siteConfig.value?.identity?.favicon ||
    localConfig?.identity?.favicon ||
    seo?.general?.favicon ||
    localIdentity?.favicon;

  const robotsContent = [
    seo?.robot?.defaultIndex !== false ? "index" : "noindex",
    seo?.robot?.defaultFollow !== false ? "follow" : "nofollow",
    seo?.robot?.noimageindex ? "noimageindex" : "",
    seo?.robot?.nosnippet ? "nosnippet" : "",
    seo?.robot?.maxSnippet ? `max-snippet:${seo.robot.maxSnippet}` : "",
  ]
    .filter(Boolean)
    .join(", ");

  // Canonical meta tags from /api/site/config/userpage →
  // canonicalMeta.SEO_CANONICAL_META. Flat string→string object; og:* keys
  // become `property`, everything else `name`. Locale keys are overridden
  // below by i18n-derived values so the tags follow the active language.
  //
  // Resolves the block from any of the common paths used by the backend
  // (top-level, under `seo`, or under `data`) so a future schema tweak
  // doesn't silently drop the tags.
  const cfgAny = siteConfig.value as unknown as Record<string, unknown> | null;
  const canonicalBlock =
    (cfgAny?.canonicalMeta as { SEO_CANONICAL_META?: Record<string, string> } | undefined) ??
    ((cfgAny?.seo as { canonicalMeta?: { SEO_CANONICAL_META?: Record<string, string> } } | undefined)?.canonicalMeta) ??
    ((cfgAny?.data as { canonicalMeta?: { SEO_CANONICAL_META?: Record<string, string> } } | undefined)?.canonicalMeta) ??
    undefined;
  const canonicalMeta = (canonicalBlock?.SEO_CANONICAL_META ?? {}) as Record<
    string,
    string | null | undefined
  >;

  // if (import.meta.dev && cfgAny) {
  //   console.log("[canonicalMeta] resolved keys:", Object.keys(canonicalMeta));
  // }

  // Language-ish keys the CMS might emit that would fight our i18n-derived
  // tags. Strip them here so only the <html lang> + <meta name=language>
  // pair we control ends up in the rendered head.
  const OVERRIDDEN_CANONICAL_KEYS = new Set([
    "language",
    "content-language",
    "http-equiv:content-language",
    "og:locale",
    "og:locale:alternate",
  ]);

  // NOTE: do not set `key:` here. @unhead in this Nuxt setup renders SSR meta
  // tags without `data-hid` markers, and when a `key` is provided the default
  // name/property dedup is bypassed — so the reactive client rerun appends a
  // second tag instead of replacing the SSR one. Relying on the default
  // name/property dedup keeps each tag single.
  const canonicalMetaEntries = Object.entries(canonicalMeta)
    .filter(([k, v]) => !OVERRIDDEN_CANONICAL_KEYS.has(k) && v)
    .map(([k, v]) =>
      k.startsWith("og:")
        ? { property: k, content: v as string }
        : { name: k, content: v as string },
    );

  const currentLocale =
    LOCALE_META[locale.value as SupportedLocale] ?? LOCALE_META.en;
  const alternateLocales = Object.values(LOCALE_META).filter(
    (l) => l.og !== currentLocale.og,
  );

  // Strict source separation (see useSeoHead.ts):
  //   - <title> / <meta description> come from the `meta.*` block.
  //   - og:* come from `social.defaultOg*`.
  //   - twitter:* come from `social.defaultTwitter*` (falling back to OG).

  // Document <meta name="description"> — `meta.*` block only. Clamp to
  // ~155 chars so it fits inside Google's ~1000px truncation window.
  const rawDescription =
    seo?.meta?.defaultMetaDescription || localIdentity?.description || "";
  const description =
    rawDescription.length > 155
      ? rawDescription.slice(0, 152).trimEnd() + "…"
      : rawDescription;

  const ogDescription = seo?.social?.defaultOgDescription || description;
  const twitterDescription =
    seo?.social?.defaultTwitterDescription ||
    seo?.social?.defaultOgDescription ||
    description;

  return {
    title: seo?.meta?.defaultMetaTitle || localIdentity?.siteName,
    bodyAttrs: {
      class: "scrollbar-hide antialiased bg-black",
    },
    meta: [
      { name: "theme-color", content: "#000000" },
      {
        name: "description",
        content: description,
      },
      ...(seo?.meta?.defaultMetaKeywords
        ? [{ name: "keywords", content: seo.meta.defaultMetaKeywords }]
        : []),
      // `robots` falls back to siteConfig-derived string if the userpage
      // canonicalMeta block doesn't carry one.
      ...(canonicalMeta.robots
        ? []
        : [{ name: "robots", content: robotsContent }]),

      // Canonical meta block from /api/site/config/userpage (flat map).
      // Includes robots/googlebot/geo.*/author/publisher/rating/distribution/
      // google/og:type when backend supplies them. Locale keys are excluded
      // here and rendered below from i18n instead.
      ...canonicalMetaEntries,

      // <meta name="author"> from seo.general.authorName when the admin set
      // it. Emitted after canonicalMetaEntries with no `key` so name-based
      // dedup overrides any `author` carried in the canonicalMeta block.
      ...(seo?.general?.authorName
        ? [{ name: "author", content: seo.general.authorName }]
        : []),

      // i18n-derived locale tags — override any static values in the API
      // payload so <meta> tracks the active UI language. Keys intentionally
      // omitted for singletons (see canonicalMetaEntries note above);
      // og:locale:alternate keeps per-locale keys because it's array-typed.
      { name: "language", content: currentLocale.bcp47 },
      { property: "og:locale", content: currentLocale.og },
      ...alternateLocales.map((l) => ({
        property: "og:locale:alternate",
        content: l.og,
        key: `seo-og-alt-${l.og}`,
      })),

      // Open Graph — og:type falls back to "website" only if the userpage
      // canonicalMeta block doesn't supply one.
      ...(canonicalMeta["og:type"]
        ? []
        : [{ property: "og:type", content: "website" }]),
      { property: "og:site_name", content: seo?.general?.siteName },
      {
        property: "og:title",
        content: seo?.social?.defaultOgTitle,
      },
      {
        property: "og:description",
        content: ogDescription,
      },
      ...(seo?.social?.defaultOgImage
        ? [{ property: "og:image", content: seo.social.defaultOgImage }]
        : []),
      ...(seo?.general?.siteUrl
        ? [{ property: "og:url", content: seo.general.siteUrl }]
        : []),

      // Twitter Card
      {
        name: "twitter:card",
        content: seo?.social?.twitterCardType || "summary_large_image",
      },
      {
        name: "twitter:title",
        content:
          seo?.social?.defaultTwitterTitle || seo?.social?.defaultOgTitle,
      },
      {
        name: "twitter:description",
        content: twitterDescription,
      },
      ...(seo?.social?.defaultTwitterImage
        ? [{ name: "twitter:image", content: seo.social.defaultTwitterImage }]
        : []),

    ],
    link: [
      {
        rel: "icon",
        type: "image/png",
        href: faviconUrl,
        key: "favicon",
      },
      // Apple touch icon — flagged by SEO audits when missing. Falls back
      // to the favicon URL so the browser has *something* for iOS home
      // screens even if a dedicated 180×180 PNG isn't configured yet.
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href:
          (seo?.general as { appleTouchIcon?: string } | undefined)
            ?.appleTouchIcon || faviconUrl,
        key: "apple-touch-icon",
      },
      // Canonical + hreflang handled per-page by useSeoHead()
    ],
    script: [
      // CMS-driven inline scripts from /api/site/custom-scripts. Each admin
      // row becomes one <script innerHTML="..."> in <head>.
      ...customTags.value.script,
    ],
  };
});
</script>