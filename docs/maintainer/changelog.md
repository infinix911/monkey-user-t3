# Unreleased changes

Use this page for short maintainer-facing release notes. Link each entry to a canonical issue, pull request, source document, or migration when available.

## Unreleased

### Added

- Game-launch page maps the backend `GAME_LAUNCH_UNAVAILABLE` block token (member wallet exceeds the site cover) to a localized "This game is temporarily unavailable. Please contact your admin for assistance." message (`common.gameUnavailableContactAdmin`, en + ko), wired into the existing `blockMessages` map in `app/pages/[game_type]/[game_id].vue`. Wording is intentionally generic and never names the cover source. See ADR-026 and monkey-user-api ADR-011 (PR #44).

### Changed

- _No entries yet._

### Fixed

- _No entries yet._

### Removed

- _No entries yet._

Record durable architecture decisions in [ADRs](../../DECISIONS.md), not here.
