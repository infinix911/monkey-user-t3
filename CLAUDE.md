# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repository Intelligence — READ THIS FIRST

This repo maintains a permanent 4-document AI knowledge system. **Read them in this order before touching code**, then open only the implementation files the task needs:

1. **CLAUDE.md** (this file) — AI workflow, standards, commands, high-level orientation.
2. **MEMORY.md** — temporary session notes, current tasks, TODOs. Check for in-flight work.
3. **KNOWLEDGEBASE.md** — the repository encyclopedia: architecture, request lifecycle, component/composable maps, site-config contract, **File Reading Map** (which files to open per task), debugging guide, high-risk areas, search index. Consult this INSTEAD of scanning source.
4. **DECISIONS.md** — architectural decision records (the WHY behind non-obvious choices).

**Permanent AI workflow for every task:**
CLAUDE → MEMORY → KNOWLEDGEBASE → DECISIONS → identify affected modules → read ONLY the files KNOWLEDGEBASE's File Reading Map lists → plan → validate against existing patterns → implement → update docs → stop.

**Do NOT re-scan the whole repository** unless architecture/folders changed materially, a large refactor landed, KNOWLEDGEBASE is demonstrably stale, or the user explicitly asks for an audit.

**Documentation maintenance rules** (update as part of the change, not after):

- **KNOWLEDGEBASE.md** — when architecture, a folder, module, pattern, reusable component/composable, the site-config contract, caching, auth, routing, or the File Reading Map changes.
- **DECISIONS.md** — when an architectural decision is made/changed/obsoleted (append a new ADR; never delete — mark Deprecated/Superseded).
- **CLAUDE.md** — when the AI workflow, repo organization, coding standards, or doc responsibilities change.
- **MEMORY.md** — temporary discoveries, current implementation notes, TODOs ONLY. Never permanent knowledge.

> Sibling repo `../banana-user-api` maintains its own KNOWLEDGEBASE/DECISIONS/MEMORY — cross-repo contracts (proxy targets, `bn.session`, WS events, site-config payload) are documented on both sides with pointers.

## Commands

```bash
npm run dev            # Dev server on http://localhost:3000
npm run build          # Production build (.output, node-server preset)
npm run start          # Run built server: node .output/server/index.mjs
npm run typecheck      # nuxt typecheck
npm run lint           # ESLint (lint:fix to auto-fix)

# Tests
npm run test:component # Vitest (nuxt env) — component characterization tests (currently none)
npm run test:all       # vitest (component project)
npm run test:e2e       # Playwright (API-mocked, serial) — START THE APP YOURSELF first
npm run test:e2e:perf  # throttled-network spec against live prod (PERF_BASE_URL)
```

> The togel money-math `unit` vitest project was removed with the togel domain
> (ADR: togel/qris removal). No coverage-measured unit suite remains.

**Manual pre-merge gate (no CI, no hooks):** `npm run test:component && npm run typecheck && npm run build`.

## Architecture

This is **monkey-user-t3**: a single bundled design template ("Template3") with CMS-driven theming. Full details in KNOWLEDGEBASE.md — summary below.

### Direct Browser API

The static SPA calls the public sibling API directly. In production,
`getApiBase()` derives `https://uapi.<root-domain>/api`; local development uses
`NUXT_PUBLIC_API_BASE`. REST requests include credentials, and WebSockets use
the same public API origin with an appropriate `ws(s)` scheme.

### API Client Pattern

Use `useApi()` for page data and mutations. Client-side store mutations may use
`app/lib/axios-client.ts`; both clients target `getApiBase()` and include the
host-scoped `bn.session` cookie:

- `useApi()`: `$fetch`, `credentials: include`, no automatic retries.
- `axiosClient`: Axios, `withCredentials: true`, GET-only retry and deduplication.

Mutations are never retried (money safety). The clients keep their 401-latch
logic in deliberate parity. There is no browser-readable auth helper cookie or
custom mutation header.

### Render mode

- The application is a static client-rendered SPA (`ssr: false`).
- `/**/GAME_*` routes continue to use one-time launch URLs.

### Site Config / Theming (CMS contract)

> The old 11-brand build-time selector was removed. Theme configuration is supplied by the CMS.

1. **Base**: `getDefaultThemeConfig()` in `app/composables/useDefaultThemeConfig.ts` — the full typed `SiteConfig` (6 groups: identity/theme/assets/contact/integrations/seo).
2. **Override**: CMS payload from **`/site/config/theme`** (hostname-scoped), stored in `useState('userPageConfig')` by `app/lib/siteConfig.ts` via app.vue.
3. **Merge**: `useSiteConfig()` deep-merges override onto base. Exact-path wins; `null`/`undefined` falls back to bundled; wrong paths are **silently ignored** — the authoritative field map is the typed `SiteConfig` interface in `app/composables/useDefaultThemeConfig.ts`.

Live preview: `?themePreview=1` + postMessage bridge (`app/plugins/theme-preview.client.ts`, origins from `NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN`). Feature flags derive from currency: `useFeatures()` → togel = IDR-only, payments = not-THB (server twin: `server/utils/features.ts`).

### Authentication

