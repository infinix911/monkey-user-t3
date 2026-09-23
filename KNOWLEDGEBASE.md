# KNOWLEDGEBASE.md — monkey-user-t3

> **Permanent repository encyclopedia.** Consult this BEFORE reading source code.
> Architecture and API access checked against the current working tree (2026-09-23). Older feature notes may still describe removed code; verify paths before using them.
> Responsibilities: this file = WHAT/WHERE/HOW. `DECISIONS.md` = WHY. `CLAUDE.md` = AI workflow. `MEMORY.md` = temporary notes.

> Togel and QRIS were removed (ADR-017). The active locales are `en` and `ko`,
> with `ko` as default and KRW as fallback currency.

> ⚠️ **PARTNER SECTION REMOVED (ADR-020).** The whole partner/affiliate section
> is gone: the nine `/partner*` pages, `app/components/partner/**`,
> `transaction/Partner{Deposit,Withdraw}Content.vue`, `usePartnerTheme.ts`,
> `partner.interface.ts`, `utils/partnerMenu.ts`, `theme.partner.*` tokens, the
> `pm-*`/`quick-*`/`partner-*` CSS block in `main.css`, `formatPartnerAmount()`,
> and the `partner*` i18n trees. `default.vue` no longer has an `isPartnerPage`
> branch and `AppHeader` no longer links to the partner dashboard.

---

## 1. Repository Overview

- **Purpose:** User-facing gaming platform frontend. `monkey-user-t3` uses one bundled design template ("Template3") with CMS-driven theming.
- **Stack:** Nuxt 4 client-rendered SPA (`ssr: false`, default Nitro preset `node-server`), Vue 3, TypeScript, Tailwind v4, Pinia, @nuxtjs/i18n (en/ko, `no_prefix`), vee-validate + zod, vue-sonner, AppDialog, @nuxt/image, nuxt-security, and Sentry.
- **Backend:** `../monkey-user-api` (Bun/Elysia). The browser calls its public sibling API origin directly for REST and WebSocket traffic (§4).
- **Build/run:** `nuxt.config.ts` defaults Nitro to `node-server`; production API URLs are derived in the browser from the current hostname. Local development uses `NUXT_PUBLIC_API_BASE`.
- **Size:** 13 page files, 78 component files, and 8 Pinia stores at this update; use `rg --files` for current counts.
- **Testing:** Playwright e2e specs in `tests/e2e/specs/` and Vitest component tests in `tests/component/`. Run the appropriate suite for the change.
- **Verification:** `npm run test:component && npm run typecheck && npm run build` is the local check for broader frontend changes.

### ⚠️ Legacy drift you must not trust

- The old 11-brand build-time selector (`NUXT_PUBLIC_SITE` / `__BUILD_SITE__`) was removed. Theme configuration comes from the CMS payload.
- `assets.navigation` "bundled-only exception" no longer exists — renamed `assets.navIcons`, merged normally.
- CMS theme endpoint is **`/site/config/theme`** (renamed from `/site/config/userpage`; the state key remains `"userPageConfig"`).
- Root `index.js`, `homepage.html`, `public/_headers` are dead Cloudflare-Workers-era artifacts. Several "Worker isolate" comments are stale — runtime is node-server.

---

## 2. Simplified Repository Tree

