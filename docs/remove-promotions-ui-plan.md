# Plan — Remove UI backed by the dead `/promotions/*` endpoints

Scope: delete the frontend surfaces whose only data source is an endpoint that
does not exist in `monkey-user-api`:

| Endpoint | UI surface | Decision |
|---|---|---|
| `GET /promotions/bonuses` | Bonus History account panel | remove entirely |
| `GET /promotions/level-rewards` | Level System account panel | remove entirely (whole panel) |
| `GET /promotions/vouchers` | Deposit voucher picker + popup (already `v-if="false"`) | remove entirely, incl. dead state |

Out of scope: `GET /promotions/boards` (promotion banners/page) — still rendered,
tracked separately in `API-INTEGRATION-GAPS.md` rows 6–7.

---

## 1. Bonus History (`GET /promotions/bonuses`)

- **Delete** `app/components/my-account/BonusHistory.vue`.
- `app/components/profile/NewProfileModal.vue`
  - drop the `BonusHistory` import (:224) and the `bonusHistory:` entry in
    `ACCOUNT_COMPONENTS` (:239).
- `app/components/profile/useProfileMenu.ts`
  - drop `bonusHistory` from `MENU_ITEM_DEFAULTS` (:93–96),
    `ACCOUNT_SECTION_ICONS` (:294) and `ACCOUNT_SECTION_ICON_TOP` (:309).
- `app/composables/useDefaultThemeConfig.ts`
  - drop `bonusHistory` from `PROFILE_MENU_ICON_DEFAULTS` (:645) and from the
    default `profileMenu` array (:1189); re-number the following `sort` values.
- `i18n/locales/{en,ko}.json` — remove the `myAccount.bonusHistory` block (:608).

## 2. Level System (`GET /promotions/level-rewards`)

- **Delete** `app/components/my-account/LevelSystem.vue`.
  - Safe w.r.t. its non-scoped `.tiptap-content` `<style>` block: the identical
    rules also live in `app/components/faq/FaqContent.vue`, which is the other
    consumer of `renderTiptap`.
- `NewProfileModal.vue` — drop import (:226) + `levelSystem:` map entry (:241).
- `useProfileMenu.ts` — drop `levelSystem` from `MENU_ITEM_DEFAULTS` (:109–112),
  `ACCOUNT_SECTION_ICONS` (:291), `ACCOUNT_SECTION_ICON_TOP` (:306).
- `useDefaultThemeConfig.ts` — drop `levelSystem` from
  `PROFILE_MENU_ICON_DEFAULTS` (:647) and the default `profileMenu` (:1191).
- `i18n/locales/{en,ko}.json` — remove `myAccount.levelSystem` (:618).
- **Keep**: the tier images (`assets.images.bronze/silver/gold/diamonds`) — still
  used by `AppHeader.vue` / `UserBalancePill.vue` for the level badge; and the
  auth-store level fields (`level`, `level_exp`, `next_level_min_exp`).
- The `/site/config/userpage/levelSystem` FAQ fetch disappears with the file; no
  other consumer exists.

## 3. CMS-driven menu items (applies to §1 and §2)

The profile menu is built from the **live CMS theme payload**
(`useMenuSettings`), not only from the bundled defaults — so deleting the
defaults is not enough. Extend the existing removal filter in
`useProfileMenu.ts` (:203–212):

- Generalise `TOGEL_ITEM_IDS` / `isTogelItem` into a `REMOVED_ITEM_IDS` /
  `isRemovedItem` set that also contains `bonushistory` and `levelsystem`
  (ids are normalised with `replace(/[^a-z]/gi, "")`, so CMS variants like
  `bonus_history` / `level-system` are caught).
- Apply it in both `visibleMenuItems` and `visiblePage2Items` (already the two
  call sites).

## 4. Deposit voucher (`GET /promotions/vouchers`)

- **Delete** `app/components/transaction/VoucherPopupModal.vue`.
- `app/components/transaction/BankPaymentContent.vue`
  - delete the dead `<template v-if="false">` voucher block (:108–144),
  - delete the `<VoucherPopupModal …>` usage (:193–199) and its import (:208),
  - drop `vouchers`, `loadingVouchers`, `selectedVoucher`, `showVoucherPopup`,
    `pendingVoucher`, `bonus`, `handleVoucherChange`, `handlePopupAgree`,
    `handlePopupDisagree` from the destructure (:227–248).
- `app/components/transaction/useBankPayment.ts`
  - delete `IVoucherIssue`, the five voucher refs (:102–110), the `bonus`
    computed (:148–172), `handleVoucherChange` / `handlePopupAgree` /
    `handlePopupDisagree` (:230–255), the PULSA voucher-clearing watcher
    (:140–146), the `selectedVoucher` reset in `resetForm` (:305), the stale
    header/`Vouchers are not fetched` comments, and the matching return keys.
  - `totalNetAmount` (:186) collapses to `netAmount` → remove it.
- `app/components/transaction/DepositSummary.vue`
  - remove the **Bonus** row (:31–36) and the **Total Net Amount** row (:37–45)
    plus the `bonus` / `totalNetAmount` props — with bonus gone, total is just
    net amount and would render the same number twice. Reduce the fixed card
    height (`h-[220px] md:h-[215px]`) to fit the remaining three rows.
- **Delete** `tests/e2e/specs/voucher-popup.spec.ts` (mocks
  `/api/promotions/vouchers`; the surface no longer exists).
- `i18n/locales/{en,ko}.json` — remove `deposit.voucher` (:504),
  `deposit.selectVoucher` (:505), the `deposit.voucherPopup` block (:592) and
  `deposit.transactionSummary.bonus` / `.totalNetAmount`.

## 5. Docs

- `API-INTEGRATION-GAPS.md` — move rows 4, 5 and 8 out of "No backend — blocked"
  into a new "Removed" section (UI deleted, endpoint no longer called).
- `KNOWLEDGEBASE.md` — update the profile/account-section component map and the
  deposit-modal description.
- `DECISIONS.md` — append an ADR: "Remove `/promotions/*`-only UI (bonus history,
  level system, deposit vouchers)" mirroring the togel/qris removal ADR.

## 6. Verification

```
npm run lint
npm run typecheck
npm run test:component
npm run build
```
Manual: open the profile modal (desktop + mobile) — no Bonus History / Level
System tiles, remaining tiles still navigate; open the deposit modal — summary
card renders three rows, deposit still submits.
