# monkey-user-t3 — API Integration Gaps

Audit of frontend API calls / functions that are **not yet integrated** with
`monkey-user-api`. Excludes the **partner** section (no backend — tracked
separately). Generated from a full scan of `app/**` on 2026-07-19.

Two kinds of gap:
- **🚫 No backend** — the endpoint doesn't exist in `monkey-user-api`; can't be
  integrated until the backend adds it (or the feature stays mock/static).
- **🔧 Not adapted** — the endpoint **exists**, but the frontend call still uses
  the old snake_case params / response shape, so it 400s or renders wrong.
  Fixable purely on the frontend (same pattern as the completed modules).

See `API-INTEGRATION-STATUS.md` for what's already done.

---

## ✅ Adapted (2026-07-19) — was "Not adapted", now fixed

| # | Function / component | File:line | Endpoint | Fix applied |
|---|---|---|---|---|
| 1 | Mini games bundle | `app/pages/mini.vue` | `GET /games/lobbies?gameType=mini` then `GET /games` | Param renamed to `gameType`; lobbies mapped via `mapGameLobby`, games via `mapGameListItem` (defensive, SSR-awaited) so `lobby.game_name` / `g.game_name_en` resolve |
| 2 | Slot-RTP games list | `app/pages/slot-rtp.vue` (`loadGames`) | `GET /games?lobbyId=…` | Param renamed to `lobbyId`; items mapped via `mapGameListItem`; total read from `meta.total` (falls back to `rows`/`total`); `games` ref + `RtpGameCard` prop widened to `NormalizedGame`/nullable |
| 3 | Transaction ledger | `app/components/my-account/TransactionLogs.vue` (`fetchLedger`) | `GET /transactions/logs` | Added `logsResponseWireSchema` + `mapLogsResponse` (→ `{ pages, rows, data }`) in `app/interfaces/ledger.ts`; fetch now `validateResponse(...)` → `mapLogsResponse(...)`, so `pages` and the snake_case `ILedgerItem` fields render |

**Fix pattern** (same as the finished modules): rename query params to camelCase,
add a zod wire schema + mapper in `app/interfaces/*.interface.ts`, and
`validateResponse(...).map(...)` at the fetch (mini uses defensive mapping instead
of a throwing `validateResponse` because it runs SSR-awaited).

---

## 🗑️ Removed (2026-07-21) — UI deleted, endpoint no longer called

| # | Surface | Endpoint | What was removed |
|---|---|---|---|
| 4 | Bonus history | `GET /promotions/bonuses` | `BonusHistory.vue` deleted; unwired from the profile modal, menu defaults, icon maps and i18n |
| 5 | Level system | `GET /promotions/level-rewards` | `LevelSystem.vue` deleted **whole panel** (banner + FAQ + tier cards). The `/site/config/userpage/levelSystem` FAQ fetch went with it — it had no other consumer. Level *badge* assets stay (used by `AppHeader`/`UserBalancePill`) |
| 8 | Deposit voucher | `GET /promotions/vouchers` | `VoucherPopupModal.vue`, the dead `v-if="false"` picker, all voucher state in `useBankPayment.ts`, the `bonus`/`totalNetAmount` summary rows, and `tests/e2e/specs/voucher-popup.spec.ts` |

Menu items are CMS-driven, so `useProfileMenu.ts` filters `bonushistory` /
`levelsystem` out of the live theme payload via `REMOVED_ITEM_IDS` (generalised
from the old togel-only `isTogelItem`) — otherwise the tiles would still render
and open nothing.

Retained deliberately: the `deposit.apiMessages.INVALID_VOUCHER` /
`ACTIVE_TO_IN_PROGRESS` i18n tokens, since those are backend-emitted error keys
rather than UI strings.

## 🚫 No backend — blocked (except partner)

| # | Function / component | File:line | Endpoint | Notes |
|---|---|---|---|---|
| 6 | Promotion boards (profile) | `app/components/profile/ProfileBannerCarousel.vue:139` | `GET /promotions/boards` | No backend |
| 7 | Promotion boards (page) | `app/components/promotion/PromotionContent.vue:56` (`/promotions` page) | `GET /promotions/boards` | No backend |
| 9 | Signup bank dropdown | `app/components/auth/useSignupForm.ts` | `GET /banks/register` | Replaced with a **static** Korean bank list; register accepts free-text `bankName` |
| 10 | Deposit bank account | `app/components/transaction/useDepositModal.ts` | `GET /banks/accounts` | **Static** placeholder; deposit no longer needs `accountId` (backend derives it), so this is cosmetic only |

All `/promotions/*` and `/banks/*` calls degrade gracefully today (`|| []`,
`.catch`, or static fallback) — they don't crash the app, they just show empty /
placeholder content.

---

## Notes & false positives (checked, NOT gaps)
- `setCurrentGame({ … lobby_id })` in `mini/slot-rtp/index/SubGames/Recommended` — that `lobby_id` is the **store's `GameState` field**, not an API param.
- `LoginHistory.vue` / `TransactionHistory.vue` `calculateDateRange()` return `{ start_date, end_date }`, but the **actual fetch already maps them to `startDate`/`endDate`** — internal naming only.
- `Recommended.vue` reads `game.lobbyId` / `game.game_img` from **props** (mapped upstream), not a direct fetch.
- `useApi.ts:16` `game_type` is a **doc comment** example.
- `useDefaultThemeConfig.ts` `banks/...` paths are **asset URLs**, not API calls.

## Summary
- **3** real endpoints needed frontend adaptation (mini, slot-rtp, transaction
  logs) — all fixed 2026-07-19.
- **3** unbacked surfaces were removed outright 2026-07-21 (bonus history, level
  system, deposit vouchers).
- **4** remain blocked on missing backend (`/promotions/boards`, `/banks/*`) —
  all degrade gracefully.
- Everything else in the app is integrated (see `API-INTEGRATION-STATUS.md`).
