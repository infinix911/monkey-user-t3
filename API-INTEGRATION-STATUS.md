# monkey-user-t3 — API Integration Status

Progress tracker for connecting the Nuxt frontend to `monkey-user-api`.
Companion to `API-INTEGRATION-PLAN.md` (the roadmap). Last updated 2026-07-18
(synced to backend `b900f35`).

**Legend:** ✅ done · ⚠️ done, frontend follow-up needed · 🚫 blocked (no backend) · ⏳ available, not yet integrated

## ⚡ Backend sync (pulled 2026-07-18, backend `b900f35`) — integrated ✅

Three backend commits landed; all three are now handled on the frontend:

1. **`bda4ce2` — deposit no longer needs `accountId`.** ✅ Removed `accountId`
   from the deposit body in `useBankPayment.ts` (now `{ amount, receiptImage? }`).
   **The old bank-account blocker is resolved.** The static bank in
   `useDepositModal.ts` is now display-only (the account is derived server-side).
2. **`fadc6ad` — "Normalize user API response casing."** ✅ Responses stay
   camelCase (mappers hold); removed the dropped `fee`/`rewardAmount`/`netAmount`
   from `walletTransactionWireSchema`.
3. **`b900f35` — new Points module** (`/api/points`). ✅ `POST /points/exchange`
   wired into `PointConversionModal` (real API + re-verify instead of the old
   optimistic update). History (`GET /points/exchanges`) schema/mapper ready in
   `points.interface.ts` — no UI consumer yet.

**Pattern used everywhere:** each module has a zod wire schema in
`app/interfaces/*.interface.ts`, is validated at the fetch boundary via
`validateResponse()` / `useApi().validated()`, and mapped through a shared
mapper. Backend (camelCase) is the source of truth.

---

## Summary

| Phase | Module                                                              | Status                                     |
| ----- | ------------------------------------------------------------------- | ------------------------------------------ |
| 0     | Foundations (camelCase types, runtime validation, auth-store remap) | ✅                                         |
| 1     | M1 Authentication                                                   | ✅ (live-tested)                           |
| 2     | M2 Site / theme / public content                                    | ✅                                         |
| 2     | M3 Games / lobbies / launch                                         | ✅ (live-verified shape)                   |
| 3     | M6 Transactions — history / activity (reads)                        | ✅                                         |
| 3     | M7 Inquiries                                                        | ✅                                         |
| 3     | M8 Notifications                                                    | ✅                                         |
| 3     | M9 Referrals / login history                                        | ✅                                         |
| 4     | M5 Withdrawal (write)                                               | ✅                                         |
| 4     | M4 Deposit (write)                                                  | ✅ (`accountId` removed; blocker resolved) |
| —     | Points — exchange                                                   | ✅ (`PointConversionModal`)                |
| —     | Points — exchange history                                           | ⏳ schema ready, no UI consumer            |
| 5     | M11 Promotions                                                      | 🚫 no backend                              |
| 5     | M12 Partner section                                                 | 🚫 no backend                              |

---

## Endpoint-level status

### ✅ Auth — `/api/auth`

| Endpoint                                  | Status | Notes                                                            |
| ----------------------------------------- | ------ | ---------------------------------------------------------------- |
| POST `/login`                             | ✅     | `{username,password}`; client limits aligned (≤12 / ≤20)         |
| POST `/register`                          | ✅     | camelCase, dropped `currency`; static bank-name list             |
| POST `/change-password`                   | ✅     | `currentPassword`/`newPassword`                                  |
| POST `/check/username`, `/check/referral` | ✅     | already matched                                                  |
| GET `/v`                                  | ✅     | camelCase, **runtime-validated** (zod), mapped to internal state |
| POST `/logout`, GET `/ws`                 | ✅     | unchanged (already correct)                                      |
| GET `/referrals`                          | ✅     | camelCase mapper; list keyed by index                            |
| GET `/login-histories`                    | ✅     | `startDate`/`endDate`; camelCase mapper                          |

### ✅ Site — `/api/site`

| Endpoint                                              | Status | Notes                                             |
| ----------------------------------------------------- | ------ | ------------------------------------------------- |
| GET `/config/theme`, `/config/userpage`               | ✅     | already powers the app (config deep-merge)        |
| GET `/config/userpage/faq`, `/levelSystem`            | ✅     | JSONB rows (`t.Unknown()`) — flexible             |
| GET `/banners-new/:type`                              | ✅     | **fixed** camelCase (`mainUrl`→`main_url`) mapper |
| GET `/top/winners`,`/top/deposits`,`/top/withdrawals` | ✅     | `{member,amount}` — already correct               |
| GET `/custom-seo`                                     | ✅     | consumed via config merge (`.canonical`)          |

### ✅ Games — `/api/games`