```
monkey-user-t3/
├── nuxt.config.ts            # ★★ ssr:false; routeRules (GAME_* CSR-only, immutable
│                             #   /_nuxt|/fonts|/_ipx), CSP (script-src https: — deliberate), i18n inline config,
│                             #   esbuild.drop console, sourcemap hidden
├── app/
│   ├── app.vue               # ★★ SPA boot: mounts fallback UI, then loads siteConfig and public CMS data,
│   │                         #   URL param handlers (telegram login/register, referral), document head, AppDialog mount
│   ├── pages/                # index, game categories, lobby games, activity, promotions, and game launch
│   ├── layouts/              # default.vue and game.vue
│   ├── components/           # ui/, layout/, navigation/, auth/, transaction/, game/, profile/, my-account/
│   ├── composables/          # useApi, useSiteConfig family, useDefaultThemeConfig, useFeatures, and others
│   ├── stores/               # auth, websocket, site, banner, ui, game-catalog, member records/inbox
│   ├── schemas/              # zod form factories and API response guards
│   ├── lib/                  # axios-client, siteConfig.ts (client fetcher),
│   │                         #   domain.ts (getApiBase/getWsApiUrl)
│   ├── utils/                # formatting, assets, localization, and other helpers
│   ├── middleware/auth.global.ts  # client guard (GAME_ routes; PROTECTED_PATHS currently empty)
│   ├── plugins/              # client session verification, store hydration, i18n, theme preview, and more
│   └── interfaces/ types/    # domain types; barrel interfaces/index.ts = single source of truth
├── i18n/locales/{en,ko}.json
├── tests/                    # e2e/ (Playwright specs + fixtures/api-mocks.ts), component/,
│                             #   hydration-check.mjs, duplicate-meta-check.mjs
└── public/                  # static assets and robots.txt
```

---

## 3. Architecture — request lifecycle

```
Browser ──HTML/assets──▶ Nuxt SPA host
  ├─ REST /api/* ──credentials:include──▶ https://uapi.<root-domain>/api
  └─ WebSocket /ws ──session cookie──▶ wss://uapi.<root-domain>/ws

Local development uses NUXT_PUBLIC_API_BASE and its corresponding ws(s) origin.
The browser mounts the bundled fallback UI, starts public CMS reads, applies
the theme and locale when available, and verifies the session after mount.
```

**One render mode:** `ssr: false` for anonymous and authenticated visitors. The old per-request SSR/SPA switch and Nitro API/WS proxies are absent from this tree.

**SPA boot (`app/app.vue`):** `onMounted` starts theme loading and, concurrently, custom scripts, site settings, carousel banners, and popup banners. Bundled theme defaults paint first. The theme fetch updates `useState('userPageConfig')`; locale comes from `ui_locale` or the site currency. URL parameter handlers cover Telegram login/register and referrals. `session-verify.client.ts` starts the session probe alongside theme loading and applies the member after configuration is ready.

---

## 4. Data access

**Rule: the browser calls the public sibling API directly through two sanctioned clients:**

| Client        | File                        | Use for                                        | Behavior                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------- | --------------------------- | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useApi()`    | `app/composables/useApi.ts` | page data and mutations                         | direct public API origin with `credentials:include`; **retry: 0** (money safety), 10s timeout, client 401 → one-shot logout latch (`sessionStorage.session_logged_out`, excludes `/auth/sign-in/username` **and credential-failure tokens — `lib/session-401.ts`, ADR-025**). `.validated<T>(zodSchema, req)` throws `ApiValidationError`. |
| `axiosClient` | `app/lib/axios-client.ts`   | client-side mutations / imperative store calls | direct public API origin with credentials; GET dedupe; idempotent-only retry; same 401 latch + `isCredentialFailure()` skip (parity comments mandate keeping both in sync).                                                                                                                       |

- `getApiBase()` in `app/lib/domain.ts` derives `https://uapi.<root-domain>/api` in production and uses `NUXT_PUBLIC_API_BASE` on localhost. `getWsApiUrl()` derives the matching WebSocket origin. The API owns CORS and session-cookie policy.
- Neither client adds a CSRF header. Mutations still carry the host-only `bn.session` cookie via browser credentials; see ADR-028 for the security tradeoff.
- Zod validates forms and selected API responses through `api.validated(...)`.

---

## 5. Authentication

