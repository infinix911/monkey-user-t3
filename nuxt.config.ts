import tailwindcss from "@tailwindcss/vite";

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  ssr: true,
  // appManifest disabled: the per-build manifest at /_nuxt/builds/meta/<buildId>.json
  // 404s under deploy/cache skew (stale HTML referencing an old buildId), which
  // breaks client bootstrap. We don't rely on client-side payload revalidation or
  // route rules, so turning it off removes the manifest fetch entirely.
  experimental: { appManifest: false },
  // Inline component/chunk CSS into the SSR <head> as <style> instead of
  // shipping each as a separate render-blocking <link>. Removes the small
  // route-chunk stylesheet round trips (index/HotGameCard/homepageLobbyAssets/
  // GamePageLayout) from the first-paint critical path. The global Tailwind
  // entry.css is NOT covered by this (it's a global `css:[]` stylesheet, not a
  // component chunk) — it is inlined separately by
  // server/plugins/inline-critical-css.ts so first paint never waits on a CSS
  // round trip. See PLAN analyze-the-production-build.
  features: { inlineStyles: true },
  nitro: {
    preset: process.env.NITRO_PRESET || "node-server",
    prerender: {
      crawlLinks: false,
      routes: [],
    },
    // Pre-compress static assets (JS/CSS/SVG/JSON) at build time so the
    // node-server can serve brotli/gzip directly — a real win on slow 3G where
    // bandwidth, not CPU, is the constraint. Traefik can still compress
    // dynamic SSR HTML on top of this.
    compressPublicAssets: { gzip: true, brotli: true },
  },

  routeRules: {
    // Public marketing pages — SSR every request. Edge caching is intentionally
    // not enabled: the default layout renders auth-aware UI (BottomNav, login
    // state) inside the SSR HTML, so a cached response from a logged-in user
    // would leak to anonymous visitors and search bots. Keep responses fresh
    // per user. To improve TTFB, optimise the SSR fetches themselves
    // (parallelise data sources) instead of caching.

    // Dynamic game routes are always launched via one-time URLs — must be CSR.
    "/**/GAME_*": { ssr: false },

    // Hashed build assets are immutable; pin the policy explicitly so it
    // survives preset changes and any reverse proxy in front.
    "/_nuxt/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },

    // Self-hosted fonts use stable filenames — give them a long immutable TTL
    // (bump the filename on change). Without this they'd revalidate per visit.
    "/fonts/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
    },

    // IPX image optimization routes — exempt from the per-user rate limiter
    // (a single page can trigger 50+ concurrent transforms; the global
    // 150 req/5 min limit is too tight for asset requests), and cache the
    // transformed output long-term — the source URL is content-addressed.
    "/_ipx/**": {
      headers: { "cache-control": "public, max-age=31536000, immutable" },
      security: { rateLimiter: false },
    },
  },

  image: {
    // Allowlist the CDN hosts so IPX can proxy/optimize them same-origin.
    // `banana.sg-sin-1.linodeobjects.com` serves the nav icons — proxying it
    // through /_ipx makes CSS mask-image (png-mode nav icons) work, since
    // cross-origin mask images without CORS are dropped by the browser.
    domains: [
      "sg-sin-1.linodeobjects.com",
      "banana.sg-sin-1.linodeobjects.com",
    ],
    format: ["webp", "avif"],
  },

  // Inter is self-hosted by @nuxt/fonts (downloaded + subset at build time and
  // served from /_fonts, same-origin) instead of a render-blocking remote
  // Google Fonts @import. LINE Seed stays declared via @font-face in main.css.
  fonts: {
    families: [
      { name: "Inter", provider: "google", weights: [400, 500, 600, 700, 800] },
    ],
    defaults: { subsets: ["latin"] },
  },

  modules: [
    "@nuxt/eslint",
    "@nuxt/image",
    // "@vite-pwa/nuxt", // temporarily disabled
    "@vee-validate/nuxt",
    "vue-sonner/nuxt",
    [
      "@nuxtjs/i18n",
      {
        locales: [
          {
            code: "en",
            language: "en-US",
            name: "English",
            files: ["en.json"],
          },
          {
            code: "ko",
            language: "ko-KR",
            name: "한국어",
            files: ["ko.json"],
          },
        ],
        lazy: true,
        langDir: "locales",
        // Korean is the product default. The active UI language is decided at
        // runtime from the deployment's API currency — see
        // app/utils/locale-from-currency.ts + app.vue. `no_prefix` keeps the
        // locale OUT of the URL so it can follow the currency with zero
        // redirects (the old prefix_except_default + browser detection bounced
        // `/` -> `/ko`, which is the "loads twice" bug). See
        // PLAN-PAGE-LOADS-TWICE.md.
        defaultLocale: "ko",
        strategy: "no_prefix",
        // Browser-language detection is off: language follows currency, not the
        // visitor's Accept-Language. This is what removes the root redirect.
        detectBrowserLanguage: false,
        vueI18n: "./i18n/i18n.config.ts",
      },
    ],
    "@nuxt/fonts",
    "nuxt-security",
    "@pinia/nuxt",
    "@sentry/nuxt/module",
  ],

  // Sentry error monitoring. Source maps are uploaded to Sentry at build time
  // when SENTRY_AUTH_TOKEN / NUXT_PUBLIC_SENTRY_ORG / NUXT_PUBLIC_SENTRY_PROJECT
  // are set (build/CI only,
  // never shipped to the browser). The build still succeeds without them — the
  // upload step is simply skipped. autoInjectServerSentry wires the Nitro
  // node-server with the top-level instrumentation from sentry.server.config.ts.
  sentry: {
    sourceMapsUploadOptions: {
      org: process.env.NUXT_PUBLIC_SENTRY_ORG,
      project: process.env.NUXT_PUBLIC_SENTRY_PROJECT,
      authToken: process.env.SENTRY_AUTH_TOKEN,
    },
    autoInjectServerSentry: "top-level-import",
  },

  components: {
    dirs: [
      {
        path: "~/components",
        pathPrefix: false,
      },
    ],
  },

  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      include: ["axios", "@vue/devtools-core", "@vue/devtools-kit", "ioredis"],
    },
    // __BUILD_SITE__ is a literal substituted at build time. When a build is
    // pinned to one brand via NUXT_PUBLIC_SITE, useSiteConfig.ts collapses to
    // a single `if (__BUILD_SITE__ === "lucky")` branch — Vite's tree-shaker
    // then drops the other ten brand-config modules entirely. When unset
    // (multi-brand dev/preview), all branches stay reachable.
    define: {
      __BUILD_SITE__: JSON.stringify(process.env.NUXT_PUBLIC_SITE || ""),
    },
    // esbuild handles minification (see build.minify below). `drop` strips
    // all console.* calls and `debugger` statements in production builds —
    // same effect as the Terser pure_funcs config we used to have.
    // Lighthouse Best Practices counts every console.warn / console.error
    // against the score; the codebase has ~60 of them in catch blocks, and
    // stripping at build time keeps source readable while shipping clean
    // production output. Real errors should be reported via a telemetry
    // pipeline, not the browser console.
    esbuild: {
      drop: ["console", "debugger"],
    },
    build: {
      cssCodeSplit: true,
      minify: "esbuild",
      // Hidden source maps for Lighthouse + Sentry upload without exposing the
      // sourceMappingURL comment in the served JS. NOTE: must be "hidden", not
      // `true` — `true` appends the sourceMappingURL pointer we intend to omit.
      sourcemap: "hidden",
    },
  },

  css: [
    "@/assets/css/main.css",
    // Alert/confirm dialogs are rendered by the in-house <AppDialog> (mounted
    // once in app.vue), styled with Tailwind + scoped CSS — no external dialog
    // stylesheet to load.
  ],

  pinia: {
    storesDirs: ["stores/**"],
  },

  runtimeConfig: {
    // Server-only. Never shipped to the browser. The Nitro proxy routes
    // (server/routes/api/[...path].ts) and the WS proxy plugin
    // (server/plugins/ws-proxy.ts) are the only consumers.
    apiUrl: process.env.NUXT_API_URL,
    wsApiUrl: process.env.NUXT_WS_API_URL,
    public: {
      site: process.env.NUXT_PUBLIC_SITE || "",
      siteUrl: process.env.NUXT_PUBLIC_SITE_URL,
      // Sentry DSN is intentionally public — it is meant to ship to the browser.
      // Sentry stays disabled (init no-ops) when this is empty.
      sentry: {
        dsn: process.env.NUXT_PUBLIC_SENTRY_DSN || "",
      },
      // Comma-separated list of origins permitted to send postMessage theme-draft
      // updates when this site is embedded in the admin panel's preview iframe.
      // Example: "https://admin.example.com" or multiple: "https://a.com,https://b.com".
      // location.origin is always implicitly allowed (same-origin dev).
      adminPreviewOrigin: process.env.NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN || "",
    },
  },

  app: {
    // Subtle global route motion: pure opacity cross-fade. Default mode (new
    // page enters WHILE the old one leaves) instead of `out-in`: out-in faded
    // the old page to opacity:0 — revealing the pure-black body — BEFORE the
    // new page entered, which flashed black on every client navigation. A
    // simultaneous cross-fade has no gap where only the black body shows. The
    // transition is opacity-only (no transform), so overlapping the two pages
    // does not reintroduce the position:fixed containing-block bug that
    // out-in originally guarded against (see main.css .page-enter/leave-*).
    pageTransition: { name: "page" },
    layoutTransition: { name: "page" },
    head: {
      htmlAttrs: {
        lang: "en",
      },
      title: ``,
      meta: [
        { charset: "utf-8" },
        {
          name: "description",
          content: ``,
        },
        {
          name: "viewport",
          // maximum-scale=1 + user-scalable=no disables browser zoom, which also
          // stops iOS Safari's auto-zoom when focusing a <16px form input (the
          // "annoying zoom" while typing). Tradeoff: pinch-to-zoom is off
          // site-wide.
          content:
            "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
        },
      ],
      link: [
        // Image/media CDN — banner overlay here is the LCP element, so
        // warm DNS + TLS before the dynamic banner URL resolves.
        { rel: "preconnect", href: "https://sg-sin-1.linodeobjects.com", crossorigin: "" },
        { rel: "dns-prefetch", href: "https://sg-sin-1.linodeobjects.com" },
        // Game provider CDN — every game thumbnail (game_img) loads directly
        // from here (served as plain <img>, not via IPX), so warm DNS + TLS.
        { rel: "preconnect", href: "https://slots.ps9launcher.com", crossorigin: "" },
        { rel: "dns-prefetch", href: "https://slots.ps9launcher.com" },
        {
          rel: "preload",
          href: "/fonts/LINESeedSans_W_Rg.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "",
        },
        {
          rel: "preload",
          href: "/fonts/LINESeedSans_W_Bd.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "",
        },
        // Mark (Medium 500 / Bold 700) renders the auth header user-info pill
        // (username + balance). Preload so it paints in Mark immediately instead
        // of flashing the system fallback then swapping (font-display: swap),
        // which made the pill look inconsistent on uncached loads.
        {
          rel: "preload",
          href: "/fonts/Mark-Medium.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "",
        },
        {
          rel: "preload",
          href: "/fonts/Mark-Bold.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "",
        },
      ],
      script: [
        {
          innerHTML: `window.__NUXT_SITE='${process.env.NUXT_PUBLIC_SITE || "lucky"}';`,
          type: "text/javascript",
        },
        {
          innerHTML: `
            window.__pwaListeners = new Set();
            window.addEventListener('beforeinstallprompt', function(e) {
              e.preventDefault();
              window.__pwaInstallPrompt = e;
              window.__pwaListeners.forEach(function(l) { l(); });
            });
            window.addEventListener('appinstalled', function() {
              window.__pwaInstalled = true;
              window.__pwaInstallPrompt = null;
              window.__pwaListeners.forEach(function(l) { l(); });
            });
            if (window.matchMedia('(display-mode: standalone)').matches) {
              window.__pwaInstalled = true;
            }
          `,
          type: "text/javascript",
        },
      ],
    },
  },

  // pwa: { // temporarily disabled
  /*
  pwa: {
    registerType: "autoUpdate",
    injectRegister: "auto",

    manifest: (() => {
      const site = process.env.NUXT_PUBLIC_SITE || "lucky";
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const configs: Record<string, () => any> = {
        lucky: getSiteConfigLucky,
        ocean: getSiteConfigOcean,
        tiger: getSiteConfigTiger,
        dragon: getSiteConfigDragon,
        rabbit: getSiteConfigRabbit,
        green: getSiteConfigGreen,
        space: getSiteConfigSpace,
        egypt: getSiteConfigEgypt,
        ant: getSiteConfigAnt,
        frankenstein: getSiteConfigFrankenstein,
        bird: getSiteConfigBird,
      };
      const config = (configs[site] ?? configs["lucky"]!)();
      const name = config.branding.siteName;
      const icons = config.assets.icons.pwa;
      const screenshots = config.assets.icons.pwaScreenshots ?? [];
      return {
        name,
        short_name: name,
        description: `Experience the best online gaming experience with ${name}`,
        theme_color: "#0f172a",
        background_color: "#0f172a",
        id: "/",
        display: "standalone" as const,
        start_url: "/",
        scope: "/",
        lang: "en",
        orientation: "portrait",
        prefer_related_applications: false,
        icons: Object.entries(icons).map(([sizes, src]) => ({
          src: src as string,
          sizes,
          type: "image/png" as const,
        })),
        ...(screenshots.length > 0 && { screenshots }),
      };
    })(),
    */

  //  workbox: {
      // Under SSR, each navigation fetches fresh HTML from the Worker —
      // no SPA fallback needed. Only precache static assets.
    //  navigateFallback: null,
     // globPatterns: ["**/*.{js,css,png,svg,ico,woff2,webmanifest}"],
     // maximumFileSizeToCacheInBytes: 4 * 1024 * 1024, // 4 MB
   /* },

    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: process.env.NODE_ENV !== "production",
    },
  },
  */ // end pwa disabled

  security: {
    hidePoweredBy: true,
    headers: {
      // Replaced by CSP frame-ancestors below, which supports multiple origins.
      xFrameOptions: false,
      contentSecurityPolicy: {
        "img-src": ["'self'", "data:", "https:"],
        "font-src": ["'self'", "https:", "data:"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          // Game-provider launch iframes inject arbitrary third-party pixels/
          // SDKs (e.g. Kwai/kwaiq on *.ap4r.com / *.ks-la.net, plus fbevents/
          // GA/TikTok). Allow any HTTPS script — mirrors img-src / font-src /
          // connect-src, which already permit `https:`.
          "https:",
          // The hosts below are now subsumed by `https:`; kept as intent
          // documentation.
          "https://embed.tawk.to",
          "https://va.tawk.to",
          // Cloudflare Web Analytics beacon, injected at the edge.
          "https://static.cloudflareinsights.com",
          "https://cdn.livechatinc.com",
          "https://*.livechatinc.com",        // tracking.js loads secure-lc.*, etc.
        ],
        // @nuxt/image renders a raw inline `onerror="this.setAttribute(...)"`
        // on every SSR <img> (NuxtImg.vue). 'unsafe-hashes' + the handler's
        // sha256 whitelists exactly that one handler while keeping every other
        // inline event handler blocked.
        "script-src-attr": [
          "'unsafe-hashes'",
          "'sha256-bwK6T5wZVTANitXbrTsel7kl/PyCjCd/Dq5Qoz3imjM='",
        ],
        // blob: is required by Sentry Session Replay, which runs its
        // compression in a web worker spawned from a blob URL.
        "worker-src": ["'self'", "blob:"],
        "connect-src": [
          "'self'",
          "https:",
          "wss:",
          ...(process.env.NODE_ENV !== "production"
            ? ["http://localhost:*"]
            : []),
        ],
        // Allow the admin panel to embed this site in the theme-preview iframe.
        // NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN must be the admin origin, e.g.
        // "https://admin.example.com". Unset = only same-origin framing allowed.
        // NOTE: this list is baked at BUILD time. In the Docker image the env
        // var is unset at build, so the runtime admin origin is injected into
        // the response header at runtime by
        // server/plugins/csp-admin-frame-ancestors.ts (same value, de-duped) —
        // do not re-add a build arg for this.
        "frame-ancestors": [
          "'self'",
          "http://localhost:*",
          ...(process.env.NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN
            ? process.env.NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN.split(",").map((s) => s.trim()).filter(Boolean)
            : []),
        ],
      },
      strictTransportSecurity: {
        maxAge: 31536000,
        includeSubdomains: true,
        preload: true,
      },
      // Lighthouse Best Practices checks for these. `same-origin-allow-popups`
      // (not `same-origin`) lets us still open game-launch windows / OAuth
      // popups without breaking — `same-origin` would sever the popup from
      // window.opener. CORP `cross-origin` is needed because banner/asset
      // images are served from sg-sin-1.linodeobjects.com.
      crossOriginOpenerPolicy: "same-origin-allow-popups",
      crossOriginResourcePolicy: "cross-origin",
      // Lock down powerful APIs we don't use. Each empty array means "deny
      // for this origin and all iframes."
      permissionsPolicy: {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        magnetometer: [],
        gyroscope: [],
        accelerometer: [],
      },
    },
    rateLimiter: {
      tokensPerInterval: 150,
      interval: 300000,
    },
    requestSizeLimiter: {
      maxRequestSizeInBytes: 10000000, // 10MB
      maxUploadFileRequestInBytes: 15000000, // 15MB
      throwError: true,
    },
  },
});
