# KNOWLEDGEBASE.md — banana-jaeisol-t3-nuxt

> **Permanent repository encyclopedia.** Consult this BEFORE reading source code.
> Facts verified against commit `fb66962` (2026-07-06). Line numbers drift — trust file paths and search strings.
> Responsibilities: this file = WHAT/WHERE/HOW. `DECISIONS.md` = WHY. `CLAUDE.md` = AI workflow. `MEMORY.md` = temporary notes.

> ⚠️ **STALE SINCE TOGEL/QRIS REMOVAL (ADR-017).** The **Togel domain and QRIS
> payment method were fully removed**, so every togel/qris reference below
> (§1 size counts, §2 tree, §7 component library, §8 stores `togelPool`/
> `betHistory`, §10–§14 togel recipes, §19 high-risk togel math, the File
> Reading Map togel rows) is **obsolete** — those files no longer exist. Also
> changed: **2 locales `en`/`ko`, default `ko`** (was 4/`id`); **default
> currency KRW**; `theme.togel.*` → `theme.panel.*`; `DataTable` → root
> `app/components/DataTable.vue`; ledger types → `app/interfaces/ledger.ts`;
> `useFeatures()` returns only `{ payments }`. See ADR-017. Ignore togel/qris
> facts here until this doc is fully re-verified.

---

## 1. Repository Overview

- **Purpose:** User-facing gaming platform frontend (casino/slot/sport/togel; IDR market primary). This is the **"Jae/T3" fork** of banana-lucky-nuxt: single bundled design template ("Template3") + per-domain CMS theming. Deploys to `idr-demo1.jaeisol.com`-style tenant domains.
- **Stack:** Nuxt **4.4.2** SSR (node-server preset), Vue 3.5, TypeScript, Tailwind **v4**, Pinia 3, @nuxtjs/i18n 10 (en/id/ko/th, `no_prefix`), vee-validate + zod, vue-sonner (toasts), in-house AppDialog (SweetAlert2 removed), @nuxt/image (IPX), nuxt-security, Sentry (env-gated), ioredis (SSR caches).
- **Backend:** `../monkey-user-api` (Bun+Elysia, HTTP + WS :4000) — the browser never talks to it directly (§4).
- **Build/run:** Docker — Bun builds (`bun install --frozen-lockfile`, `bun run build`), **Node 22 runs** `.output/server/index.mjs` as non-root, port 3000, behind Traefik (router files written dynamically by the APIs).
- **Size:** 831 tracked files; `app/components` 201 files (~45k lines, half of it togel), 41 composables, 26 pages, 6 Pinia stores, 4 togel money-math services (the only unit-tested code).
- **Testing:** Playwright e2e (13 specs, ~52 tests, API-mocked, serial, NO webServer — start the app yourself), Vitest 2-project (unit = togel services 98 tests; component = 27 payload-characterization tests). Coverage measured only for `app/services/togel/**`.
- **No CI, no git hooks.** The verification gate is manual convention: `npm run test:component && npm run test:unit && npm run typecheck && npm run build`.

### ⚠️ Legacy drift you must not trust

- **The 11-brand `__BUILD_SITE__` tree-shake system is DEAD here.** `vite.define` still sets `__BUILD_SITE__` (nuxt.config.ts) but no app code reads it; the per-brand `getSiteConfig<Brand>` modules exist only inside the commented-out PWA block. Brand = runtime CMS payload per hostname.
- `assets.navigation` "bundled-only exception" no longer exists — renamed `assets.navIcons`, merged normally.
- CMS theme endpoint is **`/site/config/theme`** (renamed from `/site/config/userpage`; useState key is still `"userPageConfig"`). `server/utils/site-currency.ts` still calls `/site/config/userpage`.
- Root `index.js`, `homepage.html`, `public/_headers` are dead Cloudflare-Workers-era artifacts. Several "Worker isolate" comments are stale — runtime is node-server.

