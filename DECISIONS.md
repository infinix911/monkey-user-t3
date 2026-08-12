# DECISIONS.md — monkey-user-t3

> Architectural decision records (ADRs). Answers **WHY**, not HOW (HOW → `KNOWLEDGEBASE.md`).
> Inferred from implementation at commit `fb66962` (2026-07-06). Where intent is uncertain it is marked *(inferred)*.
> Never delete an ADR — mark it Deprecated / Superseded by ADR-###.

---

## ADR-001 — Same-origin Nitro BFF proxy for REST and WebSocket
**Status:** Accepted
**Decision:** The browser only ever talks to the Nuxt origin. REST goes through `server/routes/api/[...path].ts` (h3 `proxyRequest` → server-only `NUXT_API_URL`, `cookieDomainRewrite {"*":""}` so `bn.session`/`XSRF-TOKEN` attach to the frontend origin, `x-forwarded-host/proto` set, streaming). WebSockets upgrade on `/ws` via `server/plugins/ws-proxy.ts` (httpxy → `NUXT_WS_API_URL`; httpxy replaced deprecated `http-proxy`, commit cd2f7e8).
**Context:** Backend (Bun/Elysia HTTP + WS :4000) runs as an internal Docker service behind Traefik; exposing it needs CORS + public hostnames.
**Alternatives:** CORS + direct calls; Traefik-level path routing.
**Reason:** Single origin removes CORS and cookie-domain problems entirely; backend host never reaches the browser bundle.
**Tradeoffs:** Every API byte transits Node; streamed responses constrain response-header plugins (`headersSent` guards); `/api/*` namespace is fully claimed — no Nitro `server/api/` routes possible.
**Do not change unless** moving to edge/CDN-level proxying — re-verify cookie rewrite and CSRF semantics end-to-end.

---

## ADR-002 — CMS deep-merge theming over one bundled template; per-brand builds abandoned
**Status:** Accepted (supersedes the lucky-repo 11-brand `__BUILD_SITE__` model)
**Decision:** One typed bundled default (`getDefaultThemeConfig()`, "Template3") deep-merged under a CMS payload from `/site/config/theme`. Brand identity, theme tokens, assets, feature surface are all data. The obsolete `__BUILD_SITE__` build selector and per-brand config modules were removed.
**Context:** This fork serves CMS-themed tenant deployments (e.g. `idr-demo1.jaeisol.com`); admin needs to restyle without rebuilds.
**Alternatives:** Keep the sibling project's build-time brand tree-shaking approach.
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

## ADR-010 — Bun builds, Node 22 runs; one image per deployment
**Status:** Accepted
**Decision:** Dockerfile: `oven/bun:1-alpine` deps+build (`--frozen-lockfile`), `node:22-alpine` runtime running only `.output` as non-root. Deployment configuration is supplied through runtime environment variables and the CMS; no build-time site selector is supported.
**Tradeoffs:** Two runtimes; dual lockfiles tracked (bun.lock authoritative; package-lock.json is a stale-risk decoy).

---

## ADR-011 — CSP deliberately loosened; admin scripts trusted
**Status:** Accepted
**Decision:** `script-src 'self' 'unsafe-inline' https:` because game-provider iframes inject arbitrary third-party pixels (Kwai/fbevents/GA/TikTok); specific hosts kept as documentation only. Admin CMS `<script>` snippets (`/site/custom-scripts`) injected raw into SSR head — explicit trusted-admin model. `frame-ancestors` for the admin theme-preview iframe is injected at RUNTIME by `csp-admin-frame-ancestors.ts` (build args unavailable in Docker).
**Tradeoffs:** CSP provides little script protection by design; a compromised admin account = XSS. Do not "tighten" CSP without checking provider pixels.

---