- **Server guard**: `server/middleware/guard.ts` — cookie-presence check, protects only `GAME_*` routes today (`PROTECTED_PREFIXES` is empty); also 404s `/togel*` on non-IDR deployments.
- **Client guard**: `app/middleware/auth.global.ts` (post-hydration, `PROTECTED_PATHS` empty; verifies via `authStore.verifyUser()` → `GET /auth/get-session`).
- **Store**: `app/stores/auth.ts` — user/wallet/level/bank; wallet updated live by the websocket store (`wallet` events).
- Session lifecycle: `app/plugins/session-verify.client.ts` (verify on ready → WS connect; disconnect on tab-hide for bfcache).

### i18n

2 locales `en/ko`, default `ko`, `strategy: no_prefix`, `detectBrowserLanguage: false` — language follows deployment currency (KRW→ko; default/missing→ko), `ui_locale` cookie overrides (English is opt-in via the switcher). Add strings to BOTH `i18n/locales/{en,ko}.json`. Default currency is **KRW** (`FALLBACK` in `site-currency.ts` + `useSiteCurrency.ts`).

### Caching (SSR)

- `app/lib/serverCache.ts` — `withServerCache(key, ttlMs, fetcher)`: Redis when `REDIS_HOST` set, else in-process. User-independent fetchers only.
- Anon full-page cache (`server/utils/anonPageCache.ts` + middleware/plugin pair) — opt-in `NUXT_ENABLE_ANON_PAGE_CACHE=true`; any `bn.session` bypasses; optional edge layer `NUXT_ENABLE_EDGE_CACHE`.
- Site-config fetcher has its own 5s server memo + client localStorage warm-start; total failure → bundled fallback + SSR **503** (edge-cache poison guard).

### Stores (Pinia, setup-style, no persistence plugin)

| Store       | Purpose                                                                                  |
| ----------- | ---------------------------------------------------------------------------------------- |
| `auth`      | User identity, wallet, level, bank; verifyUser/logout                                    |
| `websocket` | Cookie-authenticated WS connect via `wss://<host>/ws`; notification + wallet events |
| `site`      | Site settings/banks (populated during SSR)                                               |
| `ui`        | Modal flags, device detection, notice                                                    |

### Togel + QRIS removed

The **Togel (lottery) domain and QRIS payment method were fully removed** (pages,
components, stores `togelPool`/`betHistory`, `services/togel/**`, schemas, the
togel bet interfaces, the QRIS deposit tab, and their assets/i18n). Do not
re-introduce a `features.togel` flag — `useFeatures()`/`getFeatures()` now expose
only `payments`. The shared account/activity panel theme tokens that used to live
under `theme.togel.*` moved to **`theme.panel.*`**; the generic `DataTable` and
transaction-ledger types moved to `app/components/DataTable.vue` and
`app/interfaces/ledger.ts`.

### Partner section removed

The **partner/affiliate section was fully removed** from this app (ADR-020): the
`/partner*` pages, `app/components/partner/**`, the partner deposit/withdraw
transaction content, `usePartnerTheme`, `partner.interface.ts`,
`utils/partnerMenu.ts`, the `theme.partner.*` token group, the `pm-*`/`quick-*`
CSS utilities, and the `partner*` i18n trees. `layouts/default.vue` no longer
has an `isPartnerPage` branch. Partner-facing features belong in the sibling
`monkey-partner` app — do not re-add them here. New partner ids must go in
`REMOVED_ITEM_IDS` (`app/components/profile/useProfileMenu.ts`), since the CMS
is the source of profile-menu truth.

## Key Environment Variables

| Variable                                                      | Purpose                                                       |
| ------------------------------------------------------------- | ------------------------------------------------------------- |
| `NUXT_API_URL`                                                | Backend REST URL (including `/api`) — server-only             |
| `NUXT_PUBLIC_SITE_URL`                                        | Public URL for sitemap/robots                                 |
| `REDIS_HOST` (+PORT/PASSWORD/DB)                              | Optional — enables shared SSR cache + anon page cache storage |
| `NUXT_ENABLE_ANON_PAGE_CACHE` / `NUXT_ANON_PAGE_CACHE_TTL_MS` | Anonymous full-page SSR cache (default off / 60s)             |
| `NUXT_ENABLE_EDGE_CACHE` (+MAXAGE_S/SWR_S)                    | Optional CDN-Cache-Control for anon responses                 |
| `NUXT_PUBLIC_SENTRY_DSN`                                      | Sentry — empty disables monitoring                            |
| `NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN`                            | Admin CMS origins for theme-preview iframe/postMessage        |

## Notable Config Decisions (details in DECISIONS.md)

- `experimental.appManifest: false` — prevents 404s from stale HTML after deploys (ADR-012).
- `vite.build.rolldownOptions.output.minify.compress.dropConsole` — prod console is a no-op; use Sentry or `process.stderr.write`.
- CSP `script-src https:` is deliberately loose (game-provider pixels) — ADR-011.
- SweetAlert2 is REMOVED — use `showSwalAlert()`/`fireDialog()` (in-house AppDialog, ADR-009). Do not import sweetalert2.
- `components.pathPrefix: false` — flat component namespace.
- Server middleware executes in ALPHABETICAL filename order — renaming changes behavior.
- Mutations are never retried by either HTTP client (money safety, ADR-006).