---

## 2. Simplified Repository Tree

```
banana-jaeisol-t3-nuxt/
├── nuxt.config.ts            # ★★ 503 lines; comments are ADR-grade. routeRules (GAME_* CSR-only, immutable
│                             #   /_nuxt|/fonts|/_ipx), CSP (script-src https: — deliberate), i18n inline config,
│                             #   vite.define __BUILD_SITE__ (dead), esbuild.drop console, sourcemap hidden
├── Dockerfile                # ★ bun deps → bun build → node:22-alpine runtime; ARG NUXT_PUBLIC_SITE baked
├── app/
│   ├── app.vue               # ★★ SSR boot: awaits siteConfig+customScripts+siteSettings, locale=f(currency),
│   │                         #   URL param handlers (telegram login/register, referral), SEO head, AppDialog mount
│   ├── pages/                # 26 pages: index, hot, casino, slots, sports, fishing, virtual, mini, slot-rtp,
│   │   │                     #   lobbies/[lobby]/games, [game_type]/[game_id] (CSR game launch), promotions,
│   │   │                     #   partner*, activity, togel/{index,[id],history,invoice,aturan,hadiah,normor,meanang}
│   │   └── togel/winners/    # ⚠ winner-card.vue/winner-modal.vue are COMPONENTS misplaced as routes
│   ├── layouts/              # default.vue (698L shell), game.vue; Togel{Desktop,Mobile}Layout.vue = DEAD
│   ├── components/           # 201 files — see §7. ui/ (3 primitives), layout/, navigation/, auth/, transaction/,
│   │                         #   game/, togel/ (86 files incl. game engine + generators), profile/, my-account/, …
│   ├── composables/          # 41 — useApi ★, useSiteConfig family ★, useDefaultThemeConfig (1477L Template3
│   │                         #   defaults + SiteConfig interface tree), useFeatures, useNavSkin, useDialogQueue, …
│   ├── stores/               # 6 Pinia setup-stores: auth, websocket, togelPool, betHistory, site, ui
│   │                         #   (+ gameControlSortOrder.ts = plain module, NOT a store)
│   ├── services/togel/       # ★ pure money math: betCalculation/betValidation/betSubmission/numberGenerator
│   │                         #   + colocated .spec.ts — the ONLY unit-tested app code
│   ├── schemas/              # zod: form factories (t)=>toTypedSchema(...) + togel API response guards
│   ├── lib/                  # axios-client (client mutations), siteConfig.ts (fetcher ★), serverCache.ts,
│   │                         #   domain.ts (getApiBase/getWsApiUrl)
│   ├── utils/                # 17 auto-imported (currency, permutations, bet shims, cdn(), sortPools, …)
│   ├── middleware/auth.global.ts  # client guard (GAME_ routes; PROTECTED_PATHS currently empty)
│   ├── plugins/              # 5: hydrate-app-store, pwa-manifest, session-hydrate(dev), session-verify ★,
│   │                         #   theme-preview (postMessage bridge w/ admin CMS)
│   └── interfaces/ types/    # domain types; barrel interfaces/index.ts = single source of truth
├── server/
│   ├── routes/api/[...path].ts   # ★★ THE proxy: proxyRequest → API_HOST_URL, cookieDomainRewrite "*"→"",
│   │                             #   x-forwarded-host/proto, streams. /api/* namespace fully claimed
│   ├── routes/{robots.txt,sitemap.xml}.ts  # dynamic; sitemap ALL_PAGES list is HAND-MAINTAINED
│   ├── middleware/           # alphabetical order MATTERS: anon-page-cache (serve) → auth-spa (bn.session ⇒
│   │                         #   noSSR/SPA mode) → guard (GAME_ cookie gate + togel 404 on non-IDR) → locale-redirect
│   ├── plugins/              # anon-page-cache (store), cache-bypass-authenticated (no-store for authed +
│   │                         #   optional CDN-Cache-Control), csp-admin-frame-ancestors, inline-critical-css,
│   │                         #   ws-proxy (httpxy /ws → WEBSOCKET_HOST_URL)
│   └── utils/                # anonPageCache ★, features.ts, site-currency.ts (⚠ bug — see §16)
├── i18n/locales/{en,id,ko,th}.json  # flat 54–91KB files; ko/th drift (missing footer, stray Faq)
├── tests/                    # e2e/ (13 Playwright specs + fixtures/api-mocks.ts ★), component/ (payload pins),
│                             #   hydration-check.mjs, duplicate-meta-check.mjs
└── index.js / homepage.html / public/_headers  # DEAD Cloudflare-era artifacts
```