- Session = host-only backend `bn.session` cookie sent to the public API with credentialed requests.
- **Client guard** (`app/middleware/auth.global.ts`): protects game-launch routes; `PROTECTED_PATHS` is currently empty. It calls `authStore.verifyUser()` (`GET /auth/get-session`) when needed. This guard is for navigation; API endpoints enforce authorization.
- **Auth store** (`app/stores/auth.ts`): user/wallet/level/bank state; `verifyUser()`, `logout()` (clears storage keys + site store). Wallet updated live by WS `wallet` events.
- **Session lifecycle plugin** (`app/plugins/session-verify.client.ts`): onNuxtReady verify → WS connect + fetchNotice; WS disconnect on tab-hide/`pagehide` (bfcache), reconnect on `pageshow persisted`.
- Telegram entry: `useLoginTokenHandler` (`?chatId&token`) and `useOfflineTelegramRegisterHandler` (`?offline=true…`) in app.vue.
- Pages with member data, such as `/activity`, handle anonymous state in the client.

---

## 6. Site config / theming (the CMS contract)

Resolution chain (verified, replaces the stale CLAUDE.md story):

1. **Bundled base:** `getDefaultThemeConfig()` in `app/composables/useDefaultThemeConfig.ts` (1477L) — the full typed `SiteConfig` tree: `identity, theme, assets, contact, integrations, content` (6 CMS tabs, ~40 sub-interfaces). There is no `seo` group — see SEO-REMOVAL-PLAN.md. `content` is CMS-authored *copy* rather than tokens/assets — `content.depositRule` and `content.footer` (HTML, rendered in the deposit modal's bank card). See ADR-024.
2. **CMS override:** `/site/config/theme` payload (hostname-scoped) in `useState('userPageConfig')`.
3. **Merge:** `useSiteConfig()` merges bundled defaults and CMS values. `app/app.vue` watches `userPageConfig` and synchronizes the effective config, so consumers update when a fresh theme arrives. Wrong CMS paths are silently ignored.
4. `app/lib/siteConfig.ts` can warm-start from client localStorage (`themeConfig.v2:<hostname>`) while refreshing from the API. Preview mode `?themePreview=1` bypasses the normal cache and updates through `theme-preview.client.ts`.

- Full field map: the typed `SiteConfig` interface in `app/composables/useDefaultThemeConfig.ts` is the authoritative contract (the standalone CMS field-map docs were removed). Transaction-modal tokens: `ThemeTransactionModalConfig` at `theme.transactionmodal.*`.
- Layout variants are config-driven: `theme.nav.type` (`png`|`gif`) → `useNavSkin()` registry picks NavGlyph mode + transaction panel component.
- `useFeatures()` supplies the payments feature flag.
- **Add a brand-config field:** typed field + default in `useDefaultThemeConfig.ts` → consume via `useSiteConfig().<group>.<field>`. Nothing else to wire (the interface JSDoc is the field documentation).
- **New tenant/brand:** configure the public sibling `uapi` host and API CORS/cookie settings, author theme data in the CMS, and upload assets to the CDN.

---

## 7. Component library

- **ui/ primitives:** `AppDialog.vue` (singleton dialog renderer mounted once in app.vue; fire via `fireDialog()`/`showSwalAlert()` wrappers) and `UiTimePicker.vue`. Components style themselves with Tailwind and site-config tokens.
- **Shell:** `layout/AppHeader.vue` (dual desktop/mobile DOM; the desktop authenticated account bar is a single flat `#262626` bar — username / wallet / points / swap / refresh / bell — with its art from `assets.navIcons.{walletIcon,pointIcon,swapIcon,refreshIcon,bellIcon}` and the Korean suffixes from `header.honorific` + `header.walletUnit`), `layout/AppSidebar.vue` (lg+ left rail: deposit/withdraw, game categories, account entries; `theme.sidebar` — `borderColor`/`bg`/`divider`/`activeItemColor`/`hoverBg`, all five editable in the admin Theme Editor's "Sidebar" tab — plus `assets.sidebarIcons`; ADR-021), `navigation/Navbar.vue` (hosts Deposit/Withdrawal modals; `desktop` prop off in the two-column layout), `layout/BottomNav.vue` (mobile, container-query sized), `layout/AppFooter.vue`, `layout/GamePageLayout.vue` (wraps every game-grid page). Header height via pre-paint CSS vars (`--mh-header-height`) set by an inline head script.
- **Pinned-bar stacking contract (below `lg`):** several bars pin under the header at once, and body's `overflow-x` disables real `position: sticky` there, so each uses a JS `fixed` + flow-spacer. They stack via two `<html>` CSS vars: `--mh-header-height` (header) and `--mh-userbar-height` (`layouts/default.vue`, = `MobileUserBar`'s height while pinned, `0px` otherwise / for guests / at `lg+`). **Anything pinning below the user bar — inside the layout or inside a page — must position at `calc(var(--mh-header-height, 60px) + var(--mh-userbar-height, 0px))` and use the same expression as its scroll threshold.** Consumers: the layout's `Navbar` (reads the refs directly, same value) and `pages/slot-rtp.vue`'s provider strip (`STICKY_TOP` / `stickyTopPx()`, its only channel to the layout's pin state). Pin at the bare header height instead and the bar lands on top of the user bar on mobile.
- **Auth:** `auth/LoginModal.vue` (canonical form pattern), `SignupModal.vue` + `useSignupForm.ts`, `auth/FormField.vue` = the de-facto dark input primitive.
- **Transactions:** `DepositModal.vue` shell + `useDepositModal.ts` + `BankPaymentContent`/`useBankPayment.ts` (money-in logic); `WithdrawalContent.vue` (money-out). Shared chrome: `.tm-modal`/`.modal-gradient-border` classes + `theme.transactionmodal` CSS vars.
- **Themed surfaces (one palette):** `useModalTheme()` turns `theme.transactionmodal` into the `--tm-*` var bundle; hosts (rail panel, profile modal, each standalone modal) spread it and descendants style themselves with the `.tm-*` classes in `main.css` (`tm-card/field/thead/row/btn/btn-ghost/muted/accent-text/accent-bar/bubble-self/line/scroll`). Retheming deposit/withdraw in the CMS rethemes every account panel and modal. Do not hardcode surface greys.
- **Game catalog:** `HotGameCard.vue` (standard tile), `LobbyCard.vue` (provider tile + launch quirks), `SubGames.vue` (grid; ⚠ contains an inline copy of PaginationBar). Sub-game names resolve through `utils/localized-game-name.ts`: Korean uses `game_name_ko` with an English fallback; every other locale uses `game_name_en`.
- **Shared top-level:** `PaginationBar` (windowed), `TrimmedImage` (canvas alpha-crop w/ bbox cache), `UserBalancePill` (class-prop styling API; ⚠ no consumers since the header account bar was flattened), `NoticeSection` (post-login mandatory notice, Tiptap-rendered).
- **Conventions:** `<script setup lang="ts">`, typed `defineProps`/tuple `defineEmits`, `withDefaults`; co-located `useXxx.ts` composable when logic >~150 lines (useDepositModal, useProfileMenu precedent); heavy modals = `defineAsyncComponent` + uiStore flag + mounted-latch for close animations; dual mobile/desktop DOM trees (`hidden lg:block`/`lg:hidden`); flat component namespace (`pathPrefix:false`).
- **Toasts** = `useToast()` (vue-sonner). **Dialogs** = `showSwalAlert/showErrorAlert/...` from `utils/swal-alert.ts` → in-house queue. Do not import sweetalert2 (not installed).

---

## 8. State management

| Mechanism                                   | Use                                                                                                                           | Instances                                                                                                                                                                                                                                                                                           |
| ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useState`                                  | SPA-wide reactive configuration (`userPageConfig`, `siteConfigError`, `siteConfigBootstrapReady`) | app.vue / composables |
| Pinia (setup stores, no persistence plugin) | interactive session and CMS state | `auth`, `websocket` (cookie-authenticated direct API `/ws`), `site`, `banner`, `ui`, `member-records`, `member-inbox`, `game-catalog` |
| sessionStorage/localStorage                 | `session_logged_out` latch, notice preferences, `themeConfig.v2` warm-start, recently played games | client plugins and composables |

Money logic never lives in stores — mutations go through `useApi`/`axios-client` with `retry: 0`.

**`member-records` (memory-only history cache).** `app/stores/member-records.ts` backs every member-history panel (Activity, LoginHistory, TransactionLogs, TransactionHistory, BettingReport, Referral). One generic `load(key, collection, fetcher, force)` holds a `CachedEntry<T>` (`data`/`status`/`error`/`fetchedAt`) per complete query — key built by `keyOf(prefix, params)`, params sorted alphabetically and URL-encoded. It short-circuits on a `success` entry, dedupes concurrent calls through an `inFlight` map, and is cleared on logout by `app/plugins/member-store-lifecycle.client.ts` (never persisted — a previous member's financial records must not survive a session). **Invariant: `load()` seeds a missing entry and then re-reads it out of the collection before mutating it. Never keep the value of `collection[key] ??= entry()` — that expression yields the raw object, and mutating it bypasses the reactive proxy, stranding every `computed` that already read the entry (ADR-027).** Consumers read `store.<collection>[key]` through a computed and derive their own `loading`, so a missing entry reads as loading — which is why a write that never lands under the computed key is indistinguishable from a request still in flight.

---

## 9. i18n

2 locales en/ko (id/th removed with ADR-017); default `ko`; `strategy: no_prefix`, `detectBrowserLanguage: false` — language = deployment currency (KRW→ko; default/missing→ko), overridable via `ui_locale` cookie (English opt-in via header dropdown). Flat files `i18n/locales/{en,ko}.json`. Adding strings = edit BOTH files. `fallbackLocale` stays `en`. Default currency = **KRW** (`FALLBACK` in `site-currency.ts`/`useSiteCurrency.ts`). Zod messages: locale-reactive schema factories re-created on locale change.

**API server messages (error + success):** the API returns `{ message: "<UPPER_SNAKE_CODE>" }` (custom controllers) or `{ code: "<CODE>", message: "prose" }` (Better Auth) on both errors and mutation successes. Translate them via `useApiMessage()` (`app/composables/useApiMessage.ts`) → `apiMessage(source, namespace?, fallbackKey?)` (`source` = the caught error or a raw token string). It resolves the code and looks up the per-feature `<namespace>.apiMessages` map first (back-compat), then the global **`apiMessages`** catalog, and only returns a **generic** message (`apiMessages.INTERNAL_ERROR` / `common.error` / an explicit `fallbackKey`) when there is **no translation for the code anywhere** — a raw token is never shown to a member. Every API code has an entry in the global `apiMessages` namespace (both locale files) and a row in **`VALIDATIONERRORS.md`** (the canonical catalog); adding/renaming an API code means updating the API, that catalog, and both locale files. Older per-feature `<feature>.apiMessages` maps and the launch page's `blockMessages` predate this and can migrate onto the global catalog over time.

---

## 10. Common Implementation Recipes

**Add a public page:** `app/pages/<name>.vue` → `useApi()` + `useAsyncData("<unique-key>", …)` (dynamic key fn if params vary) → `useHead({ title: () => `${t("…")} — ${siteConfig.identity.siteName}` })` for the browser-tab title → strings in BOTH locale JSONs. No crawler metadata: the app is `ssr: false` and `robots.txt` disallows everything (see SEO-REMOVAL-PLAN.md).

**Add a protected page:** add its path to `PROTECTED_PATHS` in `app/middleware/auth.global.ts` and enforce authorization in the API endpoint. Every page renders as SPA.

**Add a form:** schema factory in `app/schemas/*.schema.ts` → `useForm({validationSchema: computed(() => { void locale.value; return schema(t); })})` → fields via `auth/FormField.vue` → `handleSubmit` → `useApi()` POST → `const apiMessage = useApiMessage()` → success `useToast(apiMessage(token, ns))`, failure → `showErrorAlert(apiMessage(err, ns, fallbackKey))` (translate-by-code: per-feature map → global `apiMessages` catalog → generic only when the code has no translation anywhere — see `VALIDATIONERRORS.md`). Big form → extract `useMyForm.ts`.

**Add a game-launch block code:** the backend returns UPPER_SNAKE `message` tokens from `GET /api/games/launch`; the CSR launch page `app/pages/[game_type]/[game_id].vue` maps known ones in its `blockMessages` record to a localized string and shows `common.gameError` for anything unmapped (raw tokens are never surfaced). To surface a new block, add the token → `t("common.<key>")` to `blockMessages` and the string to BOTH locale JSONs. Example: `GAME_LAUNCH_UNAVAILABLE` (member wallet exceeds the site's launch cover) maps to `common.gameUnavailableContactAdmin`; keep such messages generic and never expose the backend cover source to the member.

**Add a modal:** confirmation → `showSwalAlert()` (don't build one). Feature modal → Teleport + `Transition name="modal"` + uiStore flag + `defineAsyncComponent` at trigger site; reuse `.tm-modal` chrome for transaction-style.

**Add an API endpoint:** implement it in `monkey-user-api` and call it through `useApi()` or `axiosClient`. There is no frontend `/api/*` proxy.

---

## 11. File Reading Map

| Task                              | Read ONLY                                                                                                                                  | Do NOT read                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------- |
| API fetching / page data          | `composables/useApi.ts`, `lib/domain.ts`, target page                                                                                      | components, stores           |
| API origin / cookies / CORS       | `lib/domain.ts`, `composables/useApi.ts`, `lib/axios-client.ts`; API CORS and cookie configuration in `monkey-user-api`                  | pages                        |
| Auth / login flow                 | `stores/auth.ts`, `auth/LoginModal.vue`, `plugins/session-verify.client.ts`, `app/middleware/auth.global.ts`                            | transactions                 |
| Theming / brand config            | `composables/useSiteConfig.ts`, `useDefaultThemeConfig.ts`, `lib/siteConfig.ts`                                                            | components until field known |
| Deposit/withdraw UI               | `transaction/DepositModal.vue`, `useDepositModal.ts`, `useBankPayment.ts`, `WithdrawalContent.vue`, `schemas/transaction.schema.ts`        | —                            |
| Theme warm-start                 | `lib/siteConfig.ts`, `composables/useSiteConfig.ts`, `app.vue`                                                                              | app code                     |
| WebSocket / live wallet           | `stores/websocket.ts`, `plugins/session-verify.client.ts`, `lib/domain.ts`                                                                | rest                         |
| Document head / admin footer      | `layouts/default.vue` (renders `content.footer`), app.vue head block (title, favicon, custom scripts)                                          | components                   |
| i18n                              | `i18n/locales/*.json`, nuxt.config i18n block, app.vue locale resolution                                                                   | —                            |
| Build/deploy                      | `nuxt.config.ts`, `.env.example`, package scripts                                                                                             | src                          |
| Banners (carousel)                | `composables/useBanners.ts`, `stores/banner.ts`, `utils/pageBanner.ts`, `banner/BannerPreview.vue`                                          | popup banner files           |
| E2E / tests                       | `playwright.config.ts`, `tests/e2e/fixtures/api-mocks.ts`, `vitest.config.ts`                                                              | —                            |
| Game-card provider logos          | `utils/gameProviderLogo.ts`, `data/gameProviderLogos.json`, `game/HomeGameCard.vue`, `utils/homepageLobbyAssets.ts`                        | the logo `.webp` files       |

## 12. AI Edit Map (features → edit / avoid)

- **New page:** edit `app/pages/` and both locales. Update the client route guard if protected.
- **Theme/config field:** edit `useDefaultThemeConfig.ts` + consumer. Avoid hardcoding hex (check for an existing token first).
- **Provider logo on a game card:** `getLogoImages(providerCode)` (`app/utils/gameProviderLogo.ts`) resolves `public/designs/game-logo/<Display Name>.webp` via the code→name table in `app/data/gameProviderLogos.json`. One asset serves every code a provider has (slug per game type + numeric ids). To add a provider: add the entry to the JSON **and** drop in a `.webp` named exactly like `name` (case-sensitive — prod serves from Linux). Returns `""` for unmapped codes; `HomeGameCard` then falls back to the lobby-UUID-named `game.logo` (`lobbyLogoUrl`, the older `/designs/{casino,slot,sport}-logo` scheme still used by /sports), then to the provider name as text.
- **Modal/nav shell:** edit AppHeader/Navbar/BottomNav + uiStore. Watch outside-click attribute conventions (`data-hamburger-menu`, `[data-lang-selector]`) and Teleport-to-body for anything inside overflow-hidden shells.
- **API behavior:** update the sibling API and review CORS, cookies, and the browser client together.

---

## 13. Search Index

| Want                    | Search                                                 |
| ----------------------- | ------------------------------------------------------ |
| API base / WebSocket origin | `getApiBase`, `getWsApiUrl`, `NUXT_PUBLIC_API_BASE` |
| Session/auth verify     | `verifyUser`, `bn.session`, `session_logged_out`       |
| Site config merge       | `deepMerge`, `userPageConfig`, `getDefaultThemeConfig` |
| Feature flags           | `useFeatures`, `getFeatures`                           |
| Dialogs                 | `fireDialog`, `showSwalAlert`                          |
| Wallet updates          | `updateUser`, `"wallet"` (WS event)                    |
| Theme cache             | `themeConfig.v2`, `fetchSiteConfig`                    |
| Render mode             | `ssr: false`, `spaLoadingTemplate`                     |
| CMS scripts             | `useCustomScripts`, `custom-scripts`                   |
| Nav skin                | `useNavSkin`, `theme.nav.type`                         |

---

## 14. Change Impact Matrix

| If you change                        | Also review                                                          | Risk                       |
| ------------------------------------ | -------------------------------------------------------------------- | -------------------------- |
| `useApi.ts` 401 logic                | `axios-client.ts` (mandated parity), `session_logged_out` consumers, `lib/session-401.ts` token list (contract with monkey-user-api) | HIGH                       |
| `useDefaultThemeConfig.ts` interface | CMS payload contract (admin repo)                                    | HIGH — silent-ignore merge |
| `app/middleware/auth.global.ts`      | game-launch routing, API authorization behavior                     | HIGH                       |
| nuxt.config CSP/routeRules           | game-provider pixels, IPX rate-limit exemption, admin preview iframe | MED                        |
| Locale JSONs                         | both `en.json` and `ko.json`                                         | LOW                        |
| Public API base / credentials        | CORS origins, `bn.session` attributes, WebSocket URL symmetry         | HIGH                       |

---

## 15. Performance Notes

- The SPA paints bundled fallback UI before public CMS requests settle; keep the initial path light.
- `spaLoadingTemplate: false` avoids Nuxt's built-in loading splash; the page's own background paints until Vue mounts.
- Homepage LCP: preconnects to Linode CDN + game-thumbnail host; footer marquee logos MUST stay `loading="eager"` (lazy broke animation — commit 40fbd3c); IntersectionObserver reveal is the mitigation.
- Game payloads retain both English and Korean names so the language selector can update cards without refetching; `/_ipx/**` has rate limiting disabled (50+ transforms/page).
- Perf e2e: `test:e2e:perf` throttled-network spec against live prod (`PERF_BASE_URL`).

## 16. Debugging Guide

| Symptom                           | Look first                                                                                                                                                                                                                                  |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Login state flashes / reload loop | `session_logged_out` latch in useApi/axios; `login-blink.spec.ts`. **Reload on a wrong withdrawal/current password → `lib/session-401.ts` (ADR-025); a 401 token missing from `CREDENTIAL_FAILURE_TOKENS` reloads instead of showing the dialog.**                                                                                                                                                                           |
| Theme stale after reload          | `themeConfig.v2` warm-start and the API refresh in `siteConfig.ts`                                                                                                                                                                           |
| Blank first paint                 | SPA bootstrap and client asset/network errors; inspect `app.vue` and the browser console                                                                                                                                                    |
| Theme field ignored               | wrong CMS path (silent ignore) — verify against `useDefaultThemeConfig.ts` interface                                                                                                                                                        |
| No console output in prod         | `esbuild.drop` strips console.*; use Sentry or `process.stderr.write`                                                                                                                                                                       |
| WS won't connect                  | `getWsApiUrl()` and direct API `/ws` cookie/origin handling                                                                                                                                                                                   |
| First-paint layout shift          | pre-paint CSS vars and client theme loading in `app.vue`                                                                                                                                                                                    |
| Duplicate meta tags               | unhead dedup quirk — do NOT add `key:` to singleton metas (app.vue comment)                                                                                                                                                                 |
| History panel spins forever, renders on reopen | `member-records` `load()` — the entry must be re-read from the collection before mutation, or the writes miss the reactive proxy (ADR-027). Next suspect: the consumer's hand-built key not matching `keyOf()`, which leaves the entry `undefined` and `loading` latched true. |

---

## 17. Anti-Patterns (NEVER do)

- Call the API directly from pages/components outside `useApi()` or `axiosClient`.
- Retry mutations (both clients set retry rules deliberately — money safety).
- Reintroduce a browser-readable CSRF cookie/header without an API contract change (ADR-028).
- Mount a second AppDialog; import sweetalert2.
- Add `key:` to singleton meta tags.
- Assume the frontend host receives the API's host-only `bn.session` cookie.
- Hardcode hex colors when a `theme.*` token exists.
- Re-add lazy-loading to footer marquee logos.
- Trust retired build-time brand settings (see §1 drift box).
- Hold the value of `obj[key] ??= …` (or `||=`/`&&=`) on a `reactive`/`ref` collection and then mutate it — that is the raw object, not the proxy, and the mutations are invisible to Vue (ADR-027).
- Let a rejected fetch render as a loading or empty state — a panel whose entry is `error` must say so.

## 18. Generated / dead files

- Generated: `.nuxt/**`, `.output/**`, `slotLogoCrop.ts` (auto-generated crops), `layout/footerLogos.ts` (curated/generated lists).
- Dead but tracked: root `index.js`, `homepage.html`, `public/_headers`, `composables/useThemeDoc.ts` (dormant, restore instructions in app.vue), `package-lock.json` (bun.lock is authoritative for Docker).

## 19. High-Risk Areas

1. Deposit/withdraw flow (`useBankPayment.ts`, `WithdrawalContent.vue`).
2. Direct API origin, CORS allowlist, and session-cookie attributes (session integrity).
3. Session verification and the client navigation guard.
4. CSP / custom-scripts injection (trusted-admin model).
5. `useSiteConfig` merge contract with the admin CMS.

## 20. Future Reading Strategy

Every session: `CLAUDE.md` → `MEMORY.md` → this file → `DECISIONS.md` → only the files the File Reading Map (§11) lists for your task. Re-scan the repo only if architecture/folders materially changed, this file is demonstrably stale, or the user asks for an audit.
