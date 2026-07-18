# monkey-user-t3 → monkey-user-api — Integration Roadmap

Analysis + step-by-step plan to connect the `monkey-user-t3` Nuxt frontend to the
`monkey-user-api` backend. **Backend is the source of truth**; the frontend adapts
to its contracts. No backend changes. Generated 2026-07-18.

> Source docs analyzed: `monkey-user-api/API-STATUS.md`, backend validators
> (`src/validators/*`) and live responses, plus the full `monkey-user-t3` app
> (`useApi`, `axios-client`, Pinia stores, schemas, pages, components).

---

## 0. Executive Summary

The frontend was originally built against the Indonesian **banana-user-api**, so it
speaks a different dialect than `monkey-user-api`. Three systemic gaps dominate the
work; fix these **before** any per-page wiring:

| # | Finding | Impact | Severity |
|---|---|---|---|
| A | **Wire casing mismatch** — backend is **camelCase** (`bankName`, `pointWallet`, `accountId`, `gameType`); frontend consumes **snake_case** (`bank_name`, `point_wallet`, `account_id`, `game_type`). | Every request payload + response mapping | 🔴 Blocker |
| B | **Enum value casing** — backend returns **UPPERCASE** game types (`"CASINO"`, `"SLOT"`); frontend keys on lowercase. | Games/lobbies/bet filtering | 🟠 High |
| C | **Whole domains have no backend** — `/partner/*`, `/promotions/*`, `/banks/*` do **not** exist in `monkey-user-api`. | Partner section, promotions page, deposit voucher, bank-account list | 🔴 Blocker (scope) |

Secondary: deposit payload carries an unsupported `voucher_issue_id`; deposit needs
a valid `adminBankAccounts` UUID but **no endpoint lists them**; withdrawal needs
only `{amount}` (bank comes from the member profile); the DB is **not seeded**
(empty arrays), so integration testing needs fixture data first.

**Recommended casing strategy (decision required):**
- **Option 1 (recommended):** adopt camelCase response/request types per feature and
  map explicitly in each service/store. Safest for money paths; makes drift visible.
- **Option 2:** a global camelize/​decamelize transform at the `useApi`/`axios-client`
  boundary. Fastest, but hides contract drift and is risky on money fields — if used,
  **exclude** transaction/auth payloads and keep those explicit.

---

## 1. Current Architecture (frontend)

- **API layer:** `app/composables/useApi.ts` (isomorphic `$fetch`; SSR → `NUXT_API_URL`+cookie, client → `/api` proxy; CSRF echo; 401 auto-logout; optional `.validated<T>(zodSchema)`). Store mutations use `app/lib/axios-client.ts` (parity: CSRF + 401 latch). **Reuse both — do not add new clients.**
- **Proxy:** `server/routes/api/[...path].ts` forwards `/api/*` → `NUXT_API_URL`. Now configured (`.env` created).
- **State:** Pinia setup stores — `auth` (identity/wallet/bank/referral), `websocket` (`/auth/ws` token → WS), `site` (SSR settings/banks), `ui` (modals/device). No persistence plugin.
- **Validation:** vee-validate + zod in `app/schemas/*` (`auth`, `password`, `inquiry`, `transaction`).
- **Auth flow:** login/register via components → `useApi`; `authStore.verifyUser()` (`GET /auth/v` via axios-client) on load; WS connect after verify; 401 → resetUser + redirect.
- **Response validation helper:** `api.validated()` exists but is under-used; good hook for typed camelCase parsing.

## 2. Endpoint Inventory: Frontend Calls vs Backend

✅ backend exists · ⚠️ exists but contract mismatch · ❌ no backend

