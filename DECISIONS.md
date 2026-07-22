# DECISIONS.md — banana-jaeisol-t3-nuxt

> Architectural decision records (ADRs). Answers **WHY**, not HOW (HOW → `KNOWLEDGEBASE.md`).
> Inferred from implementation at commit `fb66962` (2026-07-06). Where intent is uncertain it is marked *(inferred)*.
> Never delete an ADR — mark it Deprecated / Superseded by ADR-###.

---

## ADR-001 — Same-origin Nitro BFF proxy for REST and WebSocket
**Status:** Accepted
**Decision:** The browser only ever talks to the Nuxt origin. REST goes through `server/routes/api/[...path].ts` (h3 `proxyRequest` → server-only `API_HOST_URL`, `cookieDomainRewrite {"*":""}` so `bn.session`/`XSRF-TOKEN` attach to the frontend origin, `x-forwarded-host/proto` set, streaming). WebSockets upgrade on `/ws` via `server/plugins/ws-proxy.ts` (httpxy → `WEBSOCKET_HOST_URL`; httpxy replaced deprecated `http-proxy`, commit cd2f7e8).
**Context:** Backend (Bun/Elysia HTTP + WS :4000) runs as an internal Docker service behind Traefik; exposing it needs CORS + public hostnames.
**Alternatives:** CORS + direct calls; Traefik-level path routing.
**Reason:** Single origin removes CORS and cookie-domain problems entirely; backend host never reaches the browser bundle.
**Tradeoffs:** Every API byte transits Node; streamed responses constrain response-header plugins (`headersSent` guards); `/api/*` namespace is fully claimed — no Nitro `server/api/` routes possible.
**Do not change unless** moving to edge/CDN-level proxying — re-verify cookie rewrite and CSRF semantics end-to-end.

---

## ADR-002 — CMS deep-merge theming over one bundled template; per-brand builds abandoned
**Status:** Accepted (supersedes the lucky-repo 11-brand `__BUILD_SITE__` model)
**Decision:** One typed bundled default (`getDefaultThemeConfig()`, "Template3") deep-merged under a per-hostname CMS payload from `/site/config/theme`. Brand identity, theme tokens, assets, feature surface are all data. `__BUILD_SITE__` remains defined in `vite.define` but is intentionally unused; per-brand config modules were removed.
**Context:** This fork serves CMS-themed tenant deployments (e.g. `idr-demo1.jaeisol.com`); admin needs to restyle without rebuilds.
**Alternatives:** Keep build-time brand tree-shaking (the sibling banana-lucky-nuxt approach).
**Reason:** N tenants without N builds; live theme preview (`?themePreview=1` postMessage bridge) becomes possible.
**Tradeoffs:** Wrong CMS paths are silently ignored (hence the 510-line `docs/site-config-cms-fields.md` contract); CMS cannot blank a field (null falls back to bundled); `useSiteConfig()` is a non-reactive snapshot; doc drift already occurred (CLAUDE.md described the dead system).
**Affected:** `useDefaultThemeConfig.ts`, `useSiteConfig.ts`, `app/lib/siteConfig.ts`, admin CMS form.

---

## ADR-003 — Anonymous = SSR, Authenticated = SPA (per-request switch)
**Status:** Accepted
**Decision:** `server/middleware/auth-spa.ts`: HTML GET with a `bn.session` cookie sets `event.context.nuxt.noSSR = true` → empty SPA shell (`app/spa-loading-template.html` is intentionally empty), client renders everything. Anonymous requests get full SSR.
**Context:** SSR exists for SEO; authenticated SSR renders were the uncacheable CPU load causing 502s under load.
**Alternatives:** Cache authed SSR per-user (explosive keyspace); make everything SPA (loses SEO).
**Reason:** Crawlers and first-time visitors get SSR; logged-in users get a fast SPA without server render cost.
**Tradeoffs:** Two render modes to reason about; logged-in first paint is a blank shell; never rely on SSR-only behavior for authed flows.

---

