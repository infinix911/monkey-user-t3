# Unreleased changes

Use this page for short maintainer-facing release notes. Link each entry to a canonical issue, pull request, source document, or migration when available.

## Unreleased

### Added

- Completed the server-message translation catalog: added a global `apiMessages` namespace (en/ko, in key parity) covering every code `monkey-user-api` surfaces, extended `useApiMessage()` to resolve per-feature → global → generic (with `te()` guards), and added previously-untranslated login/registration codes. Login stays generic (`INVALID_CREDENTIALS`; `INVALID_AUTH` left to the fallback) for anti-enumeration. Added `VALIDATIONERRORS.md` and a KNOWLEDGEBASE server-message note. See ADR-027 (PR #51).
- Game-launch page maps the backend `GAME_LAUNCH_UNAVAILABLE` block token (member wallet exceeds the site cover) to a localized "This game is temporarily unavailable. Please contact your admin for assistance." message (`common.gameUnavailableContactAdmin`, en + ko), wired into the existing `blockMessages` map in `app/pages/[game_type]/[game_id].vue`. Wording is intentionally generic and never names the cover source. See ADR-026 and monkey-user-api ADR-011 (PR #44).

### Changed

- _No entries yet._

### Fixed

- _No entries yet._

### Removed

- _No entries yet._

Record durable architecture decisions in [ADRs](../../DECISIONS.md), not here.