## ADR-012 — Perf/deploy hardening cluster *(inferred, each documented in nuxt.config comments)*
**Status:** Accepted
**Decision:** `experimental.appManifest: false` (stale-HTML 404s after deploy); `inline-critical-css` Nitro plugin (kills ~450ms black flash, +23KB/doc); OXC `dropConsole`/`dropDebugger` minification (prod console is a no-op — use Sentry or `process.stderr`); `sourcemap: "hidden"` + Sentry upload; `compressPublicAssets` gzip+brotli; viewport zoom disabled (iOS input auto-zoom; accessibility tradeoff acknowledged); IPX rate-limit exemption; immutable cache headers for hashed assets.

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

---

## ADR-019 — Remove the build-time site selector
**Status:** Accepted
**Context:** `NUXT_PUBLIC_SITE` and its `__BUILD_SITE__` Vite define no longer selected any live application behavior. The remaining wiring only exposed a redundant browser global, Docker build arguments, and a disabled multi-brand PWA configuration.
**Decision:** Remove `NUXT_PUBLIC_SITE`, `__BUILD_SITE__`, `window.__NUXT_SITE`, the associated public runtime-config field, Docker build arguments, and the disabled multi-brand PWA branch. The package and deployment examples are named `monkey-user-t3`.
**Scope:** This does not change `NUXT_PUBLIC_SITE_URL`, host allow-listing, or CMS-driven theme configuration. Those remain the source of public URL, request-host validation, and visual configuration.
**Tradeoffs:** Deployments cannot select a site identity at build time. Changes to theme identity continue to be made through the CMS rather than a rebuild.

---

## ADR-020 — Partner/affiliate section removed from the user site
**Status:** Accepted
**Context:** The partner (affiliate) dashboard lived inside the player-facing app as a second, separately-themed application: nine `/partner*` routes, a 21-file `app/components/partner/**` tree, its own nav bar, its own page shell inside `layouts/default.vue`, its own theme token group, and its own CSS utility block in `main.css`. Partner-facing work belongs in the dedicated `monkey-partner` app, so keeping a parallel copy here meant every layout, theme, and i18n change had to be reasoned about twice.
**Decision:** Remove the section outright rather than hide it behind a flag:
- **Routes/components:** all nine `app/pages/partner*.vue`, `app/components/partner/**` (incl. `modals/**`), and `app/components/transaction/Partner{Deposit,Withdraw}Content.vue`.
- **Partner-only modules:** `app/composables/usePartnerTheme.ts`, `app/interfaces/partner.interface.ts`, `app/utils/partnerMenu.ts`, `public/designs/partner/cosmo.webp`, and `formatPartnerAmount()` in `app/utils/currency.ts` (its only four callers were partner list components).
- **Layout:** the `isPartnerPage` computed and every branch it gated in `layouts/default.vue` (focus dim, banner/announcement/auth-button/navbar suppression, `PartnerNav` slot, the `.partner-body` + `.partner-cosmos` page shell). Non-partner pages keep their existing behavior; the `main` slot is now unconditional.
- **Theme contract:** `ThemePartnerConfig` + `theme.partner.*` deleted from `useDefaultThemeConfig.ts` and `public/theme.json`. Safe because `useSiteConfig()` deep-merges CMS-over-bundled and **silently ignores paths absent from the bundled base** — a live theme document still shipping `theme.partner` is inert, not an error.
- **CSS:** the `pm-*` / `quick-*` / `.partner-tab` / `.amount-reset` / `.partner-body` block at the tail of `main.css` (verified zero remaining consumers).
- **i18n:** the `partner`, `partnerMenu`, `partnerPages` trees plus `header.partner`, `footer.links.partner`, `home.seo.links.partner` in BOTH locales.
- **SEO:** the `/partner` entry in `server/routes/sitemap.xml.ts`.
- **Menu guard:** partner ids added to `REMOVED_ITEM_IDS` in `app/components/profile/useProfileMenu.ts` — per ADR-018 this is the guarantee, since the CMS (not the bundled defaults) is the source of profile-menu truth and could otherwise render a tile pointing at a dead route.
**Deliberately NOT removed:** the `partner.apiMessages.*` precedent from ADR-018 does not apply — those keys existed only for the partner deposit/withdraw request flows, which are gone, so they went too. `utils/game-navigation.ts`'s `isOpenedViaTelegramOffline()` is kept (already unused by any caller); only its stale partner-flow comment was corrected.
**Residual CMS work (not code):** a live theme/nav payload that still contains a `/partner*` menu entry will now navigate to a 404. The profile-menu path is filtered in code; top-nav (`assets.navIcons.menuItems`) is not, so any partner entry there must be removed in the admin CMS per hostname.
**Tradeoffs:** Re-introducing a partner surface here means rebuilding it, not flipping a flag. Partner functionality is expected to live in `monkey-partner`.
**Related:** ADR-017 and ADR-018 (same "delete the surface, add the CMS-id guard" removal pattern).