## ADR-004 — Layered caching, all keyed on the ABSENCE of `bn.session`
**Status:** Accepted
**Decision:** Three opt-in layers: (1) `withServerCache` per-endpoint SSR data cache (Redis `nuxt:ssr:*` else in-process, 60s, user-independent fetchers only); (2) anon full-page HTML cache (`NUXT_ENABLE_ANON_PAGE_CACHE`, key host+path+allowlisted query, 60s, serve-middleware short-circuits SSR); (3) optional Cloudflare edge cache (`NUXT_ENABLE_EDGE_CACHE` → `CDN-Cache-Control` for anon only). Authed responses always `private, no-store`. Site-config fetch failure returns **503** so edge SWR never caches degraded HTML.
**Context:** Bulk of traffic is anonymous/crawler; SSR CPU is the bottleneck (see ADR-003).
**Tradeoffs:** TTL-only freshness (no purge); strict query allowlist; togel/GAME_ excluded; cache-poisoning risk if the cookie bypass ever breaks (HIGH-risk area).

---

## ADR-005 — Locale = deployment currency, `no_prefix`, no browser detection
**Status:** Accepted
**Decision:** `strategy: "no_prefix"`, `detectBrowserLanguage: false`; language resolved in app.vue: `ui_locale` cookie else `currencyToLocale(siteCurrency)` (THB→th, IDR→id, KRW→ko, default id). Legacy `/id|/ko|/th` URLs 301 to unprefixed (`locale-redirect.ts`).
**Context:** The old prefix+detection strategy caused a `/`→`/id` double-load/redirect flash.
**Tradeoffs:** No per-URL locale, no hreflang; per-user language only via the cookie. One deployment ≈ one market.

---

## ADR-006 — Dual HTTP clients with mandated parity; mutations never retry
**Status:** Accepted
**Decision:** `useApi()` ($fetch-based, isomorphic, `retry: 0`, 10s timeout) for page/SSR data; `axiosClient` (GET-only dedupe, idempotent-only retry) for client-side mutations/stores. Both implement the same CSRF double-submit and the shared `sessionStorage.session_logged_out` 401 latch; comments mandate keeping them in sync.
**Context:** Gradual Next.js port; ofetch integrates with `useAsyncData`, axios legacy remains.
**Tradeoffs:** Two parity-maintained implementations. **Never-retry on mutations is deliberate money safety** — a failed-but-applied debit must not replay.

---

## ADR-007 — Zod at exactly two boundaries
**Status:** Accepted
**Decision:** (1) Forms: locale-reactive factories `(t) => toTypedSchema(z.object(...))` in `app/schemas/`; (2) untrusted togel API payloads: `api.validated(schema, req)` with `satisfies z.ZodType<Interface>` (interfaces stay the compile-time source of truth). Other endpoints unvalidated.
**Reason:** Runtime guarding where money is at stake; avoid schema-inference type churn elsewhere.

---

## ADR-008 — Pure togel service layer; characterization tests before refactor
**Status:** Accepted
**Decision:** Money math lives in framework-free `app/services/togel/` (calculation, validation, submission, generator) with injected side effects and colocated specs — extracted verbatim from components to preserve exact behavior. Refactor policy (per `tasks/mistik-table-decomposition.md`): pin behavior with characterization/payload-capture tests (golden `POST /togel/bet` bodies) BEFORE decomposing god-components; MistikTable decomposition is deliberately deferred until a Mistik E2E + generation-glue tests exist.
**Tradeoffs:** God-components persist meanwhile; the watcher/orchestration glue remains unfenced.

---

## ADR-009 — In-house AppDialog behind SweetAlert2-compatible shims
**Status:** Accepted
**Decision:** sweetalert2 removed from deps; `ui/AppDialog.vue` (singleton, promise queue via `useDialogQueue`, DOMPurify-sanitized HTML) rendered once in app.vue; `utils/swal-alert.ts`/`swal-compat.ts` keep the old `Swal.fire`-shaped API so ~50 call sites stayed unchanged.
**Reason:** Bundle size, theming control. **Tradeoffs:** swal parity semantics maintained by hand; one dialog at a time.

---

## ADR-010 — Bun builds, Node 22 runs; one image per tenant
**Status:** Accepted
**Decision:** Dockerfile: `oven/bun:1-alpine` deps+build (`--frozen-lockfile`), `node:22-alpine` runtime running only `.output` as non-root. `NUXT_PUBLIC_SITE` is a build ARG (now mostly informational — see ADR-002); per-tenant config is runtime env + CMS.
**Tradeoffs:** Two runtimes; dual lockfiles tracked (bun.lock authoritative; package-lock.json is a stale-risk decoy).

