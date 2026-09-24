# VALIDATIONERRORS.md — monkey-user-t3

> Canonical catalog of the server message **codes** this frontend can receive
> from its paired API (`monkey-user-api`), and how they are shown to members.
> Keep this in sync with the `apiMessages` namespace in
> `i18n/locales/{en,ko}.json` and with the API. See also `KNOWLEDGEBASE.md`.

## Contract

Custom API controllers return, on errors and mutation successes, a body of the shape:

```json
{ "message": "<UPPER_SNAKE_CODE>" }
```

with an HTTP status. Field-level validation failures use `422` with
`{ "message": "VALIDATION_ERROR", "errors": [ { "field", "message" } ] }`. The
**code is the `message` token** — there is no separate machine `code` field.
Better Auth sign-in errors use `{ "code": "<UPPER_SNAKE_CODE>", "message": "<prose>" }`.

## How it is shown (translate-by-code, generic only as fallback)

`useApiMessage()` (`app/composables/useApiMessage.ts`) is the single entry point.
It returns `apiMessage(source, namespace?, fallbackKey?)`, where `source` is the
caught error (either wire shape) or a raw token string:

```ts
const apiMessage = useApiMessage();
// error path (namespace + fallback optional):
showErrorAlert(title, apiMessage(err));
// Login uses resolveLoginError(err) to distinguish credentials, account state,
// network, timeout, and unknown failures.
// success path (token read from response.data.message):
useToast(apiMessage(token));
```

It resolves the code and looks up the per-feature `<namespace>.apiMessages` map
first (when a `namespace` is passed), then the global **`apiMessages`** catalog,
and only returns a **generic** message (`apiMessages.INTERNAL_ERROR` /
`common.error` / an explicit `fallbackKey`) **when the code has no translation
anywhere** — a raw `UPPER_SNAKE` token is never shown to a member. Field-level
`VALIDATION_ERROR` details are surfaced inline by the forms; the toast shows the
code's message.

## Maintenance

- Every custom-controller code MUST have an entry in the `apiMessages` namespace
  of **both** `en.json` and `ko.json`. Sign-in codes use `login.apiMessages` in
  both files. Record all codes in the table below.
- When the API adds/renames a code, update: the API, this table, and both locale
  files. A missing entry degrades to the generic fallback (safe, but untranslated).
- Locales are `en` and `ko` (`ko` is the default). There is no `zh` here.

## Codes

### Auth / Session

| Code                                | i18n key                                        | English                                                                    | 한국어                                                             |
| ----------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `INVALID_CREDENTIALS`               | `apiMessages.INVALID_CREDENTIALS`               | Invalid username or password. Please check your credentials and try again. | 아이디 또는 비밀번호가 올바르지 않습니다. 확인 후 다시 시도하세요. |
| `INVALID_TOKEN`                     | `apiMessages.INVALID_TOKEN`                     | Your session has expired. Please log in again.                             | 세션이 만료되었습니다. 다시 로그인해 주세요.                       |
| `INVALID_USER`                      | `apiMessages.INVALID_USER`                      | Invalid user. Please contact support.                                      | 유효하지 않은 사용자입니다. 고객센터에 문의하세요.                 |
| `SUCCESSFUL_LOGIN`                  | `apiMessages.SUCCESSFUL_LOGIN`                  | Login successful! Welcome back.                                            | 로그인 성공! 다시 오신 것을 환영합니다.                            |
| `SUCCESSFUL_LOGOUT`                 | `apiMessages.SUCCESSFUL_LOGOUT`                 | You have been logged out successfully.                                     | 성공적으로 로그아웃되었습니다.                                     |
| `SUCCESSFUL_REGISTER`               | `apiMessages.SUCCESSFUL_REGISTER`               | Registration successful!                                                   | 회원가입이 완료되었습니다!                                         |
| `TELEGRAM_REGISTRATION_UNAVAILABLE` | `apiMessages.TELEGRAM_REGISTRATION_UNAVAILABLE` | Telegram registration is currently unavailable.                            | 텔레그램 가입은 현재 이용할 수 없습니다.                           |
| `TOKEN_ALREADY_USED_OR_EXPIRED`     | `apiMessages.TOKEN_ALREADY_USED_OR_EXPIRED`     | This link has already been used or has expired.                            | 이 링크는 이미 사용되었거나 만료되었습니다.                        |