## ADR-021 — Desktop two-column shell: left rail replaces the desktop category bar

**Context.** The desktop design moved the game categories and the
deposit/withdraw panel off the horizontal bar under the banner and into a fixed
left rail, giving a two-column shell (rail + content).

**Decision.** `layouts/default.vue` wraps its content stack in a wrapper that is
`flex` only from `lg`, with `layout/AppSidebar.vue` as the first column. Below
`lg` the wrapper is inert, so the mobile single-column layout — and the
JS-driven sticky/scroll machinery tuned to it (fixed navbar, announcement bar,
game-section background; `position: sticky` is unavailable because html/body
carry `overflow-x`) — is untouched.

`navigation/Navbar.vue` gained a `desktop` prop (default `true`); the layout
passes `:desktop="false"`. The component still renders, because it hosts the
Deposit/Withdrawal modal instances the rail depends on, and it still serves the
mobile category bar.

**Consequences.** Three widths must stay in step: the wrapper's
`lg:max-w-[1456px]`, `AppHeader`'s desktop row (so the logo sits above the rail),
and the shell-centring term in `AppSidebar`'s `panelStyle.left` (so the account
panel stays pinned to the content column). The rail is not sticky, for the
`overflow-x` reason above. Rail colours live in `theme.sidebar`
and its icons in `assets.sidebarIcons`, so both are CMS-overridable; the
deposit/withdraw block reuses `theme.nav.depositSectionGradient` rather than
introducing a second gradient token.

**Amendment (2026-07-30).** The five `theme.sidebar` tokens now have real fields
in the CMS schema (a "Sidebar" tab in the admin Theme Editor) instead of only
existing in the bundled config, and both theme seeds ship the block. As part of
that, `theme.sidebar.border` — a full CSS shorthand (`"1px solid #B04C00"`) —
became `theme.sidebar.borderColor` (`"#B04C00"`), with the 1px width fixed in
`AppSidebar.vue`: a shorthand cannot be driven by a colour picker, and free-text
CSS in the CMS is an invalid-value vector. Adding a token here means adding the
matching field to `theme-schema/theme.schema.ts` **and** the default to
`theme-schema/site-config.ts` in both admin apps, or the editor renders a field
with an `undefined` default.

**Alternatives rejected.** Duplicating the rail's markup per breakpoint (two
sources of truth for the same menu); deleting Navbar's desktop branch outright
(loses the modal hosts); hardcoding the design's hexes in the component (breaks
the CMS theming contract).


---

## ADR-022 — Carousel banners: one SSR fetch for every page, held in Pinia

**Status.** Accepted (2026-08-08).

**Context.** `BannerPreview.vue` both fetched and rendered: it called
`/site/banners-new/carousel?page=<key>` from its own `useAsyncData` and refetched
whenever its `page` prop changed. Because the component lives in
`layouts/default.vue` and survives navigation, that meant **one request per page
the visitor opened** — client-side, after hydration. It also used a constant
asyncData key (`"banners-carousel"`) for data that varied by page, so each
navigation overwrote the same payload entry.

**Decision.** Fetch **every** active carousel banner once, during SSR, and let
pages filter it:

- The backend endpoint accepts `page=all` (a new literal alongside the existing
  page keys) and returns every active banner of the type, with each row tagged
  by the `page` it belongs to. `page` is returned on *every* read, not only
  `page=all`, so the row shape never varies by query.
