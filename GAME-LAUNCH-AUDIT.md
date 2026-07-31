# Game launch audit

Investigation of `casino/cd24c827-c63e-4449-b22c-d45fe45e4bdb` not launching,
widened to the HOT / CASINO / SLOT lists. Dated **2026-07-31**.

Evidence is the `game_api_logs` table, which records every provider call with its
raw request and response, plus the `game_lobbies` catalogue and the launch code
paths in `monkey-user-t3` and `monkey-user-api`.

> **Read this first.** Only **6 of the 90 active lobbies have ever been
> launched**, so this is not a pass/fail list of every game. Everything below is
> split into *proven* (there is a logged provider response or a code path that
> cannot succeed) and *unknown* (never attempted). Nothing is guessed.

## Catalogue

| Type | Active lobbies | Bad config | Notes |
| --- | --- | --- | --- |
| CASINO | 19 | 0 | launches by lobby id alone |
| SLOT | 71 | 0 | needs lobby **and** game id |
| MINI | 0 | — | section never renders |
| SPORT | 0 | — | section never renders |

Every active lobby has a `provider` and `provider_code`, and every provider is
one the backend handles. **No launch failure is caused by a malformed lobby row.**

All 90 active lobbies are **HONORLINK**; all 70 **WHITECLIFF** lobbies are
inactive. That migration is the backdrop to the HOT failure below.

---

## CASINO — broken

### 1. DreamGame — provider rejects it

- Lobby `cd24c827-c63e-4449-b22c-d45fe45e4bdb`, provider HONORLINK, code `DreamGame`
- Request: `{"vendor":"DreamGame","game_id":"0","username":"member2"}`
- Response: **404 `"활성화된 게임이 존재하지 않습니다."`** ("no activated game exists")
- 3 attempts, all failed — 26 Jul and again 31 Jul 06:30

The lobby row is valid and active, and the identical request shape succeeds for
other vendors, so this is provider-side: DreamGame is either not enabled for the
agent account, or is published under a different vendor slug than the
`provider_code` we send.

**Fix:** with the provider, not in this codebase.

### 2. Evolution — duplicate lobby, one of them dead

Two active lobbies share `provider_code = 'evolution'`:

| id | name | result |
| --- | --- | --- |
| `009be572-2ccd-4417-97ac-2e9627cf86c1` | evolution | reaches the provider |
| `fc535895-68e2-467b-bea2-fa4c4fc3a56e` | Evolution | **404, same "no activated game" error** |

Whichever the UI links to is chance. The `Evolution` row looks stale and should
be deactivated.

### 3. Evolution — a 200 that the code treats as failure

`009be572` has also returned **HTTP 200** with:

```json
{"message": "Game link is being generated. Retry after few second."}
```

`honorlinkLaunchGame` requires both `user` and `link`, so this falls through to
`PROVIDER_LAUNCH_FAIL` and the member sees the same dead-end error as a genuine
failure — when the correct behaviour is to wait and retry.

**Fix:** in `monkey-user-api/src/game-providers/honorlink.provider.ts` — detect
the "being generated" response and either retry briefly server-side or return a
distinct code the client can show as "try again in a moment".

## CASINO — confirmed working

`Asia Gaming` (`b9936f97-…`) returns a launch link. The remaining **16 active
casino lobbies have never been launched** — status unknown.

---

## SLOT — broken for every provider card

This is a code bug, not a provider one, and it affects **all 71 active slot
lobbies** when opened from the homepage or `/slots`.

A slot provider card is `HomeGameCard game-type="slot"`
(`app/pages/index.vue:40`, `app/pages/slots.vue:35`). Its click handler has a
special case for `sports` — look up the lobby's first sub-game and pass it — then
falls through to:

```js
openGame(`/${props.gameType}/${props.game.id}`)   // → /slot/<lobby-uuid>
```

No game id, and no `lobbyId` query. The launcher
(`app/pages/[game_type]/[game_id].vue:82`) then takes the non-casino branch,
which needs a lobby id it does not have:

- `lobbyId` empty → renders the generic error **without ever calling the API**
- `lobbyId` non-empty only because `authStore.currentGame` is left over from an
  earlier click → calls `/games/launch?lobby=<stale lobby>&game=<this lobby uuid>`,
  and the backend answers **400 `INVALID_GAME_FOR_LOBBY`** because a lobby id is
  not a sub-game id

The backend requires lobby + game for anything that is not CASINO
(`GAME_REQUIRED_FOR_NON_CASINO`), so a slot lobby can never launch by lobby id.