> **Login keeps credential failures generic.** Unknown usernames, missing
> credential records, and wrong passwords share the credentials message. After
> password verification, sign-in may return one of the account-status codes
> below. The session-bootstrap code `INVALID_AUTH` remains unmapped.

### Sign-in errors

`/auth/sign-in/username` uses Better Auth's `{ code, message }` error shape.
The login modal translates recognized `code` values through
`login.apiMessages` in both locales. It uses client-only
`LOGIN_NETWORK_ERROR` when there is no HTTP response, `LOGIN_TIMEOUT` for
timeouts, and `LOGIN_UNEXPECTED_ERROR` for unrecognized HTTP errors. A 429
response always shows the rate-limit message.
Network failures, timeouts, and unknown HTTP errors send only the endpoint,
status, and safe machine code to the frontend logger; usernames, passwords, and
raw errors are excluded.

| Code | Meaning |
| --- | --- |
| `INVALID_CREDENTIALS`, `INVALID_USERNAME_OR_PASSWORD`, `INVALID_EMAIL_OR_PASSWORD` | Incorrect or unavailable credentials (401) |
| `ACCOUNT_NEW`, `ACCOUNT_PENDING_APPROVAL`, `ACCOUNT_INACTIVE`, `ACCOUNT_BLOCKED`, `ACCOUNT_BANNED`, `ACCOUNT_REJECTED`, `ACCOUNT_DELETED`, `ACCOUNT_UNAVAILABLE` | Verified credentials, but account cannot sign in (403) |
| `LOGIN_UNAVAILABLE_HERE` | Browser login is restricted for this domain |
| `USERNAME_TOO_SHORT`, `USERNAME_TOO_LONG`, `INVALID_USERNAME`, `PASSWORD_TOO_SHORT`, `EMAIL_NOT_VERIFIED` | Better Auth input or verification failure |
| `TOO_MANY_REQUESTS` | Rate limited (429) |

### Auth / Account

| Code                           | i18n key                                   | English                                                                       | 한국어                                                               |
| ------------------------------ | ------------------------------------------ | ----------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| `COMMISSION_SETTINGS_UPDATED`  | `apiMessages.COMMISSION_SETTINGS_UPDATED`  | Commission settings updated.                                                  | 커미션 설정이 업데이트되었습니다.                                    |
| `INVALID_HIERARCHY_PATH`       | `apiMessages.INVALID_HIERARCHY_PATH`       | This agent is unavailable for referrals. Please use a different agent.        | 추천에 사용할 수 없는 에이전트입니다. 다른 에이전트를 이용해 주세요. |
| `INVALID_REFERRAL`             | `apiMessages.INVALID_REFERRAL`             | Invalid Referral                                                              | 유효하지 않은 추천인입니다                                           |
| `MAX_HIERARCHY_DEPTH_EXCEEDED` | `apiMessages.MAX_HIERARCHY_DEPTH_EXCEEDED` | This agent can no longer accept new sign-ups.                                 | 이 에이전트는 더 이상 신규 가입을 받을 수 없습니다.                  |
| `MEMBER_CREATED`               | `apiMessages.MEMBER_CREATED`               | Account created successfully.                                                 | 계정이 생성되었습니다.                                               |
| `MEMBER_NOT_FOUND`             | `apiMessages.MEMBER_NOT_FOUND`             | Member Not Found                                                              | 회원 정보를 찾을 수 없습니다                                         |
| `PASSWORD_NOT_SAME`            | `apiMessages.PASSWORD_NOT_SAME`            | New passwords do not match.                                                   | 새 비밀번호가 일치하지 않습니다.                                     |
| `PASSWORD_TOO_SHORT`           | `apiMessages.PASSWORD_TOO_SHORT`           | Password must be at least 6 characters.                                       | 비밀번호는 6자 이상이어야 합니다.                                    |
| `PASSWORD_UPDATED`             | `apiMessages.PASSWORD_UPDATED`             | Password updated successfully.                                                | 비밀번호가 성공적으로 업데이트되었습니다.                            |
| `PHONE_ALREADY_EXISTS`         | `apiMessages.PHONE_ALREADY_EXISTS`         | This phone number is already registered. Please use a different phone number. | 이미 등록된 전화번호입니다. 다른 전화번호를 사용해 주세요.           |
| `PHONE_ALREADY_TAKEN`          | `apiMessages.PHONE_ALREADY_TAKEN`          | This phone number is already registered. Please use a different phone number. | 이미 등록된 전화번호입니다. 다른 번호를 사용해 주세요.               |
| `PROFILE_UPDATED`              | `apiMessages.PROFILE_UPDATED`              | Profile updated successfully.                                                 | 프로필이 업데이트되었습니다.                                         |
| `USERNAME_ALREADY_TAKEN`       | `apiMessages.USERNAME_ALREADY_TAKEN`       | This username is already taken. Please choose a different username.           | 이미 사용 중인 아이디입니다. 다른 아이디를 선택해 주세요.            |