---

## ADR-011 — CSP deliberately loosened; admin scripts trusted
**Status:** Accepted
**Decision:** `script-src 'self' 'unsafe-inline' https:` because game-provider iframes inject arbitrary third-party pixels (Kwai/fbevents/GA/TikTok); specific hosts kept as documentation only. Admin CMS `<script>` snippets (`/site/custom-scripts`) injected raw into SSR head — explicit trusted-admin model. `frame-ancestors` for the admin theme-preview iframe is injected at RUNTIME by `csp-admin-frame-ancestors.ts` (build args unavailable in Docker).
**Tradeoffs:** CSP provides little script protection by design; a compromised admin account = XSS. Do not "tighten" CSP without checking provider pixels.

---

## ADR-012 — Perf/deploy hardening cluster *(inferred, each documented in nuxt.config comments)*
**Status:** Accepted
**Decision:** `experimental.appManifest: false` (stale-HTML 404s after deploy); `inline-critical-css` Nitro plugin (kills ~450ms black flash, +23KB/doc); `esbuild.drop: console,debugger` (prod console is a no-op — use Sentry or `process.stderr`); `sourcemap: "hidden"` + Sentry upload; `compressPublicAssets` gzip+brotli; viewport zoom disabled (iOS input auto-zoom; accessibility tradeoff acknowledged); IPX rate-limit exemption; immutable cache headers for hashed assets.

---

## ADR-013 — Config-driven skins & currency-derived feature flags
**Status:** Accepted
**Decision:** Structural per-tenant variation goes through registries, not branches: `theme.nav.type` → `useNavSkin()` (glyph mode + transaction-panel component); `assets.togel.resultType`. Feature surface derives from currency: `useFeatures()` `{togel: IDR-only, payments: not-THB}` with a server twin `server/utils/features.ts` (guard.ts 404s `/togel*` on non-IDR).
**Tradeoffs:** N skin variants to keep in parity; features implicitly coupled to currency; client/server flag logic duplicated — keep in sync.

---

## ADR-014 — useState for request-scoped config, Pinia for interactive state
**Status:** Accepted
**Decision:** SSR-serialized globals (`userPageConfig`, `siteConfigError`, `isMobileSSR`) in `useState`; session/interactive state (auth, ws, pools, ui modals) in Pinia setup stores, no persistence plugin — manual sessionStorage mirrors rehydrated in `.client.ts` plugins. God-stores split incrementally (pool → pool+betHistory with deprecated facade).

---

## ADR-015 — Dual-DOM responsive layouts
**Status:** Accepted
**Decision:** Structurally different mobile/desktop designs are separate DOM trees (`hidden lg:block` / `lg:hidden`) — AppHeader, Navbar, togel tables — with pre-paint CSS vars (inline head script) for SSR-stable sizing and `useIsMobileSSR` as the only hydration-safe JS render gate.
**Tradeoffs:** Double maintenance per shell component; 4 coexisting mobile-detection mechanisms.

---

## ADR-016 — No CI; manual gate + self-skipping tests *(inferred)*
**Status:** Accepted (pragmatic)
**Decision:** No CI/hooks. Pre-merge gate is the documented manual sequence (component+unit+typecheck+build). Playwright has no webServer and specs self-skip when the app isn't running; e2e determinism comes from full API mocking (`tests/e2e/fixtures/api-mocks.ts`); the perf spec targets live prod.
**Tradeoffs:** Every gate is opt-in; nothing enforces the convention. First candidate to revisit if the team grows.

---