| Frontend call | Backend | Notes |
|---|---|---|
| `/auth/login`,`/register`,`/change-password`,`/logout`,`/v`,`/ws`,`/referrals`,`/check/username`,`/check/referral`,`/register-offline-telegram` | ✅ | ⚠️ casing + field/length mismatches |
| `/games`,`/games/lobbies`,`/games/launch` | ✅ | ⚠️ `game_type`→`gameType`; UPPERCASE enums |
| `/site/config/theme`,`/config/userpage/faq`,`/config/userpage/levelSystem`,`/custom-seo`,`/notice`,`/top/deposits`,`/top/withdrawals`,`/banners-new/:type` | ✅ | Working today (SSR site-config) |
| `/transactions/deposit`,`/withdrawal`,`/deposit/upload-receipt`,`/logs`,`/wallet/:transaction`,`/activity/:category` | ✅ | ⚠️ payload casing; deposit voucher/account issues |
| `/inquiries`,`/inquiries/:id`,`/:id/replies`,`/:id/reply`,`/:id/read` | ✅ | ⚠️ casing |
| `/notifications`,`/notifications/read-all`,`/read/:notifId` | ✅ | ⚠️ casing |
| `/banks/accounts`,`/banks/register` | ❌ | No `/banks` module. Register takes bank inline; deposit account list has no endpoint |
| `/promotions`,`/promotions/boards`,`/bonuses`,`/level-rewards`,`/levels`,`/vouchers` | ❌ | No `/promotions` module |
| `/partner/deposits`,`/withdrawals`,`/transactions`,`/member/tree`,`/my-deposits`,`/my-withdrawals`,`/deposit/:id`,`/withdrawal/:id` | ❌ | No `/partner` module at all |

**Backend endpoints not yet consumed:** `/auth/login-histories`, `/site/settings`, `/site/top/winners`, `/site/banners/:type`, `/site/config/userpage`, `/site/custom-scripts`, `/site/ip-domain`, `/transactions/roll-requirement`, `/transactions/pending-deposit`, `/transactions/pending-withdrawal`, `/telegram/*`.

---

## 3. Cross-Cutting Foundations (do first)

### F1 — Wire-casing & response mapping strategy 🔴
- **Change:** decide Option 1 vs 2 (see §0). Establish a per-feature `interfaces/*.ts` set of **camelCase** types matching backend validators; add `zod` response schemas and route money/auth reads through `api.validated()`.
- **Endpoints:** all.
- **Complexity:** High. **Blocker for everything below.**