### Balance / Roll

| Code                     | i18n key                             | English                                      | 한국어                                |
| ------------------------ | ------------------------------------ | -------------------------------------------- | ------------------------------------- |
| `INSUFFICIENT_BALANCE`   | `apiMessages.INSUFFICIENT_BALANCE`   | Insufficient Balance                         | 잔액이 부족합니다                     |
| `INSUFFICIENT_POINTS`    | `apiMessages.INSUFFICIENT_POINTS`    | You don't have enough points.                | 포인트가 부족합니다.                  |
| `INSUFFICIENT_ROLL`      | `apiMessages.INSUFFICIENT_ROLL`      | Insufficient Roll                            | 롤링 금액 부족                        |
| `ROLL_REQUIREMENT_ERROR` | `apiMessages.ROLL_REQUIREMENT_ERROR` | You need to bet more to be able to withdraw. | 출금하려면 더 많은 배팅이 필요합니다. |

### Deposit

| Code                             | i18n key                                     | English                                                               | 한국어                                                    |
| -------------------------------- | -------------------------------------------- | --------------------------------------------------------------------- | --------------------------------------------------------- |
| `DEPOSIT_ALREADY_PENDING`        | `apiMessages.DEPOSIT_ALREADY_PENDING`        | You already have a pending deposit request.                           | 이미 대기 중인 입금 요청이 있습니다.                      |
| `DEPOSIT_COOLDOWN_ACTIVE`        | `apiMessages.DEPOSIT_COOLDOWN_ACTIVE`        | You recently requested a deposit. Please try again after few minutes. | 최근에 입금을 요청하셨습니다. 잠시 후 다시 시도해 주세요. |
| `DEPOSIT_REQUEST_SUCCESS`        | `apiMessages.DEPOSIT_REQUEST_SUCCESS`        | Deposit request submitted successfully!                               | 입금 요청이 성공적으로 제출되었습니다!                    |
| `DEPOSIT_WITHDRAWAL_NOT_ALLOWED` | `apiMessages.DEPOSIT_WITHDRAWAL_NOT_ALLOWED` | Deposits and withdrawals are currently unavailable.                   | 현재 입출금을 이용할 수 없습니다.                         |

### Withdrawal

| Code                          | i18n key                                  | English                                                                     | 한국어                                                       |
| ----------------------------- | ----------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `WITHDRAWAL_COOLDOWN_ACTIVE`  | `apiMessages.WITHDRAWAL_COOLDOWN_ACTIVE`  | You recently requested a withdrawal. Please try again in a few minutes.     | 최근에 출금을 요청하셨습니다. 잠시 후 다시 시도해 주세요.    |
| `WITHDRAWAL_PASSWORD_UPDATED` | `apiMessages.WITHDRAWAL_PASSWORD_UPDATED` | Withdrawal password updated successfully.                                   | 출금 비밀번호가 업데이트되었습니다.                          |
| `WITHDRAWAL_REQUEST_SUCCESS`  | `apiMessages.WITHDRAWAL_REQUEST_SUCCESS`  | Withdrawal request submitted successfully! Your request is being processed. | 출금 요청이 성공적으로 제출되었습니다! 요청이 처리 중입니다. |

### Points

| Code                             | i18n key                                     | English                                               | 한국어                               |
| -------------------------------- | -------------------------------------------- | ----------------------------------------------------- | ------------------------------------ |
| `POINTS_EXCHANGED`               | `apiMessages.POINTS_EXCHANGED`               | Points converted successfully.                        | 포인트가 성공적으로 전환되었습니다.  |
| `POINT_EXCHANGE_COOLDOWN_ACTIVE` | `apiMessages.POINT_EXCHANGE_COOLDOWN_ACTIVE` | Point conversion is available once every {n} minutes. | 포인트 전환은 {n}분 마다 가능합니다. |
| `POINT_TRANSFER_COMPLETED`       | `apiMessages.POINT_TRANSFER_COMPLETED`       | Point transfer completed.                             | 포인트 전송이 완료되었습니다.        |