## ADR-017 — Togel + QRIS removed; Korean default, KRW default currency
**Status:** Accepted
**Context:** The deployment was repurposed into a Korean (KRW) product with no lottery vertical.
**Decision:**
- Fully removed the **Togel** domain (pages, `app/components/togel/**`, `app/services/togel/**`, stores `togelPool`/`betHistory`, `gameControlSortOrder`, togel schemas/interfaces/utils, assets, i18n) and the **QRIS** deposit method (`QrisContent`/`QrisDepositForm`, its schema, the payment tab, assets/i18n). `useFeatures()`/`getFeatures()` now return only `{ payments }` — the `togel` currency-gate is gone.
- Reduced UI languages to **`en` + `ko`** (deleted `id`/`th` locales, flags list, and `LOCALE_META` entries); **`ko` is the default** (`defaultLocale`, `i18n.config` locale, and `DEFAULT_LOCALE` in `locale-from-currency.ts`). `fallbackLocale` stays `en` (missing-key safety net). English remains selectable via the `ui_locale` switcher.
- **Default currency → KRW** (`FALLBACK` in `server/utils/site-currency.ts` and `app/composables/useSiteCurrency.ts`). The `SiteCurrency` union stays broad so a mis-set CMS currency still resolves.
- Shared pieces the account/activity/ledger features borrowed from togel were relocated, NOT deleted: `theme.togel.*` tokens → **`theme.panel.*`**; `components/togel/DataTable.vue` → **`app/components/DataTable.vue`**; ledger types → **`app/interfaces/ledger.ts`**. Activity's togel tab + togel bet-detail modal were dropped.
- The togel-only vitest `unit` project + coverage were removed (ADR-016's gate updated to `component + typecheck + build`).
**Supersedes/updates:** ADR-013 (currency-derived feature flags — `togel` flag removed), ADR-016 (gate no longer runs a `unit` project). The `defaultLocale: id` / PLAN-PAGE-LOADS-TWICE rationale now targets `ko`.
**Tradeoffs:** `LanguageFlag.vue` still ships id/th flag graphics because the signup **currency** selector reuses it for IDR/THB accounts (unrelated business logic left intact); this is currency iconography, not a UI language.

---

## ADR-018 — `/promotions/*`-only UI removed (bonus history, level system, deposit vouchers)
**Status:** Accepted
**Context:** `monkey-user-api` has no `/promotions` module. Three surfaces existed whose *only* data source was a non-existent endpoint, so they rendered permanently empty (or, for vouchers, were already hidden behind `v-if="false"` with the fetch stripped out). They degraded gracefully rather than crashing, which meant they lingered as dead weight and misleading UI.
**Decision:** Delete the surfaces outright rather than keep them waiting on a backend that isn't planned:
- **Bonus history** (`GET /promotions/bonuses`) — `BonusHistory.vue` deleted.
- **Level system** (`GET /promotions/level-rewards`) — `LevelSystem.vue` deleted **in full**, including the level banner and the FAQ accordion that were fed by the *working* `/site/config/userpage/levelSystem` endpoint. That config fetch had no other consumer and went with it. The tier **badge assets** (`assets.images.bronze/silver/gold/diamonds`) and the auth-store level fields are retained — `AppHeader.vue` / `UserBalancePill.vue` still render the level badge.
- **Deposit vouchers** (`GET /promotions/vouchers`) — `VoucherPopupModal.vue`, the dead picker block, all voucher state in `useBankPayment.ts`, and `tests/e2e/specs/voucher-popup.spec.ts`. With vouchers gone the `bonus` computed disappears, so `totalNetAmount` collapsed to `netAmount`; both the Bonus and Total rows were dropped from `DepositSummary.vue` rather than print the same figure twice.
**Key constraint — the CMS is the source of menu truth:** profile-menu items come from the live theme payload via `useMenuSettings`, which replaces the bundled `profileMenu` array wholesale. Deleting the bundled defaults therefore does **not** stop the tiles rendering. The existing togel-only `isTogelItem` guard was generalised into **`REMOVED_ITEM_IDS` / `isRemovedItem`** (`app/components/profile/useProfileMenu.ts`), now also matching `bonushistory` / `levelsystem` on a normalised id. Any future panel removal must add its id there, not just to the defaults.
**Alternative considered:** disabling the two items in the admin CMS per deployment. Rejected as the primary mechanism — it is per-hostname data, so a single missed site config reintroduces dead tiles. The code-level filter is a guarantee; the CMS change is optional cleanup on top.
**Tradeoffs:** The `deposit.apiMessages.INVALID_VOUCHER` / `ACTIVE_TO_IN_PROGRESS` i18n tokens are kept — they are backend-emitted error keys, not UI strings, and removing them would break message lookup if the API ever returns them. Re-introducing any of these features means rebuilding the component, not flipping a flag.
**Related:** ADR-017 (same removal pattern; `isTogelItem` is its ancestor).