This matches the logs: the only two successful SLOT launches carry real game ids
(`Booongo` `game_id=296`, `PragmaticPlay` `game_id=vs243lionsgold`) — they came
from the HOT list or a lobby's game page, never from a provider card.

**Fix — pick one:**

1. Give slot the same treatment sports already has in `HomeGameCard.handleClick`:
   resolve the lobby's first sub-game and launch `?lobbyId=…`. Cheapest, but
   launching an arbitrary first game is a product decision.
2. Route the card to that provider's game list (`/lobbies/<lobby>/games`) and let
   the member choose. This matches how the working launches actually happen.

Option 2 looks right — a slot provider is a catalogue, not a game.

---

## HOT — every game is broken

**All 50 HOT games 404.** Not a sample: zero HOT games sit on an active lobby.

Reported example:

```
GET /api/games/launch?lobby=d71c81c9-…&game=27d19104-…   → 404
```

- game `27d19104-…` = *Jackpot 6000*, `is_active: true`, `is_hot: true`, and it
  does belong to the lobby it was launched with
- lobby `d71c81c9-…` = *Netent*, provider WHITECLIFF, **`is_active: false`**

`getLaunchableLobby` filters on `is_active = true`, finds nothing, and returns
**404 `LOBBY_NOT_FOUND`** before the provider is contacted. The request itself was
well-formed — the feed is offering games whose lobby is switched off.

### Root cause: a provider migration left the HOT flags behind

| provider | lobbies | active |
| --- | --- | --- |
| HONORLINK | 90 | **all active** |
| WHITECLIFF | 70 | **all inactive** |

The site moved from WHITECLIFF to HONORLINK and every WHITECLIFF lobby was
deactivated — but `is_hot` was never moved to the HONORLINK catalogue. All 50
flags still point at WHITECLIFF games:

| inactive lobby | provider | HOT games |
| --- | --- | --- |
| Netent | WHITECLIFF | 44 |
| Big Time Gaming | WHITECLIFF | 3 |
| Pragmatic Slots | WHITECLIFF | 2 |
| Red Tiger | WHITECLIFF | 1 |

The homepage requests the first 48 by view count — **48 of 48 are dead.**

### Why the feed serves them

`listGames` (`monkey-user-api/src/services/games.services.ts:202`) filters
`gameSubGames.isActive` but never the lobby's. `game_lobbies` is left-joined only
to read its name, so a game stays listed after its lobby is switched off. Across
the whole catalogue that is **7,699 sub-games under inactive lobbies** against
7,822 under active ones.

### Fix — needs both halves

1. **Data (restores the section).** Re-flag `is_hot` on games belonging to
   active HONORLINK lobbies. Until this happens the HOT section has nothing
   legitimate to show.
2. **API (stops it recurring).** Add `eq(gameLobbies.isActive, true)` to
   `listGames`, and make the join an inner join so the filter is sound.

Order matters: shipping the API filter alone makes the HOT section render
**empty**, since no active lobby currently has a HOT game. That is more honest
than 48 dead tiles, but it is a visible change — do the re-flagging first, or
accept an empty section in between.

---

## Untested

84 of 90 active lobbies have never been launched, so their state is genuinely
unknown:

- 16 of 19 CASINO lobbies
- 69 of 71 SLOT lobbies

A sweep would settle it, but it means one real launch call per lobby against the
live provider, which creates provider-side users and links. It needs an
authenticated member session and should be run deliberately, not as a side effect
of debugging.

## Summary

| Item | State | Owner |
| --- | --- | --- |
| CASINO · DreamGame | Broken — provider 404 | Provider account |
| CASINO · Evolution `fc535895` | Broken — provider 404, stale duplicate row | CMS / data |
| CASINO · evolution `009be572` | Intermittent — 200 "being generated" read as failure | `honorlink.provider.ts` |
| CASINO · Asia Gaming | Working | — |
| SLOT · every provider card | Broken — launches without a game id | `HomeGameCard.vue` |
| SLOT · Booongo, PragmaticPlay (via game id) | Working | — |
| **HOT · all 50 games** | **Broken — every one is on an inactive WHITECLIFF lobby** | CMS data + `games.services.ts` |
| MINI, SPORT | 0 active lobbies — sections hidden | CMS / data |

The single most impactful item is HOT: it is the first section on the homepage
and none of it works. The DreamGame report that started this audit is one casino
lobby; the HOT failure is the whole section.
