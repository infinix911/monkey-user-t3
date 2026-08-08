# API Response Translation Audit — monkey-user-t3

Audit of every API response that can reach the UI, and of the i18n coverage
behind it. Scope: `app/**` (all HTTP verbs), `i18n/locales/{en,ko}.json`.

---

## Summary

| Check | Result |
|---|---|
| en / ko key parity | ✅ **799 keys each, 0 missing in either direction** |
| API token translations (`*.apiMessages.*`) | ✅ **90 tokens, 0 missing Korean** |
| Duplicate translation keys | ✅ none |
| Raw API responses shown to users | ✅ **fixed** (was 7 sites — see §1) |
| Hardcoded user-facing strings | ❌ **~15 sites** (incl. the entire error page) |
| Untranslated Korean values | ⚠️ 2 genuine (8 more are brand names) |
| Unused translation keys | ⚠️ ~135 candidates |
| Untranslated keys on initial load | ✅ structurally prevented |

**The mechanism is sound; the problem is bypass.** `useApiMessage()` is well
designed — it resolves both backend response shapes, translates *only* when the
key exists (`te(key)`), and falls back `<ns>.apiMessages.INTERNAL_ERROR` →
`common.error`, so it can never leak a key path. Every defect below is code that
does not use it.

---

## ✅ 1. Raw API responses displayed to users — FIXED

~~These render the backend token (e.g. `INVALID_CURRENT_PASSWORD`) verbatim.~~
**Fixed.** All seven now route through `apiMessage()`, which translates known
tokens and falls back to localized copy for anything unrecognised. The `Fix`
column records what was applied.

| # | Location | Code | Fix |
|---|---|---|---|
| 1 | `my-account/ChangePassword.vue:134` | `e?.data?.message \|\| e?.message \|\| t(...)` in the change-password catch | `apiMessage(err, "password", "password.error.generic")` |
| 2 | `my-account/ChangePassword.vue:184` | same, withdrawal-password catch | same |
| 3 | `composables/useInquiryMutations.ts:266` | `apiErrorMessageOr(error, "Failed to load replies")` — raw token **and** a hardcoded English fallback | `apiMessage(error, "inquiry")` |
| 4 | `composables/useLobbyPage.ts:58` | `err.data?.message \|\| err.message \|\| t("common.errorLoadingData")` — inline error on every lobby page | `apiMessage(fetchError.value, "game", "common.errorLoadingData")` |
| 5 | `pages/hot.vue:163` | same pattern | same |
| 6 | `pages/lobbies/[lobby]/games.vue:148` | same pattern | same |
| 7 | `stores/auth.ts:139` | `throw new Error(apiErrorMessageOr(error, "Failed to verify user"))` — raw text into an Error a caller may display | throw a token; translate at the display site |

**Root enabler:** `app/utils/parseAxiosError.ts:52`

```ts
export function apiErrorMessageOr(error: unknown, fallback: string): string {
  return e.response?.data?.message || e.message || fallback;   // raw API text
}
```

It is only safe for logging. Recommend renaming it (e.g. `apiErrorForLog`) so a
user-facing call site reads as obviously wrong.

### Smoking gun

Four namespaces have `apiMessages` translations but **no `apiMessage()` caller**:
`password`, `game`, `common`, `notifications`.

`password` is the proof: `password.apiMessages` ships 4 fully-translated tokens
in both locales, and `ChangePassword.vue` displays the raw token instead. The
translations already exist — nothing routes through them.

---

## ❌ 2. Hardcoded user-facing strings

