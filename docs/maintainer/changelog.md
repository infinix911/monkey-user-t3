# Unreleased changes

Use this page for short maintainer-facing release notes. Link each entry to a canonical issue, pull request, source document, or migration when available.

## Unreleased

### Added

- Redesigned the **maintenance screen** to follow the active CMS theme instead of a fixed dark/yellow palette: the theme's main background under a body-colour vignette, a dark-glass card framed in `theme.panel.actionColor` with a glow, a gear status chip, copy on the left and the maintenance artwork (`public/designs/misc/maintenance-art.webp`) on the right (stacked on mobile), re-hued to the theme accent by a `color`-blend tint, auto-contrast button text, and a three-item feature row. The `maintenance.*` copy now mirrors monkey-partner's maintenance screen ("Scheduled maintenance" / "시스템 점검 중입니다"), adapted from "partner portal / reports" to "site / balance", plus new `maintenance.features.{stable,improved,better}` labels; routing and the "Try again" reload are unchanged.
- Added a standalone **maintenance screen** (`app/pages/maintenance.vue`, `layout: false`) and a global `maintenance.global.ts` middleware that redirects every page to `/maintenance` while the `maintenance:enabled` site setting is on (and back home when off). The flag is read from the public `/site/settings` payload (`fetchSiteSettings`, cached in the site store) — a read the API keeps reachable during maintenance. The page is brand-locked dark/yellow, keeps the language switcher live (en/ko), renders the live CMS site logo, and shows the optional admin `maintenance:message` override. New `maintenance.*` locale keys (en/ko). Pairs with the monkey-user-api 503 guard; the backend is the hard gate, this is the UX layer.

- Completed the server-message translation catalog: added a global `apiMessages` namespace (en/ko, in key parity) covering every code `monkey-user-api` surfaces, extended `useApiMessage()` to resolve per-feature → global → generic (with `te()` guards), and added previously-untranslated login/registration codes. Login stays generic (`INVALID_CREDENTIALS`; `INVALID_AUTH` left to the fallback) for anti-enumeration. Added `VALIDATIONERRORS.md` and a KNOWLEDGEBASE server-message note. See ADR-027 (PR #51).
- Game-launch page maps the backend `GAME_LAUNCH_UNAVAILABLE` block token (member wallet exceeds the site cover) to a localized "This game is temporarily unavailable. Please contact your admin for assistance." message (`common.gameUnavailableContactAdmin`, en + ko), wired into the existing `blockMessages` map in `app/pages/[game_type]/[game_id].vue`. Wording is intentionally generic and never names the cover source. See ADR-026 and monkey-user-api ADR-011 (PR #44).

### Changed

- _No entries yet._

### Fixed

- _No entries yet._

### Removed

- _No entries yet._

Record durable architecture decisions in [ADRs](../../DECISIONS.md), not here.