### Wallet

| Code                        | i18n key                                | English                    | 한국어                      |
| --------------------------- | --------------------------------------- | -------------------------- | --------------------------- |
| `WALLET_TRANSFER_COMPLETED` | `apiMessages.WALLET_TRANSFER_COMPLETED` | Wallet transfer completed. | 지갑 전송이 완료되었습니다. |

### Game

| Code                           | i18n key                                   | English                                                           | 한국어                                                    |
| ------------------------------ | ------------------------------------------ | ----------------------------------------------------------------- | --------------------------------------------------------- |
| `GAME_LAUNCH_UNAVAILABLE`      | `apiMessages.GAME_LAUNCH_UNAVAILABLE`      | This game is currently unavailable. Please check with your admin. | 현재 게임을 이용할 수 없습니다. 관리자에게 문의해 주세요. |
| `GAME_REQUIRED_FOR_NON_CASINO` | `apiMessages.GAME_REQUIRED_FOR_NON_CASINO` | Please select a game to play.                                     | 플레이할 게임을 선택해 주세요.                            |
| `GAME_RESTRICTED`              | `apiMessages.GAME_RESTRICTED`              | This game is not available for your account.                      | 이 게임은 회원님의 계정에서 이용할 수 없습니다.           |
| `LOBBY_NOT_FOUND`              | `apiMessages.LOBBY_NOT_FOUND`              | Game lobby not found.                                             | 게임 로비를 찾을 수 없습니다.                             |
| `PROVIDER_CREATE_USER_FAIL`    | `apiMessages.PROVIDER_CREATE_USER_FAIL`    | Could not start the game. Please try again later.                 | 게임을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.    |
| `PROVIDER_LAUNCH_FAIL`         | `apiMessages.PROVIDER_LAUNCH_FAIL`         | Failed to launch game. Please try again.                          | 게임 실행에 실패했습니다. 다시 시도해 주세요.             |

### Inquiry

| Code                          | i18n key                                  | English                              | 한국어                             |
| ----------------------------- | ----------------------------------------- | ------------------------------------ | ---------------------------------- |
| `INQUIRY_NOT_FOUND`           | `apiMessages.INQUIRY_NOT_FOUND`           | Inquiry not found.                   | 문의를 찾을 수 없습니다.           |
| `INQUIRY_READ_STATUS_UPDATED` | `apiMessages.INQUIRY_READ_STATUS_UPDATED` | Inquiry marked as read.              | 문의가 읽음으로 표시되었습니다.    |
| `INQUIRY_REPLIED`             | `apiMessages.INQUIRY_REPLIED`             | Inquiry Replied                      | 문의에 답변했습니다                |
| `INQUIRY_STATUS_UPDATED`      | `apiMessages.INQUIRY_STATUS_UPDATED`      | Inquiry status updated successfully. | 문의 상태가 업데이트되었습니다.    |
| `INQUIRY_UNREAD`              | `apiMessages.INQUIRY_UNREAD`              | Inquiry marked as unread.            | 문의를 읽지 않음으로 표시했습니다. |

### Notifications

| Code               | i18n key                       | English                | 한국어                       |
| ------------------ | ------------------------------ | ---------------------- | ---------------------------- |
| `NOTICE_NOT_FOUND` | `apiMessages.NOTICE_NOT_FOUND` | Notice not found.      | 공지사항을 찾을 수 없습니다. |
| `NOTIF_NOT_FOUND`  | `apiMessages.NOTIF_NOT_FOUND`  | Notification Not Found | 알림을 찾을 수 없습니다      |
| `NOTIF_READ`       | `apiMessages.NOTIF_READ`       | Notification Read      | 알림 읽음 처리               |

### File / Upload