| Location | Strings | Impact |
|---|---|---|
| **`app/error.vue`** | `Page Not Found`, `Something Went Wrong`, `An unexpected error occurred. Please try again later.`, `Go to Homepage` | **Highest.** The default locale is `ko`, so every Korean user sees an English error page |
| `components/WorkInProgress.vue` | `WORK IN PROGRESS`, `We're crafting something amazing for you!`, `Stay tuned for updates!` | Full-page |
| `transaction/SelectBankAccountModal.vue:43` | `No data found` | Empty state |
| ~9 modals | `aria-label="Close"` | Screen readers only |
| `transaction/WithdrawalModal.vue` | `aria-label="Withdraw Modal"` | Screen readers |
| `auth/SignupModal.vue` | `aria-label="Check referral"` | Screen readers |

---

## ⚠️ 3. WebSocket toasts are not locale-negotiated

`stores/websocket.ts:172-186` displays pushed notifications verbatim:

```ts
success(notificationData.title, { description: notificationData.message });
```

This is **correct by design** — the backend localises them (`monkey-user-api`
`src/lib/notifications/member/{en,ko,th,id}.template.ts`). But the REST endpoint
negotiates locale explicitly (`/notifications?lang=ko`) while the WebSocket
connection does not appear to pass the UI locale at all. If the socket falls back
to a default, a Korean member receives English toasts.

**Not a frontend bug to fix blindly** — verify which locale the API uses for
socket pushes before changing anything.

---

## ⚠️ 4. Locale file hygiene

**Genuinely untranslated Korean values**
- `deposit.errors.fetchBanksFailed` — `"Failed to load bank accounts. Please try again."` sits in `ko.json` in English.
- `loyalty.banner.title` — `"LEVEL UP, CASH IN!"` (may be intentional brand copy).

Eight further `ko === en` matches are correct: `Telegram`, `Bronze`/`Silver`/`Gold`/`Platinum`/`Diamond`, `3,500 €`, `LUCKY`.

**Empty English values** — `header.honorific`, `header.walletUnit`. Intentional:
the honorific is the Korean 님 suffix, deliberately blank where no equivalent exists.

**~135 candidate-unused keys** (a further 280 are dynamically built, e.g.
`` `${ns}.apiMessages.${token}` ``, and are correctly in use). Largest clusters:

- `withdrawal.history.*` (11)
- `home.seo.links.*` (10)
- `notifications.levelUp.*` (6)
- `login.errors.email*` / `captcha*` (5)

Likely dead from removed features. **Verify each before deleting** — the
heuristic cannot see runtime-built keys.

**Duplicates:** none. Repeated names (`title` ×30, `apiMessages` ×10) are
distinct nested namespaces, which is correct.

---

## ✅ 5. Initial-load behaviour

No flash of untranslated keys, by construction:

1. `app.vue` resolves the locale **before render** and `await setLocale(target)`,
   so the SSR HTML is already in the right language.
2. `useApiMessage` guards every lookup with `te(key)`, so a missing key yields
   a translated fallback rather than an echoed key path.
3. i18n is `lazy: true` with `strategy: "no_prefix"`; the locale file loads
   alongside hydration, and the server-rendered text is already correct.

The one historical failure this design fixed is documented in `useApiMessage.ts`:
`login.apiMessages.Invalid username or password` once reached the screen because
an unrecognised token was interpolated into a key path. The `te()` guard is what
prevents that class of bug — which is exactly why the bypass sites in §1 matter.

---

## Recommended order

1. **`app/error.vue`** — highest user impact, self-contained, ~4 keys.
2. **§1 sites 1–3** — `apiMessage()` already exists; sites 1–2 have translations waiting.
3. **§1 sites 4–6** — the three lobby inline errors share one pattern.
4. Rename `apiErrorMessageOr` so misuse is visible.
5. Empty states + `aria-label`s.
6. Verify WebSocket locale with the API team.
7. Prune unused keys last, after verifying each.

---

## Appendix — all 90 API tokens

Every token below exists in **both** `en.json` and `ko.json`.
"Used In" lists the components calling `apiMessage()` for that namespace;
`— (no apiMessage call)` marks the four orphaned namespaces from §1.