### F2 — Auth store field remap 🔴
- **Current:** `stores/auth.ts` `verifyUser()` maps `result.bank_name`, `result.point_wallet`, `result.currency` (snake_case).
- **Backend `/auth/v`:** `{ id, upperId, depth, username, bankName, bankAccount, bankAccountName, phone, userType, wallet:string, pointWallet:string, ... }` — **camelCase, no `currency`**.
- **Change:** remap to camelCase; derive `currency` from `useSiteCurrency()` (backend doesn't send it); keep `wallet`/`pointWallet` as strings (money precision). Update `UserState` + `defaultUserState`.
- **State:** `auth` store. **UI:** none. **Complexity:** Medium.

### F3 — Response envelope & error tokens
- **Backend:** GET → raw data; mutations → `{ message: UPPER_SNAKE }` (localized client-side via `apiMessages`); validation → `{ message:"VALIDATION_ERROR" }` (400). Errors are UPPER_SNAKE keys.
- **Change:** confirm every consumer reads `message` tokens through i18n; ensure `api.validated` failures + 401 latch behavior are preserved. **Complexity:** Low.

### F4 — Seed/fixtures for testing
- Live `/site/settings`, `/top/*` return `[]` (empty DB). **Blocker for meaningful QA.** Coordinate seed data or a mock layer before verifying money flows. **Complexity:** Low (external dependency).

---

## 4. Module Plans

### M1 — Authentication & Session 🔴 (foundational)
- **Frontend now:** login/register components + `authStore` (axios-client for `/auth/v`,`/logout`); snake_case mapping; signup has `currency`+`mobile` fields; login username max 32.
- **Backend:** `POST /auth/login {username(1-12),password(1-20)}`; `POST /auth/register {username(5-12),email?,password(6-20),confirmPassword(4-20),phone(8-15),bankName,bankAccount,bankAccountName,referral?}`; `GET /auth/v` (camelCase, see F2); `POST /change-password`, `/logout`, `GET /ws`, `/referrals`, `POST /check/username`,`/check/referral`.
- **Required changes:** map signup `mobile`→`phone`, **drop `currency`** (or keep FE-only); align username min **4→5**; login username max **32→12**, password max **128→20**; register sends bank fields inline → **delete `/banks/register` call**; remove any snake_case bodies.
- **Payload mapping:** `{ mobile→phone, bank_account_name→bankAccountName, bank_account→bankAccount, bank_name→bankName }`; `confirmPassword` kept.
- **Response mapping:** `/auth/v` per F2.
- **Validation updates:** `schemas/auth.schema.ts` (username 5–12; login max 12/20; keep confirmPassword refine).
- **State:** `auth` store remap. **UI:** SignupModal (remove/hide currency field if backend-driven). **Blockers:** F1,F2. **Complexity:** Medium.

### M2 — Site Config / Theme / Public content ✅ (mostly done)
- **Frontend now:** SSR site-config (`lib/siteConfig.ts`), theme (`/site/config/theme`), faq/levelSystem/notice/custom-seo/top lists — already wired and working.
- **Required changes:** verify response fields against camelCase validators; adopt unused `/site/settings`,`/site/config/userpage`,`/site/custom-scripts`,`/site/ip-domain` where the UI needs them. Low risk.
- **Complexity:** Low.

### M3 — Games / Lobbies / Launch 🟠
- **Frontend now:** `/games` with params `{game_type, category}`; lobby pages; launch.
- **Backend:** `GET /games/lobbies?gameType`; `GET /games?gameType&category&lobbyId&lobby&gameName&page&limit`; `GET /games/launch` (🔒); bet-histories/reports 🔒. Responses camelCase, `gameType` **UPPERCASE**, `gameNameEn/gameNameKo`.
- **Required changes:** rename param `game_type`→`gameType`; normalize enum case (map UPPERCASE↔UI lowercase in one helper); map `gameNameEn/Ko` by locale; wire pagination (`page`,`limit`).
- **Payload/Response mapping:** query camelCase; response camelCase + enum-normalizer.
- **State:** lobby composables (`useLobbyPage`). **UI:** minimal. **Blockers:** F1,B. **Complexity:** Medium.

### M4 — Transactions: Deposit 🔴
- **Frontend now:** `BankPaymentContent`/`useBankPayment` POST `/transactions/deposit` `{ amount, voucher_issue_id, account_id, receipt_image }` (snake_case) + `/deposit/upload-receipt`; bank is now static; voucher from `/promotions/vouchers` (❌).
- **Backend:** `POST /transactions/deposit {amount:number(1..100M), accountId:uuid, receiptImage?:string|null}` → validates `accountId` against **active `adminBankAccounts`** (404 `BANK_ACCOUNT_NOT_FOUND` otherwise). Receipt upload returns `{url}`.
- **Required changes:** camelCase body; **remove `voucher_issue_id`** (no backend voucher support) — decouple voucher UI or hide it; supply a **real `accountId`**. ⚠️ **No endpoint lists admin bank accounts** → the static bank has no valid UUID → deposit will 404. **Blocker to resolve:** either (a) request a `GET /banks/accounts` (or embed accounts in `/site/settings`) from backend owners, or (b) hardcode a known seeded `adminBankAccounts.id` for now.
- **Payload mapping:** `{amount:Number, accountId, receiptImage:url}`.
- **Validation:** `schemas/transaction.schema.ts` deposit — drop `bankAccountId` requirement or repoint to real account; amount ≤ 100M.
- **State/UI:** `useBankPayment` (remove voucher/bonus math or gate it). **Blockers:** F1, C(banks), C(promotions/vouchers). **Complexity:** High.

### M5 — Transactions: Withdrawal 🟠
- **Frontend now:** `WithdrawalContent` POST `/transactions/withdrawal`; may include bank selection; amount step 10k.
- **Backend:** `POST /transactions/withdrawal {amount:number(1..50M)}` — **amount only**; bank taken from member profile.
- **Required changes:** send `{amount:Number}` only; **remove any bank fields**; keep client min/step rules but align max to 50M.
- **Validation:** `transaction.schema.ts` withdrawal — max 50M.
- **State/UI:** simplify WithdrawalContent (drop bank picker). **Blockers:** F1. **Complexity:** Low–Medium.

### M6 — Transactions: History / Activity / Logs 🟠
- **Frontend now:** `TransactionHistory` / `ActivityContent` call `/transactions/logs`, `/wallet/:transaction`, `/activity/:category` with client date-range calc.
- **Backend:** `GET /transactions/logs`, `/wallet/:transaction`, `/activity/:category`, `/roll-requirement`, `/pending-deposit`, `/pending-withdrawal` (all 🔒). camelCase; check query params (date/method/page/limit) against `getWalletTransactionsSchema`/`getActivitySchema`.
- **Required changes:** align query param names + casing; map camelCase rows; wire pagination/filter/sort to backend params (see §5). Adopt `pending-deposit`/`pending-withdrawal` to gate duplicate requests; `roll-requirement` for withdrawal eligibility.
- **State/UI:** reuse `DataTable.vue`. **Blockers:** F1. **Complexity:** Medium.

### M7 — Inquiries (1:1 support) 🟠
- **Frontend now:** `useInquiryMutations`, `useUnreadInquiries`, InquiryModal → `/inquiries*`.
- **Backend:** `GET /`,`/:id`,`/:id/replies`; `POST /`,`/:id/reply`; `PATCH /:id/read`,`/:id`,`/` (all 🔒). camelCase.
- **Required changes:** camelCase bodies/reads; align `inquiry.schema.ts`; confirm reply/read/list field names; pagination on list.
- **State/UI:** reuse existing modal/composables. **Blockers:** F1. **Complexity:** Low–Medium.

### M8 — Notifications 🟠
- **Frontend now:** websocket store + `/notifications`, `/read-all`.
- **Backend:** `GET /` (`{id,category,title,message,pagePath,createdAt}` camelCase, paginated query), `PATCH /read/:notifId`, `/read-all` (all 🔒).
- **Required changes:** map camelCase; wire `/read/:notifId` for single-read; pagination.
- **State/UI:** websocket/notification store. **Blockers:** F1. **Complexity:** Low.

### M9 — Referrals & Login History 🟢
- **Backend:** `GET /auth/referrals`, `GET /auth/login-histories` (🔒, camelCase).
- **Required changes:** wire `my-account` LoginHistory to `/auth/login-histories` (verify current source); map camelCase.
- **Complexity:** Low.

### M10 — Telegram entry flows 🟢
- **Backend:** `/auth/register-offline-telegram`, `/auth/telegram-offline-enter`, `/telegram/login-token`, `/telegram/offline-enter`.
- **Frontend:** `useLoginTokenHandler`, `useOfflineTelegramRegisterHandler` exist.
- **Required changes:** verify token param names/casing; low priority unless Telegram is in scope.
- **Complexity:** Low.

### M11 — Promotions ❌ (no backend)
- **Frontend now:** `promotions.vue` + deposit voucher call `/promotions/*`.
- **Backend:** none.
- **Options:** (a) keep static/mock and clearly mark as not-integrated; (b) request backend endpoints; (c) hide promotions UI until backend exists. **Decouple deposit from vouchers now** so M4 isn't blocked by this.
- **Complexity:** N/A (blocked) — decision required.

### M12 — Partner section ❌ (no backend)
- **Frontend now:** 8 partner pages + `PartnerDepositList/WithdrawalList/TransactionHistoryList` + member tree/modals, all **mock** and calling `/partner/*` that don't exist.
- **Backend:** none.
- **Options:** (a) leave as mock/dummy (current), flagged clearly; (b) request a partner API surface; (c) feature-flag the whole section off until backend exists. **Do not attempt integration** until endpoints exist.
- **Complexity:** N/A (blocked) — largest scope gap; needs product/backend decision.

---

## 5. Pagination / Filtering / Sorting
Backend list endpoints (games, wallet logs, activity, inquiries, notifications) accept
`page`/`limit` (+ endpoint-specific filters like date/method/category). Frontend
currently does client-side calc in places. **Standardize** a small `usePagedApi`
helper (query builder + camelCase params) and reuse across M3/M6/M7/M8 instead of
per-page logic. Confirm each endpoint's exact query atom names against its validator
before wiring.

## 6. Auth / File / Error Requirements
- **Auth:** 🔒 endpoints need `bn.session`; `useApi`/`axios-client` already send cookies + CSRF + 401 latch — **reuse, don't reinvent**. Anonymous first-load 401 on `/auth/v` is expected (already special-cased).
- **File:** deposit receipt is `multipart/form-data` → `/transactions/deposit/upload-receipt` returns `{url}`, then `receiptImage:url` on deposit. Keep the two-step flow. No download endpoints.
- **Errors:** map UPPER_SNAKE `message` tokens via i18n (`apiMessages.*`); surface `VALIDATION_ERROR` (400) inline.

## 7. Reuse Opportunities (avoid duplication)
- **Clients:** `useApi` (SSR/data) + `axios-client` (store mutations) — the only two allowed.
- **Validated reads:** `api.validated(zodSchema, …)` for typed camelCase parsing (money/auth).
- **Tables:** `DataTable.vue` (already generic) for logs/activity/history; partner uses its own `PartnerTable`.
- **Currency/format:** `useCurrency`, `lib/formatter.ts`, `lib/date.ts` — keep money as strings.
- **Modals/dialogs:** `showSwalAlert`/`fireDialog` (SweetAlert2 removed).

## 8. Risks & Inconsistencies to Resolve First
1. 🔴 **Casing** (A/B) — settle F1 strategy before any wiring.
2. 🔴 **Deposit account source** — no endpoint lists `adminBankAccounts`; deposit 404s without a valid UUID. Needs backend endpoint or a seeded id.
3. 🔴 **No `/promotions`, `/banks`, `/partner`** — decouple deposit from vouchers; decide mock-vs-hide-vs-request for promotions & partner.
4. 🟠 **Empty DB** — seed fixtures before QA of money flows.
5. 🟠 **Field/length divergence** (username 4↔5, login max 12↔32, withdrawal bank fields, register `currency`) — align FE schemas to backend.
6. 🟠 **`/auth/v` no `currency`** — derive from site currency, not the profile.
7. 🟢 **Port clash** — user-api and admin-api both default to :4000; run one at a time.
8. 🟢 **WS server lives in admin-api** (:4002) — notifications/wallet live updates need it running.

---

## 9. Prioritized Implementation Order

**Phase 0 — Foundations (blockers):**
1. F1 casing strategy + `interfaces/*` camelCase types (+ `api.validated` for money/auth).
2. F2 auth-store remap; F3 error-token audit; F4 seed/fixtures.

**Phase 1 — Auth core (M1):** login, register (drop `/banks/register`, map fields), `/auth/v`, logout, change-password, checks. Unblocks all 🔒 calls.

**Phase 2 — Read-only public (M2, M3):** site/theme verification; games/lobbies (param + enum normalize, pagination). Low money-risk, exercises casing pipeline.

**Phase 3 — Money reads (M6, M8, M9, M7):** transaction logs/activity/wallet, notifications, referrals/login-history, inquiries — all reuse the paged helper.

**Phase 4 — Money writes (M5 then M4):** withdrawal (simple `{amount}`) first; then deposit **after** resolving account-source + voucher-decouple.

**Phase 5 — Deferred/blocked (M11, M12, M10):** promotions & partner (mock/flag/await backend); telegram if in scope.

**Guiding rule:** never wire a money write (M4/M5) until F1/F2 and the deposit-account blocker are resolved; verify each phase against seeded data before proceeding.
