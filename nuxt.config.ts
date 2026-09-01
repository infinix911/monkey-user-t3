import tailwindcss from "@tailwindcss/vite";

function configuredPreviewOrigins(): string[] {
  return (process.env.NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN || "")
    .split(",")
    .map((raw) => {
      try {
        const url = new URL(raw.trim());
        const local =
          url.hostname === "localhost" || url.hostname === "127.0.0.1";
        return url.origin === raw.trim() &&
          (url.protocol === "https:" || (local && url.protocol === "http:"))
          ? url.origin
          : null;
      } catch {
        return null;
      }
    })
    .filter((origin): origin is string => origin !== null);
}

function configuredPublicApiBase(): string {
  const value = process.env.NUXT_PUBLIC_API_BASE?.trim() || "";
  if (!value) {
    // Production requests derive their public API host from the browser's
    // domain at runtime. This value is only the local-development fallback.
    return "http://localhost:5003/api";
  }

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error("NUXT_PUBLIC_API_BASE must be an absolute HTTP(S) URL ending in /api");
  }
  const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (
    (url.protocol !== "https:" && !(local && url.protocol === "http:")) ||
    url.pathname !== "/api" ||
    url.search ||
    url.hash ||
    url.username ||
    url.password
  ) {
    throw new Error("NUXT_PUBLIC_API_BASE must be an absolute HTTP(S) URL ending in /api");
  }
  return value;
}

const publicApiBase = configuredPublicApiBase();

// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: "2025-07-15",
  devtools: { enabled: process.env.NODE_ENV !== "production" },
  ssr: false,
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
        vueI18n: "./i18n.config.ts",
        experimental: {
          /**
           * Cache the messages endpoint hard.
           *
           * The browser no longer requests it at all — `app/plugins/
           * i18n-bundled-messages.client.ts` serves messages from the bundle —
           * but the endpoint still backs SSR, and this keeps a stray hit (an
           * old cached document, a client whose plugin patch did not run) off
           * the wire. Live currently answers with `max-age=10`, which is why
           * the JSON re-downloaded every few seconds. The URL carries a content
           * hash, so a long TTL cannot serve stale copy: editing a locale file
           * changes the hash and therefore the URL.
           */
          cacheLifetime: 86400,
          httpCacheDuration: 86400,
        },
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
      include: ["axios", "@vue/devtools-core", "@vue/devtools-kit"],
    },
    // OXC handles minification (see build.minify below). Its compressor strips
    // all console.* calls and `debugger` statements in production builds —
    // same effect as the Terser pure_funcs config we used to have.
    // Lighthouse Best Practices counts every console.warn / console.error
    // against the score; the codebase has ~60 of them in catch blocks, and
    // stripping at build time keeps source readable while shipping clean
    // production output. Real errors should be reported via a telemetry
    // pipeline, not the browser console.
    build: {
      cssCodeSplit: true,
      minify: "oxc",
      rolldownOptions: {
        output: {
          minify: {
            compress: {
              dropConsole: true,
              dropDebugger: true,
            },
          },
        },
      },
      // Hidden source maps for Lighthouse + Sentry upload without exposing the
      // sourceMappingURL comment in the served JS. NOTE: must be "hidden", not
      // `true` — `true` appends the sourceMappingURL pointer we intend to omit.
      sourcemap: "hidden",
    },
  },

  hooks: {
    // Nuxt's Vite integration configures OXC for TS/JSX transforms. Remove
    // any legacy esbuild transform options after all module config hooks have
    // run so Vite does not ignore them and emit its OXC/esbuild conflict.
    "vite:extendConfig": (viteConfig) => {
      delete (viteConfig as { esbuild?: unknown }).esbuild;
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
    // Comma-separated browser-facing authorities. Unknown Host headers are
    // rejected before SSR/cache/API proxy work. Example: example.com,www.example.com.
    allowedHosts: process.env.NUXT_ALLOWED_HOSTS || "",
    public: {
      // Static SPA builds bake this browser API endpoint into the bundle.
      // app/lib/domain.ts validates it before issuing requests.
      apiBase: publicApiBase,
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
        // Noto Sans (Bold 700) renders the announcement ticker, which is above
        // the fold on every page — preload so it doesn't flash the fallback
        // family first. Regular 400 is registered too but isn't used above the
        // fold, so it loads on demand.
        {
          rel: "preload",
          href: "/fonts/NotoSans-Bold.woff2",
          as: "font",
          type: "font/woff2",
          crossorigin: "",
        },
      ],
      script: [
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

  security: {
    hidePoweredBy: true,
    // CMS custom scripts are added after hydration, so they cannot receive a
    // build-time CSP hash. Keep inline scripts enabled as documented above;
    // otherwise the generated hash list makes 'unsafe-inline' ineffective.
    ssg: {
      hashScripts: false,
    },
    headers: {
      // Replaced by CSP frame-ancestors below, which supports multiple origins.
      xFrameOptions: false,
      contentSecurityPolicy: {
        // `blob:` is required by the admin theme-preview bridge: the CMS hands
        // the iframe object URLs for images picked locally but not yet
        // uploaded. Without it the browser blocks them and the banner renders
        // empty. Object URLs are same-origin and revocable, so this does not
        // widen the surface the way a remote host would.
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "font-src": ["'self'", "https:", "data:"],
        "script-src": [
          "'self'",
          "'unsafe-inline'",
          // Raw same-origin CMS scripts remain an accepted product requirement,
          // so unsafe-inline cannot yet be removed. External scripts are still
          // limited to the integrations the application intentionally loads.
          "https://embed.tawk.to",
          "https://va.tawk.to",
          // Cloudflare Web Analytics beacon, injected at the edge.
          "https://static.cloudflareinsights.com",
          "https://cdn.livechatinc.com",
          "https://*.livechatinc.com",
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
          ...configuredPreviewOrigins(),
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
      // A normal visit makes many concurrent SSR, API, and asset requests.
      // Keep an abuse guard, but leave enough headroom for active users and
      // shared NAT/mobile IPs without sending them to the error page.
      tokensPerInterval: 5000,
      interval: 60000,
    },
    requestSizeLimiter: {
      maxRequestSizeInBytes: 10000000, // 10MB
      maxUploadFileRequestInBytes: 15000000, // 15MB
      throwError: true,
    },
  },
});