| API Response | Translation Key | English | Korean | Used In | Status |
|---|---|---|---|---|---|
| `SUCCESSFUL_LOGIN` | `login.apiMessages.SUCCESSFUL_LOGIN` | Login successful! Welcome back. | 로그인 성공! 다시 오신 것을 환영합니다. | LoginModal.vue, useApiMessage.ts | ✅ |
| `SUCCESSFUL_LOGOUT` | `login.apiMessages.SUCCESSFUL_LOGOUT` | You have been logged out successfully. | 성공적으로 로그아웃되었습니다. | LoginModal.vue, useApiMessage.ts | ✅ |
| `INVALID_CREDENTIALS` | `login.apiMessages.INVALID_CREDENTIALS` | Invalid username or password. Please check your credential | 아이디 또는 비밀번호가 올바르지 않습니다. 확인 후 다시 시도하세요. | LoginModal.vue, useApiMessage.ts | ✅ |
| `INVALID_USERNAME_OR_PASSWORD` | `login.apiMessages.INVALID_USERNAME_OR_PASSWORD` | Invalid username or password. Please check your credential | 아이디 또는 비밀번호가 올바르지 않습니다. 확인 후 다시 시도하세요. | LoginModal.vue, useApiMessage.ts | ✅ |
| `INVALID_EMAIL_OR_PASSWORD` | `login.apiMessages.INVALID_EMAIL_OR_PASSWORD` | Invalid username or password. Please check your credential | 아이디 또는 비밀번호가 올바르지 않습니다. 확인 후 다시 시도하세요. | LoginModal.vue, useApiMessage.ts | ✅ |
| `TOO_MANY_REQUESTS` | `login.apiMessages.TOO_MANY_REQUESTS` | Too many login attempts. Please wait a moment and try agai | 로그인 시도가 너무 많습니다. 잠시 후 다시 시도해 주세요. | LoginModal.vue, useApiMessage.ts | ✅ |
| `INVALID_OR_EXPIRED_TOKEN` | `login.apiMessages.INVALID_OR_EXPIRED_TOKEN` | Your session has expired. Please log in again. | 세션이 만료되었습니다. 다시 로그인해 주세요. | LoginModal.vue, useApiMessage.ts | ✅ |
| `INVALID_USER` | `login.apiMessages.INVALID_USER` | Invalid user. Please contact support. | 유효하지 않은 사용자입니다. 고객센터에 문의하세요. | LoginModal.vue, useApiMessage.ts | ✅ |
| `AGENT_INCOMPLETE_PROFILE` | `login.apiMessages.AGENT_INCOMPLETE_PROFILE` | Agent profile is incomplete. Please complete your profile. | 에이전트 프로필이 불완전합니다. 프로필을 완성해 주세요. | LoginModal.vue, useApiMessage.ts | ✅ |
| `INTERNAL_ERROR` | `login.apiMessages.INTERNAL_ERROR` | An internal error occurred. Please try again later. | 내부 오류가 발생했습니다. 잠시 후 다시 시도하세요. | LoginModal.vue, useApiMessage.ts | ✅ |
| `PASSWORD_UPDATED` | `password.apiMessages.PASSWORD_UPDATED` | Password updated successfully. | 비밀번호가 성공적으로 업데이트되었습니다. | — (no apiMessage call) | ✅ |
| `INVALID_CURRENT_PASSWORD` | `password.apiMessages.INVALID_CURRENT_PASSWORD` | Current password is incorrect. | 현재 비밀번호가 올바르지 않습니다. | — (no apiMessage call) | ✅ |
| `PASSWORD_NOT_SAME` | `password.apiMessages.PASSWORD_NOT_SAME` | New passwords do not match. | 새 비밀번호가 일치하지 않습니다. | — (no apiMessage call) | ✅ |
| `INTERNAL_ERROR` | `password.apiMessages.INTERNAL_ERROR` | An internal error occurred. Please try again later. | 내부 오류가 발생했습니다. 잠시 후 다시 시도하세요. | — (no apiMessage call) | ✅ |
| `WITHDRAWAL_REQUEST_SUCCESS` | `withdrawal.apiMessages.WITHDRAWAL_REQUEST_SUCCESS` | Withdrawal request submitted successfully! Your request is | 출금 요청이 성공적으로 제출되었습니다! 요청이 처리 중입니다. | WithdrawalContent.vue | ✅ |
| `SETTING_NOT_SET` | `withdrawal.apiMessages.SETTING_NOT_SET` | Withdrawal settings are not configured. Please contact sup | 출금 설정이 구성되지 않았습니다. 고객센터에 문의하세요. | WithdrawalContent.vue | ✅ |
| `MINIMUM_AMOUNT_NOT_REACHED` | `withdrawal.apiMessages.MINIMUM_AMOUNT_NOT_REACHED` | Amount does not meet the minimum withdrawal requirement. | 최소 출금 금액을 충족하지 않습니다. | WithdrawalContent.vue | ✅ |
| `OVER_MAXIMUM_AMOUNT` | `withdrawal.apiMessages.OVER_MAXIMUM_AMOUNT` | Amount exceeds the maximum withdrawal limit. | 최대 출금 한도를 초과했습니다. | WithdrawalContent.vue | ✅ |
| `AMOUNT_NOT_DIVISIBLE` | `withdrawal.apiMessages.AMOUNT_NOT_DIVISIBLE` | Amount must be in the correct increment. | 금액은 올바른 단위여야 합니다. | WithdrawalContent.vue | ✅ |
| `INVALID_AMOUNT` | `withdrawal.apiMessages.INVALID_AMOUNT` | Invalid amount. Please enter a valid amount. | 유효하지 않은 금액입니다. 올바른 금액을 입력하세요. | WithdrawalContent.vue | ✅ |
| `INTERNAL_ERROR` | `withdrawal.apiMessages.INTERNAL_ERROR` | An internal error occurred. Please try again later. | 내부 오류가 발생했습니다. 잠시 후 다시 시도하세요. | WithdrawalContent.vue | ✅ |
| `ROLL_REQUIREMENT_ERROR` | `withdrawal.apiMessages.ROLL_REQUIREMENT_ERROR` | You need to bet more to be able to withdraw. | 출금하려면 더 많은 배팅이 필요합니다. | WithdrawalContent.vue | ✅ |
| `MEMBER_NOT_FOUND` | `withdrawal.apiMessages.MEMBER_NOT_FOUND` | Member Not Found | 회원 정보를 찾을 수 없습니다 | WithdrawalContent.vue | ✅ |
| `INSUFFICIENT_ROLL` | `withdrawal.apiMessages.INSUFFICIENT_ROLL` | Insufficient Roll | 롤링 금액 부족 | WithdrawalContent.vue | ✅ |
| `PENDING_WITHDRAWAL_REQUEST_FOUND` | `withdrawal.apiMessages.PENDING_WITHDRAWAL_REQUEST_FOUND` | Pending Withdrawal Request Found | 진행 중인 출금 요청이 있습니다 | WithdrawalContent.vue | ✅ |
| `INSUFFICIENT_BALANCE` | `withdrawal.apiMessages.INSUFFICIENT_BALANCE` | Insufficient Balance | 잔액이 부족합니다 | WithdrawalContent.vue | ✅ |
| `PROMOTION_DEPOSIT_TO_NOT_MET` | `withdrawal.apiMessages.PROMOTION_DEPOSIT_TO_NOT_MET` | Promotion deposit turnover requirement not met. Please com | 프로모션 입금 턴오버 요건이 충족되지 않았습니다. 출금 전 필요한 턴오버를 완료해 주세 | WithdrawalContent.vue | ✅ |
| `INVALID_WITHDRAWAL_PASSWORD` | `withdrawal.apiMessages.INVALID_WITHDRAWAL_PASSWORD` | The withdrawal password is incorrect. | 출금 비밀번호가 올바르지 않습니다. | WithdrawalContent.vue | ✅ |
| `WITHDRAWAL_PASSWORD_NOT_SET` | `withdrawal.apiMessages.WITHDRAWAL_PASSWORD_NOT_SET` | No withdrawal password is set on your account. Please cont | 계정에 출금 비밀번호가 설정되어 있지 않습니다. 고객센터에 문의하세요. | WithdrawalContent.vue | ✅ |
| `INQUIRY_NEW` | `inquiry.apiMessages.INQUIRY_NEW` | Your inquiry has been created successfully. | 문의가 성공적으로 생성되었습니다. | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `PENDING_INQUIRY_FOUND` | `inquiry.apiMessages.PENDING_INQUIRY_FOUND` | You already have a pending inquiry. | 진행 중인 문의가 이미 있습니다. | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `MEMBER_NOT_FOUND` | `inquiry.apiMessages.MEMBER_NOT_FOUND` | Member not found. | 회원을 찾을 수 없습니다. | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `INTERNAL_ERROR` | `inquiry.apiMessages.INTERNAL_ERROR` | An internal error occurred. Please try again later. | 내부 오류가 발생했습니다. 잠시 후 다시 시도하세요. | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `INQUIRY_STATUS_UPDATED` | `inquiry.apiMessages.INQUIRY_STATUS_UPDATED` | Inquiry status updated successfully. | 문의 상태가 업데이트되었습니다. | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `INQUIRY_READ_STATUS_UPDATED` | `inquiry.apiMessages.INQUIRY_READ_STATUS_UPDATED` | Inquiry marked as read. | 문의가 읽음으로 표시되었습니다. | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `INQUIRY_NOT_FOUND` | `inquiry.apiMessages.INQUIRY_NOT_FOUND` | Inquiry not found. | 문의를 찾을 수 없습니다. | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `BANK_ACCOUNT_REQUEST` | `inquiry.apiMessages.BANK_ACCOUNT_REQUEST` | Bank Account Request | 은행 계좌 요청 | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `INQUIRY_REPLIED` | `inquiry.apiMessages.INQUIRY_REPLIED` | Inquiry Replied | 문의에 답변했습니다 | useApiMessage.ts, useInquiryMutations.ts | ✅ |
| `LOBBY_NOT_FOUND` | `game.apiMessages.LOBBY_NOT_FOUND` | Game lobby not found. | 게임 로비를 찾을 수 없습니다. | — (no apiMessage call) | ✅ |
| `GAME_REQUIRED_FOR_NON_CASINO` | `game.apiMessages.GAME_REQUIRED_FOR_NON_CASINO` | Please select a game to play. | 플레이할 게임을 선택해 주세요. | — (no apiMessage call) | ✅ |
| `INVALID_GAME_FOR_LOBBY` | `game.apiMessages.INVALID_GAME_FOR_LOBBY` | This game is not available in the selected lobby. | 선택한 로비에서 이 게임을 사용할 수 없습니다. | — (no apiMessage call) | ✅ |
| `INVALID_USER` | `game.apiMessages.INVALID_USER` | Invalid user. Please log in again. | 유효하지 않은 사용자입니다. 다시 로그인해 주세요. | — (no apiMessage call) | ✅ |
| `INVALID_GAME` | `game.apiMessages.INVALID_GAME` | Invalid game selected. | 유효하지 않은 게임이 선택되었습니다. | — (no apiMessage call) | ✅ |
| `PROVIDER_LAUNCH_FAIL` | `game.apiMessages.PROVIDER_LAUNCH_FAIL` | Failed to launch game. Please try again. | 게임 실행에 실패했습니다. 다시 시도해 주세요. | — (no apiMessage call) | ✅ |
| `PROVIDER_LAUNCH_FAILED` | `game.apiMessages.PROVIDER_LAUNCH_FAILED` | Failed to launch game. Please try again. | 게임 실행에 실패했습니다. 다시 시도해 주세요. | — (no apiMessage call) | ✅ |
| `INTERNAL_ERROR` | `game.apiMessages.INTERNAL_ERROR` | An internal error occurred. Please try again later. | 내부 오류가 발생했습니다. 잠시 후 다시 시도하세요. | — (no apiMessage call) | ✅ |
| `UNEXPECTED_ERROR` | `common.apiMessages.UNEXPECTED_ERROR` | An unexpected error occurred. Please try again. | 예기치 않은 오류가 발생했습니다. 다시 시도해 주세요. | — (no apiMessage call) | ✅ |
| `INTERNAL_ERROR` | `common.apiMessages.INTERNAL_ERROR` | An internal error occurred. Please try again later. | 내부 오류가 발생했습니다. 나중에 다시 시도해 주세요. | — (no apiMessage call) | ✅ |
| `UNAUTHORIZED` | `common.apiMessages.UNAUTHORIZED` | Access denied. Please log in first. | 접근이 거부되었습니다. 먼저 로그인해 주세요. | — (no apiMessage call) | ✅ |
| `MEMBER_NOT_FOUND` | `common.apiMessages.MEMBER_NOT_FOUND` | User not found. | 사용자를 찾을 수 없습니다. | — (no apiMessage call) | ✅ |
| `VALIDATION_ERROR` | `common.apiMessages.VALIDATION_ERROR` | Invalid input. Please check your details and try again. | 입력값이 올바르지 않습니다. 내용을 확인하고 다시 시도해 주세요. | — (no apiMessage call) | ✅ |
| `NOTIF_NOT_FOUND` | `notifications.apiMessages.NOTIF_NOT_FOUND` | Notification Not Found | 알림을 찾을 수 없습니다 | — (no apiMessage call) | ✅ |
| `NOTIF_READ` | `notifications.apiMessages.NOTIF_READ` | Notification Read | 알림 읽음 처리 | — (no apiMessage call) | ✅ |
| `DEPOSIT_REQUEST_SUCCESS` | `deposit.apiMessages.DEPOSIT_REQUEST_SUCCESS` | Deposit request submitted successfully! | 입금 요청이 성공적으로 제출되었습니다! | useBankPayment.ts | ✅ |
| `SETTING_NOT_SET` | `deposit.apiMessages.SETTING_NOT_SET` | Deposit settings are not configured. Please contact suppor | 입금 설정이 구성되지 않았습니다. 고객센터에 문의하세요. | useBankPayment.ts | ✅ |
| `MINIMUM_AMOUNT_NOT_REACHED` | `deposit.apiMessages.MINIMUM_AMOUNT_NOT_REACHED` | Amount does not meet the minimum deposit requirement. | 최소 입금 금액을 충족하지 않습니다. | useBankPayment.ts | ✅ |
| `OVER_MAXIMUM_AMOUNT` | `deposit.apiMessages.OVER_MAXIMUM_AMOUNT` | Amount exceeds the maximum deposit limit. | 최대 입금 한도를 초과했습니다. | useBankPayment.ts | ✅ |
| `AMOUNT_NOT_DIVISIBLE` | `deposit.apiMessages.AMOUNT_NOT_DIVISIBLE` | Amount must be in the correct increment. | 금액은 올바른 단위여야 합니다. | useBankPayment.ts | ✅ |
| `INVALID_VOUCHER` | `deposit.apiMessages.INVALID_VOUCHER` | Invalid or expired voucher | 유효하지 않거나 만료된 바우처 | useBankPayment.ts | ✅ |
| `MEMBER_NOT_FOUND` | `deposit.apiMessages.MEMBER_NOT_FOUND` | Member not found | 회원을 찾을 수 없습니다 | useBankPayment.ts | ✅ |
| `PENDING_DEPOSIT_REQUEST_FOUND` | `deposit.apiMessages.PENDING_DEPOSIT_REQUEST_FOUND` | You already have a pending deposit request | 이미 대기 중인 입금 요청이 있습니다 | useBankPayment.ts | ✅ |
| `DEPOSIT_COOLDOWN_ACTIVE` | `deposit.apiMessages.DEPOSIT_COOLDOWN_ACTIVE` | You recently requested a deposit. Please try again after f | 최근에 입금을 요청하셨습니다. 잠시 후 다시 시도해 주세요. | useBankPayment.ts | ✅ |
| `BANK_ACCOUNT_NOT_FOUND` | `deposit.apiMessages.BANK_ACCOUNT_NOT_FOUND` | Bank account not found | 은행 계좌를 찾을 수 없습니다 | useBankPayment.ts | ✅ |
| `INTERNAL_ERROR` | `deposit.apiMessages.INTERNAL_ERROR` | An internal error occurred. Please try again later | 내부 오류가 발생했습니다. 잠시 후 다시 시도하세요 | useBankPayment.ts | ✅ |
| `ACTIVE_TO_IN_PROGRESS` | `deposit.apiMessages.ACTIVE_TO_IN_PROGRESS` | You have an active promotion turnover in progress. Please  | 진행 중인 프로모션 턴오버가 있습니다. 바우처를 사용한 새 입금 전에 완료해 주세요. | useBankPayment.ts | ✅ |
| `FILE_TOO_LARGE` | `deposit.apiMessages.FILE_TOO_LARGE` | File is too large. Please upload a smaller file. | 파일이 너무 큽니다. 더 작은 파일을 업로드해 주세요. | useBankPayment.ts | ✅ |
| `FILE_TYPE_NOT_ALLOWED` | `deposit.apiMessages.FILE_TYPE_NOT_ALLOWED` | File type is not allowed. Please upload a valid file. | 허용되지 않는 파일 형식입니다. 유효한 파일을 업로드해 주세요. | useBankPayment.ts | ✅ |
| `UPLOAD_FAILED` | `deposit.apiMessages.UPLOAD_FAILED` | File upload failed. Please try again. | 파일 업로드에 실패했습니다. 다시 시도해 주세요. | useBankPayment.ts | ✅ |
| `UPLOAD_SUCCESS` | `deposit.apiMessages.UPLOAD_SUCCESS` | File uploaded successfully. | 파일이 성공적으로 업로드되었습니다. | useBankPayment.ts | ✅ |
| `PROMOTION_DEPOSIT_TO_NOT_MET` | `deposit.apiMessages.PROMOTION_DEPOSIT_TO_NOT_MET` | Promotion deposit turnover requirement not met. | 프로모션 입금 턴오버 요건이 충족되지 않았습니다. | useBankPayment.ts | ✅ |
| `INVALID_AMOUNT` | `deposit.apiMessages.INVALID_AMOUNT` | Invalid amount. Please enter a valid amount. | 유효하지 않은 금액입니다. 올바른 금액을 입력해 주세요. | useBankPayment.ts | ✅ |
| `NOT_FOUND` | `deposit.apiMessages.NOT_FOUND` | Session not found. Please request a new QR code. | 세션을 찾을 수 없습니다. 새 QR 코드를 요청해 주세요. | useBankPayment.ts | ✅ |
| `VALIDATION_ERROR` | `deposit.apiMessages.VALIDATION_ERROR` | Invalid input. Please check your details and try again. | 입력값이 올바르지 않습니다. 내용을 확인하고 다시 시도해 주세요. | useBankPayment.ts | ✅ |
| `SUCCESSFUL_REGISTER` | `signup.apiMessages.SUCCESSFUL_REGISTER` | Registration successful! | 회원가입이 완료되었습니다! | useSignupForm.ts | ✅ |
| `PASSWORD_NOT_SAME` | `signup.apiMessages.PASSWORD_NOT_SAME` | Passwords do not match. Please try again. | 비밀번호가 일치하지 않습니다. 다시 입력해 주세요. | useSignupForm.ts | ✅ |
| `AGENT_NOT_FOUND` | `signup.apiMessages.AGENT_NOT_FOUND` | Agent not found. Please check the agent username. | 에이전트를 찾을 수 없습니다. 추천인 아이디를 확인해 주세요. | useSignupForm.ts | ✅ |
| `INTERNAL_ERROR` | `signup.apiMessages.INTERNAL_ERROR` | An internal error occurred. Please try again later. | 내부 오류가 발생했습니다. 잠시 후 다시 시도해 주세요. | useSignupForm.ts | ✅ |
| `PHONE_ALREADY_TAKEN` | `signup.apiMessages.PHONE_ALREADY_TAKEN` | This phone number is already registered. Please use a diff | 이미 등록된 전화번호입니다. 다른 번호를 사용해 주세요. | useSignupForm.ts | ✅ |
| `USERNAME_ALREADY_TAKEN` | `signup.apiMessages.USERNAME_ALREADY_TAKEN` | This username is already taken. Please choose a different  | 이미 사용 중인 아이디입니다. 다른 아이디를 선택해 주세요. | useSignupForm.ts | ✅ |
| `BANK_ACCOUNT_ALREADY_TAKEN` | `signup.apiMessages.BANK_ACCOUNT_ALREADY_TAKEN` | This bank account is already registered. Please use a diff | 이미 등록된 은행 계좌입니다. 다른 계좌를 사용해 주세요. | useSignupForm.ts | ✅ |
| `INVALID_CAPTCHA` | `signup.apiMessages.INVALID_CAPTCHA` | Invalid Captcha | 잘못된 캡차입니다 | useSignupForm.ts | ✅ |
| `AGENT_DEPTH_MAX` | `signup.apiMessages.AGENT_DEPTH_MAX` | Agent Depth Max | 에이전트 깊이 한도 초과 | useSignupForm.ts | ✅ |
| `BANK_ALREADY_EXISTS` | `signup.apiMessages.BANK_ALREADY_EXISTS` | Bank Already Exists | 이미 등록된 은행입니다 | useSignupForm.ts | ✅ |
| `BANK_INFO_UPDATED` | `signup.apiMessages.BANK_INFO_UPDATED` | Bank Info Updated | 은행 정보가 업데이트되었습니다 | useSignupForm.ts | ✅ |
| `INVALID_REFERRAL` | `signup.apiMessages.INVALID_REFERRAL` | Invalid Referral | 유효하지 않은 추천인입니다 | useSignupForm.ts | ✅ |
| `An unexpected error occurred during registration` | `signup.apiMessages.An unexpected error occurred during registration` | An unexpected error occurred during registration. Please t | 등록 중 예기치 않은 오류가 발생했습니다. 다시 시도해 주세요. | useSignupForm.ts | ✅ |
| `POINTS_EXCHANGED` | `point.apiMessages.POINTS_EXCHANGED` | Points converted successfully. | 포인트가 성공적으로 전환되었습니다. | PointConversionModal.vue | ✅ |
| `INSUFFICIENT_POINTS` | `point.apiMessages.INSUFFICIENT_POINTS` | You don't have enough points. | 포인트가 부족합니다. | PointConversionModal.vue | ✅ |
| `MEMBER_NOT_FOUND` | `point.apiMessages.MEMBER_NOT_FOUND` | Member not found. | 회원을 찾을 수 없습니다. | PointConversionModal.vue | ✅ |
| `INTERNAL_ERROR` | `point.apiMessages.INTERNAL_ERROR` | Something went wrong. Please try again. | 오류가 발생했습니다. 다시 시도해 주세요. | PointConversionModal.vue | ✅ |