- `app/composables/useBanners.ts` (`fetchBanners`) is invoked from `app.vue`'s
  `Promise.all`, alongside `fetchSiteSettings` — same `withServerCache` + host
  forwarding, same `getCachedData` guard against a hydration refetch.
- `app/stores/banner.ts` holds the list; `bannersByPage(key)` filters it.
- `BannerPreview.vue` is now presentation only: it reads the store and renders.

**Consequences.** Zero browser-side banner requests: the whole set travels in the
SSR payload and navigation is a re-filter of hydrated state. The loading
placeholder and the keep-previous-data cross-fade are gone with the per-page
fetch they existed for — there is nothing to wait for, so the swap is immediate
(the height glide on `aspect-ratio` stays, since ratios still differ per page).
The `common.loadingBanners` i18n key was removed with its only consumer.

**Backward compatibility.** Omitting `page` still defaults to `homepage`, so the
other consumers of this shared multi-tenant endpoint are unaffected — the change
is additive on both the query (`all`) and the response (`page`). Changing the
*default* to "all" was rejected for exactly that reason. The frontend also treats
`page` as optional on the wire and maps a missing value to `"homepage"`, so a
backend that predates the field cannot fail validation and blank the carousel.

**Alternatives rejected.** Keeping the per-page fetch but caching per page key in
the store (still one request per distinct page, and still client-side);
per-page asyncData keys (fixes the payload collision but not the request count).

**Amendment (2026-08-08) — the swap waits for the incoming artwork.** The
original wording above ("there is nothing to wait for, so the swap is
immediate") was wrong in practice. Having the *records* in memory is not the
same as having the *artwork* decoded: swapping `src` the instant the route
changed left the slot showing its black background for as long as the new image
took to decode — measured at ~344ms on a first visit, and visible as a flicker.

`BannerPreview.vue` therefore keeps a `displayPage` that lags `props.page` until
the incoming creative has been through `image.decode()`, bounded by
`SWAP_DECODE_BUDGET_MS` (600ms) so a slow CDN cannot strand the visitor on the
previous page's banner. The previous creative stays on screen for that window —
the same *effect* as the old keepPreviousData behaviour, but ending precisely
when the next image can paint rather than when a network request happened to
return.

Separately, the first banner of every *other* page is decoded at
`requestIdleCallback` time. This costs no extra API requests (the whole set is
already in the store) and is what makes the swap resolve instantly instead of
spending its decode budget. Measured after the change: the new `src` appears
already decoded on its first frame, i.e. zero black frames.

The remaining motion on a page change is the deliberate `aspect-ratio` glide
(~300ms) where the two pages' banner ratios differ — that is animation, not
flicker, and is unchanged.

## ADR-023 — i18n messages are served from the client bundle, not the messages endpoint

**Status:** Accepted

`@nuxtjs/i18n` v10 keeps messages behind the Nitro route
`/_i18n/<hash>/<locale>/messages.json`. In a production SSR build the client
*always* resolves them through it, because `loadMessages()` only takes the
bundled-import branch when `dynamicResourcesSSG || import.meta.dev`, and
`dynamicResourcesSSG` is false whenever `ssr: true` and the build is not
prerendered. Every visit therefore downloaded ~74 kB of `ko.json` during
hydration, answered with `Cache-Control: max-age=10`.

`experimental.preload: true` was tried first and does **not** solve it. Preload
inlines the messages into the HTML as a `data-nuxt-i18n` script, but
`loadAndSetLocale()` still calls `ctx.loadMessages()` unconditionally, and
`loadMessages()` never consults `ctx.preloaded` — its only early return is
`nuxt.isHydrating && loadMap.has(locale)`, and nothing seeds `loadMap` on the
client. Confirmed against the shipped 10.3 and 10.5 sources. Preload would have
added ~90 kB of inlined JSON per response *and kept the request*.

`app/plugins/i18n-bundled-messages.client.ts` replaces `ctx.loadMessages` with
one that merges the statically imported locale JSON, so the client never calls
the endpoint. The patch installs from the `i18n:beforeLocaleSwitch` hook, which
is awaited immediately before `ctx.loadMessages()` inside `loadAndSetLocale()`.
That makes correctness independent of plugin ordering: the plugin only has to
register the hook before the module plugins run (`enforce: "pre"`), rather than
having to run between two of them.

SSR is unchanged and still uses the endpoint — an internal, peerless request,
which is what `isTrustedInternalI18nRequest` in
`server/middleware/00-validate-host.ts` exists to allow.

`experimental.cacheLifetime` / `httpCacheDuration` are raised to 86400s so any
remaining hit (an old cached document, a client where the patch did not run) is
a cache hit rather than a download. The URL carries a content hash, so a long
TTL cannot serve stale copy: editing a locale file changes the hash, and with it
the URL.

**Caveat:** this patches module internals (`nuxtApp._nuxtI18n.loadMessages`).
If an upgrade changes that contract the patch silently stops applying and the
endpoint fetch returns — it degrades to the old behaviour rather than breaking.
Re-check on any `@nuxtjs/i18n` major/minor bump. v10.6 adds a
`usesRuntimeLoaders()` branch to `loadMessages` that may make this unnecessary.

---

## ADR-024 — CMS-authored copy rides in the site-config document (`content` group)

**Status:** Accepted (2026-08-12)

**Context.** The deposit modal's bank-account card needed CMS-managed copy (the
"Deposit Rule"). The existing precedent for CMS bodies is the post-login notice:
its HTML lives in its own `cmsUserNotice` table behind `GET/PATCH /cms/user-notice`
(monkey-admin-api), and the userpage reads it from a dedicated `/site/notice`
endpoint. Only its on/off flag lives in the theme document, at
`theme.noticeModal.enabled`.