---

## 3. Architecture — request lifecycle

```
Browser ──HTTP──▶ Nitro (:3000)
  ├─ /api/*  → server/routes/api/[...path].ts → proxyRequest(API_HOST_URL)   [cookie domain rewrite]
  ├─ /ws     → server/plugins/ws-proxy.ts (httpxy upgrade) → WEBSOCKET_HOST_URL
  └─ HTML GET:
       anon-page-cache middleware ──HIT──▶ cached HTML (x-anon-cache: HIT), renderer never runs
       │ MISS
       auth-spa middleware: bn.session cookie? ──yes──▶ event.context.nuxt.noSSR = true (SPA shell)
       │ no (anonymous)                                  └─ client renders everything post-hydration
       guard.ts: /togel* + non-IDR currency → 404; GAME_ route w/o bn.session → 302 /
       locale-redirect: 301 /id|/ko|/th/* → unprefixed
       ▼
       SSR render (app.vue awaits siteConfig/customScripts/siteSettings)
       render:response → anon-page-cache stores 200 HTML; cache-bypass stamps headers;
       inline-critical-css inlines /_nuxt/*.css; csp plugin injects frame-ancestors
```

**Two render modes** (ADR-003): anonymous = full SSR (SEO); authenticated = SPA shell + client fetch. Never rely on SSR-only behavior for logged-in flows.

**SSR boot (app.vue):** `Promise.all` of `useAsyncData("siteConfig")` (→ `fetchSiteConfig()` in `app/lib/siteConfig.ts`: `/site/config/theme` + `/site/custom-seo` in parallel, enforceHttps, hostname-filtered SEO rows, writes `useState('userPageConfig')`; failure ⇒ bundled fallback + **503** so edge caches never store degraded HTML), `"customScripts"` (raw admin `<script>` injection — trusted-admin model), `"siteSettings"` (→ Pinia site store). Then locale = `ui_locale` cookie || `currencyToLocale(currency)` (THB→th, IDR→id, KRW→ko). Then URL param handlers (Telegram login/register, referral).

---

## 4. Data access

**Rule: browser never contacts the backend host. Two sanctioned clients:**