| Code                    | i18n key                            | English                                               | 한국어                                                        |
| ----------------------- | ----------------------------------- | ----------------------------------------------------- | ------------------------------------------------------------- |
| `FILE_EMPTY`            | `apiMessages.FILE_EMPTY`            | The file is empty. Please upload a valid file.        | 파일이 비어 있습니다. 올바른 파일을 업로드해 주세요.          |
| `FILE_TOO_LARGE`        | `apiMessages.FILE_TOO_LARGE`        | File is too large. Please upload a smaller file.      | 파일이 너무 큽니다. 더 작은 파일을 업로드해 주세요.           |
| `FILE_TYPE_NOT_ALLOWED` | `apiMessages.FILE_TYPE_NOT_ALLOWED` | File type is not allowed. Please upload a valid file. | 허용되지 않는 파일 형식입니다. 유효한 파일을 업로드해 주세요. |
| `RECEIPT_NOT_AVAILABLE` | `apiMessages.RECEIPT_NOT_AVAILABLE` | The receipt is not available.                         | 영수증을 이용할 수 없습니다.                                  |
| `UPLOAD_FAILED`         | `apiMessages.UPLOAD_FAILED`         | File upload failed. Please try again.                 | 파일 업로드에 실패했습니다. 다시 시도해 주세요.               |
| `UPLOAD_SUCCESS`        | `apiMessages.UPLOAD_SUCCESS`        | File uploaded successfully.                           | 파일이 성공적으로 업로드되었습니다.                           |

### General

| Code                          | i18n key                                  | English                                                 | 한국어                                                          |
| ----------------------------- | ----------------------------------------- | ------------------------------------------------------- | --------------------------------------------------------------- |
| `IDEMPOTENCY_KEY_REUSED`      | `apiMessages.IDEMPOTENCY_KEY_REUSED`      | This request was already submitted. Please try again.   | 이미 처리된 요청입니다. 다시 시도해 주세요.                     |
| `INTERNAL_ERROR`              | `apiMessages.INTERNAL_ERROR`              | An internal error occurred. Please try again later.     | 내부 오류가 발생했습니다. 잠시 후 다시 시도하세요.              |
| `INVALID_CURRENT_PASSWORD`    | `apiMessages.INVALID_CURRENT_PASSWORD`    | Current password is incorrect.                          | 현재 비밀번호가 올바르지 않습니다.                              |
| `INVALID_GAME`                | `apiMessages.INVALID_GAME`                | Invalid game selected.                                  | 유효하지 않은 게임이 선택되었습니다.                            |
| `INVALID_GAME_FOR_LOBBY`      | `apiMessages.INVALID_GAME_FOR_LOBBY`      | This game is not available in the selected lobby.       | 선택한 로비에서 이 게임을 사용할 수 없습니다.                   |
| `INVALID_WITHDRAWAL_PASSWORD` | `apiMessages.INVALID_WITHDRAWAL_PASSWORD` | Your current withdrawal password is incorrect.          | 현재 출금 비밀번호가 올바르지 않습니다.                         |
| `NOT_FOUND`                   | `apiMessages.NOT_FOUND`                   | Session not found. Please request a new QR code.        | 세션을 찾을 수 없습니다. 새 QR 코드를 요청해 주세요.            |
| `RATE_LIMITED`                | `apiMessages.RATE_LIMITED`                | Too many requests. Please slow down and try again.      | 요청이 너무 많습니다. 잠시 후 다시 시도해 주세요.               |
| `VALIDATION_ERROR`            | `apiMessages.VALIDATION_ERROR`            | Invalid input. Please check your details and try again. | 입력값이 올바르지 않습니다. 내용을 확인하고 다시 시도해 주세요. |

### Bank

| Code                         | i18n key                                 | English                                                                       | 한국어                                                  |
| ---------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------- |
| `BANK_ACCOUNT_ALREADY_TAKEN` | `apiMessages.BANK_ACCOUNT_ALREADY_TAKEN` | This bank account is already registered. Please use a different bank account. | 이미 등록된 은행 계좌입니다. 다른 계좌를 사용해 주세요. |
| `BANK_ALREADY_EXISTS`        | `apiMessages.BANK_ALREADY_EXISTS`        | Bank Already Exists                                                           | 이미 등록된 은행입니다                                  |
| `BANK_DETAIL_UPDATED`        | `apiMessages.BANK_DETAIL_UPDATED`        | Bank details updated.                                                         | 은행 정보가 업데이트되었습니다.                         |

> Note: the API also returns `GOOD` from the health endpoint — it is not a
> member-facing message and is intentionally omitted from `apiMessages`.