| Endpoint       | Status | Notes                                                                   |
| -------------- | ------ | ----------------------------------------------------------------------- |
| GET `/lobbies` | ✅     | `gameType` param; camelCase→normalized (lowercased enum) mapper         |
| GET `/` (list) | ✅     | `gameType`/`lobbyId`/`gameName` params; `meta.total` pagination; mapper |
| GET `/launch`  | ✅     | `{lobby}`/`{lobby,game}` params already matched                         |

### ✅ Transactions (reads) — `/api/transactions`

| Endpoint                                       | Status | Notes                                                                                                                  |
| ---------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------- |
| GET `/wallet/:transaction`                     | ✅     | `startDate`/`endDate`; camelCase→snake mapper; schema trimmed to drop backend-removed `fee`/`rewardAmount`/`netAmount` |
| GET `/activity/:category`                      | ✅     | `{data,meta}`→`{rows,pages,data}`; camelCase mapper                                                                    |
| GET `/logs`, `/roll-requirement`, `/pending-*` | ⏳     | contracts known; not currently consumed by UI                                                                          |

### ✅ Inquiries — `/api/inquiries`

| Endpoint                                       | Status | Notes                                                           |
| ---------------------------------------------- | ------ | --------------------------------------------------------------- |
| GET `/` (list)                                 | ✅     | `startDate`/`endDate`; `{data,meta}`→`{pages,rows,data}` mapper |
| GET `/:id/replies`                             | ✅     | `{data,meta}`→`{has_more,...}` mapper                           |
| POST `/`, POST `/:id/reply`, PATCH `/:id/read` | ✅     | bodies already matched                                          |
| PATCH `/:id`, PATCH `/` (status)               | ✅     | body `{status}` (send `'close'`/`'delete'`)                     |

### ✅ Notifications — `/api/notifications`

| Endpoint               | Status | Notes                                       |
| ---------------------- | ------ | ------------------------------------------- |
| GET `/`                | ✅     | camelCase mapper; `is_read` defaulted false |
| PATCH `/read-all`      | ✅     | already correct                             |
| PATCH `/read/:notifId` | ⏳     | available; dropdown only uses read-all      |

### Transactions (writes) — `/api/transactions`

| Endpoint                       | Status | Notes                                                                         |
| ------------------------------ | ------ | ----------------------------------------------------------------------------- |
| POST `/withdrawal`             | ✅     | `{amount:number}` — already correct                                           |
| POST `/deposit`                | ✅     | body `{amount, receiptImage?}` (backend dropped `accountId`); voucher removed |
| POST `/deposit/upload-receipt` | ✅     | two-step upload; reads `{url}`                                                |

### Points — `/api/points` (new backend)

| Endpoint         | Status | Notes                                                                                                                |
| ---------------- | ------ | -------------------------------------------------------------------------------------------------------------------- |
| POST `/exchange` | ✅     | body `{amount:number(min 1)}` → `{message}`. Wired in `PointConversionModal.vue` (real API + `verifyUser()` refresh) |
| GET `/exchanges` | ⏳     | schema/mapper ready in `points.interface.ts`; no history UI consumer yet                                             |

### 🚫 No backend (blocked)

| Frontend area                   | Missing backend                               |
| ------------------------------- | --------------------------------------------- |
| Deposit voucher / member levels | `/promotions/*` (fetch removed, UI hidden)    |
| Signup bank list                | `/banks/register` (replaced with static list) |
| Partner section (all pages)     | `/partner/*` (stays mock)                     |

---

## Frontend follow-ups (from the 2026-07-18 backend sync)

1. ✅ **Deposit** — removed `accountId` from the deposit body in `useBankPayment.ts`.
2. ✅ **Wallet history** — removed `fee`/`rewardAmount`/`netAmount` from
   `walletTransactionWireSchema`.
3. ✅ **Points** — `POST /points/exchange` wired in `PointConversionModal.vue`;
   history schema/mapper ready in `points.interface.ts` (no UI consumer yet).

## Still blocked (no backend)

- **🚫 Promotions (M11) & Partner (M12)** — no backend exists. UI stays
  mock/hidden pending new endpoints (product decision).

## New files added by the integration

- `app/lib/validateResponse.ts` — shared runtime validator (throws `ApiValidationError`)
- `app/interfaces/auth.interface.ts` — `/auth/get-session`, login-history, referrals
- `app/interfaces/game.interface.ts` — lobbies + games list (schemas/mappers appended)
- `app/interfaces/notification.interface.ts`
- `app/interfaces/inquiry.interface.ts` (schemas/mappers appended)
- `app/interfaces/transaction.interface.ts`
- `app/interfaces/site.interface.ts` — carousel banners
- `app/interfaces/points.interface.ts` — point exchange + history

## Verification

- **Live-tested against the running backend:** auth (login → `/auth/get-session`), games list/lobbies (real seed data).
- **Verified against backend validators + typecheck:** all other modules. Typecheck sits at the pre-existing baseline (theme-config errors only) — zero new errors from the integration.
- **Backend fix applied during testing:** `monkey-user-api/src/lib/auth.ts` `generateId: false` → `() => crypto.randomUUID()` (login `session` insert was 500ing). See git history.