| Client        | File                        | Use for                                        | Behavior                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | --------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useApi()`    | `app/composables/useApi.ts` | page data via `useAsyncData`, SSR + client     | server: `API_HOST_URL` direct + forwards `cookie` header; client: `/api` + `credentials:include`. **retry: 0** (money safety), timeout 10s, CSRF double-submit (`XSRF-TOKEN` → `X-XSRF-TOKEN` on mutations), client 401 → one-shot logout latch (`sessionStorage.session_logged_out`, excludes `/auth/sign-in/username`). `.validated<T>(zodSchema, req)` throws `ApiValidationError`. |
| `axiosClient` | `app/lib/axios-client.ts`   | client-side mutations / imperative store calls | singleton; GET dedupe; idempotent-only retry; same CSRF + 401 latch (parity comments mandate keeping both in sync).                                                                                                                                                                                                                                                                            |

- Public **user-independent** SSR fetches bypass useApi: raw `$fetch` inside `withServerCache(key, ttlMs, fetcher)` (`app/lib/serverCache.ts`) — Redis `nuxt:ssr:*` when `REDIS_HOST` set, else in-process Map; client = pass-through. **Never put a cookie-forwarding fetcher inside it** (session leak). Keys must be namespaced per host (`site-settings:<hostname>`). Current users: siteSettings, customScripts, popup banners (all 60s).
- Zod validation at two boundaries only: forms (locale-reactive factories `(t)=>toTypedSchema(...)` in `app/schemas/`) and togel API payloads (`api.validated(poolStatusListSchema, …)`, `satisfies z.ZodType<Interface>`).
- Anon full-page cache: `server/utils/anonPageCache.ts` — gated `NUXT_ENABLE_ANON_PAGE_CACHE=true`; GET+HTML+no `bn.session`+not in excluded prefixes (`/api /_nuxt /_ipx /togel` GAME_ etc.); key `nuxt:anonpage:<host><path><allowlisted-query>` (default allowlist: `page`); TTL `NUXT_ANON_PAGE_CACHE_TTL_MS` (60s). Edge cache (`NUXT_ENABLE_EDGE_CACHE=true`) adds `CDN-Cache-Control` for anon responses; authed always `private, no-store`.

---

## 5. Authentication

- Session = backend `bn.session` cookie (attached to frontend origin by the proxy's `cookieDomainRewrite`).
- **Server guard** (`server/middleware/guard.ts`): cookie-PRESENCE check only; protects only `GAME_ROUTE_PATTERN = /^\/[a-z][a-z0-9-]*\/GAME_.+$/`; `PROTECTED_PREFIXES = []` (empty). Plus togel 404 gate on non-IDR currency.
- **Client guard** (`app/middleware/auth.global.ts`): post-hydration, same pattern + empty `PROTECTED_PATHS`; verifies via `authStore.verifyUser()` (`GET /auth/get-session`). UI-only — API endpoints enforce auth server-side.
- **Auth store** (`app/stores/auth.ts`): user/wallet/level/bank state; `verifyUser()`, `logout()` (clears storage keys + site store). Wallet updated live by WS `wallet` events.
- **Session lifecycle plugin** (`app/plugins/session-verify.client.ts`): onNuxtReady verify → WS connect + fetchNotice; WS disconnect on tab-hide/`pagehide` (bfcache), reconnect on `pageshow persisted`.
- Telegram entry: `useLoginTokenHandler` (`?chatId&token`) and `useOfflineTelegramRegisterHandler` (`?offline=true…`) in app.vue.
- Pages with per-user data but NOT guarded (degrade to anon + `noindex`): `/activity`, `/togel/invoice`, `/togel/history`, `/partner-*`.

---

## 6. Site config / theming (the CMS contract)

Resolution chain (verified, replaces the stale CLAUDE.md story):

1. **Bundled base:** `getDefaultThemeConfig()` in `app/composables/useDefaultThemeConfig.ts` (1477L) — the full typed `SiteConfig` tree: `identity, theme, assets, contact, integrations, seo` (6 CMS tabs, ~45 sub-interfaces).
2. **CMS override:** `/site/config/theme` payload (hostname-scoped) in `useState('userPageConfig')`.
3. **Merge:** `useSiteConfig()` = `deepMerge(base, override)` — exact-path override wins; `null`/`undefined` falls back to bundled (CMS cannot blank a field); wrong path = silently ignored. **NOT reactive** — returns a snapshot per call.
4. Extra cache layers in `app/lib/siteConfig.ts`: server module-memo per hostname 5s TTL; client localStorage warm-start `themeConfig.v1`. Preview mode `?themePreview=1` bypasses all caches + live-updates via `theme-preview.client.ts` postMessage bridge (origin-allowlisted to `NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN`).

- Full field map: the typed `SiteConfig` interface in `app/composables/useDefaultThemeConfig.ts` is the authoritative contract (the standalone CMS field-map docs were removed). Transaction-modal tokens: `ThemeTransactionModalConfig` at `theme.transactionmodal.*`.
- Layout variants are config-driven: `theme.nav.type` (`png`|`gif`) → `useNavSkin()` registry picks NavGlyph mode + transaction panel component.
- Feature flags derive from currency: `useFeatures()` → `{payments: currency!=='THB'}`; server twin `server/utils/features.ts` (keep in sync).
- **Add a brand-config field:** typed field + default in `useDefaultThemeConfig.ts` → consume via `useSiteConfig().<group>.<field>`. Nothing else to wire (the interface JSDoc is the field documentation).
- **New tenant/brand:** deploy a container per domain, point `API_HOST_URL` at its backend, author everything in the admin CMS, upload assets to the Linode CDN (`cdn()` in `app/utils/assetUrl.ts` maps `/designs/**`).

---

## 7. Component library (201 files)

- **ui/ primitives — only 3:** `AppDialog.vue` (singleton dialog renderer mounted once in app.vue; the SweetAlert2 replacement — fire via `fireDialog()`/`showSwalAlert()` wrappers, never mount a second one), `UiFormField.vue` (vee `<Field rules>` style, light theme, 1 consumer), `UiTimePicker.vue`. There is NO Button/Input/Card layer — components hand-style with Tailwind + inline `:style` from siteConfig tokens.
- **Shell:** `layout/AppHeader.vue` (510L, dual desktop/mobile DOM), `navigation/Navbar.vue` (317L, hosts Deposit/Withdrawal modals), `layout/BottomNav.vue` (mobile, container-query sized), `layout/AppFooter.vue`, `layout/GamePageLayout.vue` (wraps every game-grid page). Header height via pre-paint CSS vars (`--mh-header-height`) set by an inline head script.
- **Auth:** `auth/LoginModal.vue` (canonical form pattern), `SignupModal.vue` + `useSignupForm.ts`, `auth/FormField.vue` = the de-facto dark input primitive.
- **Transactions:** `DepositModal.vue` shell + `useDepositModal.ts` + `BankPaymentContent`/`useBankPayment.ts` (money-in logic); `WithdrawalContent.vue` (money-out). Shared chrome: `.tm-modal`/`.modal-gradient-border` classes + `theme.transactionmodal` CSS vars.
- **Game catalog:** `HotGameCard.vue` (standard tile), `LobbyCard.vue` (provider tile + launch quirks), `SubGames.vue` (grid; ⚠ contains an inline copy of PaginationBar).
- **Partner section:** `partner/PartnerNav.vue` (desktop tab bar + mobile sidebar drawer), `PartnerPageHeader`, `PartnerTable`, `PartnerPlaceholder`, list components; themed via `usePartnerTheme()` (single token mapping).
- **Shared top-level:** `PaginationBar` (windowed), `TrimmedImage` (canvas alpha-crop w/ bbox cache), `UserBalancePill` (class-prop styling API), `NoticeSection` (post-login mandatory notice, Tiptap-rendered).
- **Conventions:** `<script setup lang="ts">`, typed `defineProps`/tuple `defineEmits`, `withDefaults`; co-located `useXxx.ts` composable when logic >~150 lines (useDepositModal, useProfileMenu precedent); heavy modals = `defineAsyncComponent` + uiStore flag + mounted-latch for close animations; dual mobile/desktop DOM trees (`hidden lg:block`/`lg:hidden`); flat component namespace (`pathPrefix:false`).
- **Toasts** = `useToast()` (vue-sonner). **Dialogs** = `showSwalAlert/showErrorAlert/...` from `utils/swal-alert.ts` → in-house queue. Do not import sweetalert2 (not installed).

---

## 8. State management

| Mechanism                                   | Use                                                                                                                           | Instances                                                                                                                                                                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useState`                                  | request-scoped, SSR-serialized global config (`userPageConfig`, `siteConfigError`, `isMobileSSR`)                             | app.vue / composables                                                                                                                                                                                                                                                                               |
| Pinia (setup stores, no persistence plugin) | interactive session state                                                                                                     | `auth` (user/wallet/level, verifyUser/logout), `websocket` (connect via `/auth/ws` token → `wss://<host>/ws?token=`; events: `notification`→toast, `wallet`→authStore; backoff ×3; 30s `/auth/get-session` poll), `site` (settings/banks; populated during SSR), `ui` (modal flags, device, notice) |
| sessionStorage/localStorage                 | `currentGame` mirror (popup bridge), `session_logged_out` latch, `noticeAgreed`, `themeConfig.v1` warm-start, recently-played | manual mirror + rehydrate in `.client.ts` plugins                                                                                                                                                                                                                                                   |

Money logic never lives in stores — mutations go through `useApi`/`axios-client` with `retry: 0`.

---

## 9. i18n

2 locales en/ko (id/th removed with ADR-017); default `ko`; `strategy: no_prefix`, `detectBrowserLanguage: false` — language = deployment currency (KRW→ko; default/missing→ko), overridable via `ui_locale` cookie (English opt-in via header dropdown). Flat files `i18n/locales/{en,ko}.json`. Adding strings = edit BOTH files. `fallbackLocale` stays `en`. Default currency = **KRW** (`FALLBACK` in `site-currency.ts`/`useSiteCurrency.ts`). Zod messages: locale-reactive schema factories re-created on locale change.

---

## 10. Common Implementation Recipes

**Add a public page:** `app/pages/<name>.vue` → `useApi()` + `useAsyncData("<unique-key>", …)` (dynamic key fn if params vary) → `useSeoHead({title, description})` → add to `ALL_PAGES` in `server/routes/sitemap.xml.ts` if indexable (hand-maintained!) or `noindex` → strings in all 4 locale JSONs.

**Add a protected page:** add path to `PROTECTED_PREFIXES` (`server/middleware/guard.ts`) AND `PROTECTED_PATHS` (`app/middleware/auth.global.ts`); `noindex`; remember authed requests render as SPA.

**Add a form:** schema factory in `app/schemas/*.schema.ts` → `useForm({validationSchema: computed(() => { void locale.value; return schema(t); })})` → fields via `auth/FormField.vue` → `handleSubmit` → `useApi()` POST → success `useToast()`, failure map `err.data.message` through i18n → `showErrorAlert`. Big form → extract `useMyForm.ts`.

**Add a modal:** confirmation → `showSwalAlert()` (don't build one). Feature modal → Teleport + `Transition name="modal"` + uiStore flag + `defineAsyncComponent` at trigger site; reuse `.tm-modal` chrome for transaction-style.

**Add a server route:** `server/routes/<name>.ts` — NOT under `/api/*` (proxy claims it). Use `getSiteCurrency(event)`/`getFeatures(event)`, never composables. Header work → Nitro plugin with `headersSent` guard.

**Add a togel bet type:** validator guard in api-side + here: component under `togel/game/`, register in `GameRouter.vue` (⚠ also update Game4d's negative exclusion list), limits via `usePoolStore().getBetLimits`, submit via `useBetSubmission`. Money math changes go in `app/services/togel/` WITH spec updates.

---

## 11. File Reading Map

| Task                              | Read ONLY                                                                                                                                  | Do NOT read                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| API fetching / SSR data           | `composables/useApi.ts`, `lib/domain.ts`, target page                                                                                      | components, stores           |
| Proxy / cookies / CORS-ish issues | `server/routes/api/[...path].ts`, `server/plugins/ws-proxy.ts`, `useApi.ts`                                                                | pages                        |
| Auth / login flow                 | `stores/auth.ts`, `auth/LoginModal.vue`, `plugins/session-verify.client.ts`, `server/middleware/guard.ts`, `app/middleware/auth.global.ts` | transactions                 |
| Theming / brand config            | `composables/useSiteConfig.ts`, `useDefaultThemeConfig.ts`, `lib/siteConfig.ts`                                                            | components until field known |
| Deposit/withdraw UI               | `transaction/DepositModal.vue`, `useDepositModal.ts`, `useBankPayment.ts`, `WithdrawalContent.vue`, `schemas/transaction.schema.ts`        | —                            |
| Caching (SSR/page)                | `lib/serverCache.ts`, `server/utils/anonPageCache.ts`, both `anon-page-cache.*`, `cache-bypass-authenticated.ts`                           | app code                     |
| WebSocket / live wallet           | `stores/websocket.ts`, `plugins/session-verify.client.ts`, `server/plugins/ws-proxy.ts`                                                    | rest                         |
| SEO / sitemap                     | `composables/useSeoHead.ts`, `useCustomSeoMatch.ts`, `server/routes/sitemap.xml.ts`, app.vue head block                                    | components                   |
| i18n                              | `i18n/locales/*.json`, nuxt.config i18n block, app.vue locale resolution                                                                   | —                            |
| Build/deploy                      | `Dockerfile`, `nuxt.config.ts`, `.env.example`                                                                                             | src                          |
| E2E / tests                       | `playwright.config.ts`, `tests/e2e/fixtures/api-mocks.ts`, `vitest.config.ts`                                                              | —                            |

## 12. AI Edit Map (features → edit / avoid)

- **New page:** edit `app/pages/`, sitemap, locales. Avoid server/middleware unless protected.
- **Theme/config field:** edit `useDefaultThemeConfig.ts` + consumer. Avoid hardcoding hex (check for an existing token first).
- **Modal/nav shell:** edit AppHeader/Navbar/BottomNav + uiStore. Watch outside-click attribute conventions (`data-hamburger-menu`, `[data-lang-selector]`) and Teleport-to-body for anything inside overflow-hidden shells.
- **Server behavior:** middleware order is alphabetical — renaming files changes execution order. Never add `server/api/**` (proxy shadow).

---

## 13. Search Index

| Want                    | Search                                                 |
| ----------------------- | ------------------------------------------------------ |
| API base / proxy target | `getApiBase`, `API_HOST_URL`                            |
| Session/auth verify     | `verifyUser`, `bn.session`, `session_logged_out`       |
| Site config merge       | `deepMerge`, `userPageConfig`, `getDefaultThemeConfig` |
| Feature flags           | `useFeatures`, `getFeatures`                           |
| Dialogs                 | `fireDialog`, `showSwalAlert`                          |
| Wallet updates          | `updateUser`, `"wallet"` (WS event)                    |
| Page cache              | `anonPageCacheKey`, `x-anon-cache`, `nuxt:anonpage`    |
| SSR shared cache        | `withServerCache`, `nuxt:ssr:`                         |
| SPA switch              | `noSSR`, `auth-spa`                                    |
| CMS scripts             | `useCustomScripts`, `custom-scripts`                   |
| Nav skin                | `useNavSkin`, `theme.nav.type`                         |

---

## 14. Change Impact Matrix

| If you change                        | Also review                                                          | Risk                       |
| ------------------------------------ | -------------------------------------------------------------------- | -------------------------- |
| `useApi.ts` 401/CSRF logic           | `axios-client.ts` (mandated parity), `session_logged_out` consumers  | HIGH                       |
| `useDefaultThemeConfig.ts` interface | CMS payload contract (admin repo)                                    | HIGH — silent-ignore merge |
| `server/middleware/*` names/logic    | execution order (alphabetical), anon cache ↔ guard ordering          | HIGH                       |
| nuxt.config CSP/routeRules           | game-provider pixels, IPX rate-limit exemption, admin preview iframe | MED                        |
| Locale JSONs                         | all 4 files + ko/th drift                                            | LOW                        |
| Nitro proxy                          | cookie rewrite, `x-forwarded-*`, WS proxy symmetry                   | HIGH                       |

---

## 15. Performance Notes

- SSR CPU is the bottleneck → anon page cache + authed-SPA switch exist for this reason.
- `inline-critical-css` plugin removes the ~450ms first-paint flash (+~23KB/doc).
- Homepage LCP: preconnects to Linode CDN + game-thumbnail host; footer marquee logos MUST stay `loading="eager"` (lazy broke animation — commit 40fbd3c); IntersectionObserver reveal is the mitigation.
- `strip-game-payload.ts` trims `__NUXT_DATA__`; `/_ipx/**` has rate limiting disabled (50+ transforms/page).
- Perf e2e: `test:e2e:perf` throttled-network spec against live prod (`PERF_BASE_URL`).

## 16. Debugging Guide

| Symptom                           | Look first                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login state flashes / reload loop | `session_logged_out` latch in useApi/axios; `login-blink.spec.ts`                                                                                                                                                                           |
| Stale page for anon users         | anon page cache (`x-anon-cache` header), TTL envs                                                                                                                                                                                           |
| Authed page blank on first paint  | expected — auth-spa SPA mode; check client fetch errors                                                                                                                                                                                     |
| Theme field ignored               | wrong CMS path (silent ignore) — verify against `useDefaultThemeConfig.ts` interface                                                                                                                                                        |
| Togel 404 on a deployment         | `guard.ts` currency gate; `server/utils/site-currency.ts` resolves the private `API_HOST_URL` through the shared server validator. |
| No console output in prod         | `esbuild.drop` strips console.*; use Sentry or `process.stderr.write`                                                                                                                                                                       |
| WS won't connect                  | `/auth/ws` token fetch, ws-proxy plugin, `WEBSOCKET_HOST_URL`                                                                                                                                                                                |
| Hydration mismatch                | `tests/hydration-check.mjs`, `useIsMobileSSR` (the only safe render gate), pre-paint CSS vars                                                                                                                                               |
| Duplicate meta tags               | unhead dedup quirk — do NOT add `key:` to singleton metas (app.vue comment)                                                                                                                                                                 |

---

## 17. Anti-Patterns (NEVER do)

- Call backend URL directly from pages/components (always useApi/axiosClient/proxy).
- Retry mutations (both clients set retry rules deliberately — money safety).
- Put cookie-forwarding fetchers in `withServerCache` (cross-user leak).
- Add `server/api/**` routes (proxy claims `/api/*`).
- Mount a second AppDialog; import sweetalert2.
- Add `key:` to singleton meta tags.
- Add edge/`swr` route rules without the `bn.session` bypass guard.
- Hardcode hex colors when a `theme.*` token exists.
- Re-add lazy-loading to footer marquee logos.
- Trust CLAUDE.md-era brand facts (see §1 drift box).

## 18. Generated / dead files

- Generated: `.nuxt/**`, `.output/**`, `slotLogoCrop.ts` (auto-generated crops), `layout/footerLogos.ts` (curated/generated lists).
- Dead but tracked: root `index.js`, `homepage.html`, `public/_headers`, `composables/useThemeDoc.ts` (dormant, restore instructions in app.vue), `package-lock.json` (bun.lock is authoritative for Docker).

## 19. High-Risk Areas

1. Deposit/withdraw flow (`useBankPayment.ts`, `WithdrawalContent.vue`).
2. Nitro proxy + cookie rewrite (session integrity).
3. Anon page cache eligibility (cache poisoning if `bn.session` bypass breaks).
4. CSP / custom-scripts injection (trusted-admin model).
5. `useSiteConfig` merge contract with the admin CMS.

## 20. Future Reading Strategy

Every session: `CLAUDE.md` → `MEMORY.md` → this file → `DECISIONS.md` → only the files the File Reading Map (§11) lists for your task. Re-scan the repo only if architecture/folders materially changed, this file is demonstrably stale, or the user asks for an audit.
