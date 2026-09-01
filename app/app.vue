<template>
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
    <EvolutionOneToTenConsentModal />
</template>

<script setup lang="ts">
import { fetchSiteConfig } from "@/lib/siteConfig";
import { fetchCustomScripts } from "@/composables/useCustomScripts";
import { fetchSiteSettings } from "@/composables/useSiteSettings";
import { fetchBanners } from "@/composables/useBanners";
import { LOCALE_META, type SupportedLocale } from "@/lib/locale-meta";
import { useSiteCurrency } from "@/composables/useSiteCurrency";
import { currencyToLocale, isAppLocale } from "@/utils/locale-from-currency";
import { MOBILE_HEADER_DESIGN_WIDTH } from "@/utils/scale";
import { syncSiteConfig } from "@/composables/useSiteConfig";
import { useOfflineTelegramRegisterHandler } from "./composables/useOfflineTelegramRegisterHandler";

// SPA bootstrap deliberately starts after the bundled fallback layout has
// mounted. No API request is allowed to gate first paint.
const rawConfig = useState<unknown>("userPageConfig", () => null);
const bootstrapReady = useState("siteConfigBootstrapReady", () => false);
watch(rawConfig, (value) => syncSiteConfig(value), { deep: true, immediate: true });

// Global URL parameter handlers — these composables already guard themselves
// with import.meta.client so they're safe to call unconditionally.
useLoginTokenHandler();
useOfflineTelegramRegisterHandler()
useReferralHandler();

// Session verification + WebSocket runs in plugins/session-verify.client.ts
// after hydration — no need to trigger it here.

// Reactive effective config — seeded with bundled defaults and updated in
// place by the raw-config watcher above, so existing consumers never retain a
// stale fallback snapshot.
const siteConfig = useSiteConfig();

// Dynamic <html lang> from i18n locale — use BCP-47 (e.g. "en-US") so it
// matches the `<meta name="language">` tag below. Mismatched formats
// ("en" vs "en-US") trip "conflicting language markup" SEO audits.
// `useI18n()` must be invoked synchronously while this component's setup is
// active. Keep its refs/functions and use them later from the async bootstrap
// work rather than calling the composable after an `await`.
const { locale, setLocale } = useI18n();
const uiLocaleCookie = useCookie<string | null>("ui_locale", {
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax",
  path: "/",
});
useHead(() => {
  const meta = LOCALE_META[locale.value as SupportedLocale] ?? LOCALE_META.en;
  return { htmlAttrs: { lang: meta.bcp47 } };
});

// Domain-based local config as the config fallback. Derived at component setup
// time on both server and client so SSR and CSR produce matching markup
// (useSiteConfig() reads hostname via useRequestURL on server).
const localConfig = siteConfig;

async function applyPreferredLocale() {
  const targetLocale = isAppLocale(uiLocaleCookie.value)
    ? uiLocaleCookie.value
    : currencyToLocale(useSiteCurrency());
  if (locale.value !== targetLocale) await setLocale(targetLocale);
}

async function bootstrapSite() {
  // One bounded foreground request establishes the tenant theme/currency. On
  // failure the compiled config remains fully usable and the longer retry runs
  // in the background.
  try {
    await fetchSiteConfig({ maxRetries: 1, timeout: 8000 });
  } finally {
    try {
      await applyPreferredLocale();
    } catch (error) {
      console.warn("[bootstrap] unable to apply preferred locale", error);
    } finally {
      bootstrapReady.value = true;
    }
  }

  // Non-critical public data must never hold up initial navigation.
  void Promise.allSettled([
    fetchCustomScripts(),
    fetchSiteSettings(),
    fetchBanners(),
  ]);

  if (!rawConfig.value) {
    // Retry with the normal bounded backoff budget, without blocking auth or
    // the rendered fallback UI. A successful write updates every config
    // consumer through the watcher above.
    void fetchSiteConfig();
  }
}

// Let Vue paint the fallback layout first, then remove the static document
// shell on the next animation frame so the visitor never sees a blank page.
onMounted(() => {
  void nextTick(() => {
    requestAnimationFrame(() => {
      const shell = document.getElementById("spa-loading-template");
      if (!shell) return;
      shell.style.opacity = "0";
      window.setTimeout(() => shell.remove(), 180);
    });
  });
  void bootstrapSite();
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
  const apiCfg = siteConfig as
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
        `H=${mobileHeaderDesignHeight.value},W=${MOBILE_HEADER_DESIGN_WIDTH};` +
        `d.style.setProperty('--mh-scale',String(w<690?Math.min(1,w/W):1));` +
        `d.style.setProperty('--mh-header-height',(w<690?H:83)+'px');}catch(e){}})();`,
    },
  ],
}));

// Reactive head — updates when siteConfig loads. The SPA emits no crawler
// metadata (see SEO-REMOVAL-PLAN.md); everything here is user-visible chrome:
// the document title, the tab/home-screen icons, and CMS-injected scripts.
useHead(() => {
  const identity = siteConfig.identity;
  const localIdentity = localConfig?.identity;

  // Favicon — the CMS asset at `identity.favicon`, falling back to the bundled
  // local identity favicon when the asset isn't configured.
  const faviconUrl = identity?.favicon || localIdentity?.favicon;

  return {
    title:
      identity?.documentTitle ||
      localIdentity?.documentTitle ||
      identity?.siteName ||
      localIdentity?.siteName,
    bodyAttrs: {
      class: "scrollbar-hide antialiased bg-black",
    },
    meta: [{ name: "theme-color", content: "#000000" }],
    link: [
      {
        rel: "icon",
        type: "image/png",
        href: faviconUrl,
        key: "favicon",
      },
      // Apple touch icon — the iOS home-screen icon. Falls back to the
      // favicon URL so the browser has *something* even if a dedicated
      // 180×180 PNG isn't configured yet.
      {
        rel: "apple-touch-icon",
        sizes: "180x180",
        href:
          (identity as { appleTouchIcon?: string } | undefined)
            ?.appleTouchIcon || faviconUrl,
        key: "apple-touch-icon",
      },
    ],
    script: [
      // CMS-driven inline scripts from /api/site/custom-scripts. Each admin
      // row becomes one <script innerHTML="..."> in <head>.
      ...customTags.value.script,
    ],
  };
});
</script>