Copying that shape here would have meant a new table, migration, controller,
routes, validator and cache invalidation — and, because the requirement also
asked for the value to be readable from site config, a second copy of the same
content in the theme document. Two sources of truth to keep in sync.

**Decision.** Store the body **only** in the site-config (theme) document, under
a new top-level group: `content.depositRule`. The admin writes it through
`useThemeEditor.saveCategory('depositRule', ['content.depositRule'])`, the same
overlay-and-PUT the notice's `enabled` flag already uses, so the styling
categories edited on the Userpage Theme page are untouched by the write.

A 7th group rather than a slot inside `theme.*`: the existing six hold styling
tokens, asset paths and SEO metadata. An editorial HTML body is none of those,
and burying prose in `theme.transactionmodal.*` would misrepresent that group.

**Consequences.**
- No backend work at all; no new endpoint. The userpage gets the rule with the
  config it already fetches during SSR.
- Rules are **hostname-scoped for free**, because the theme document is. The
  notice table is global (`scope: 'default'`) — the two surfaces differ here.
- The body is paid for on **every SSR page load for every visitor**, not just
  when the deposit modal opens. Keep bodies short; a long HTML document does not
  belong in this group.
- Propagation is subject to the config's cache layers (5s server memo, client
  localStorage warm-start, anon page cache), so a CMS edit is not instant.
- **Cross-repo coupling.** `content` must be declared identically in
  `monkey-user-t3/app/composables/useDefaultThemeConfig.ts` and
  `monkey-admin/app/theme-schema/site-config.ts`. `useSiteConfig()` silently
  ignores paths absent from the typed default, so drift shows up as a value that
  never appears, with no error on either side. Pinned by
  `tests/component/deposit-rule-config.spec.ts` here and
  `test/components/CmsDepositRulePage.spec.ts` in the admin.
- The body is untrusted HTML: render through `renderRichContent`
  (`app/composables/useTiptap.ts`), which sanitizes. Never interpolate raw.

**Alternatives rejected.** Own table + endpoint mirroring Notices (backend cost,
plus a second source of truth given the site-config requirement); a slot under
`theme.transactionmodal.*` (misplaces prose among styling tokens).
