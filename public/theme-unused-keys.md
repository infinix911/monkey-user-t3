# `theme.json` unused-key analysis

Analysis of `public/theme.json` (the local override served by
`server/routes/api/site/config/theme.ts` for `GET /api/site/config/theme`).

## Method

A key is **used** only if it is consumed by the public site. Two authorities
were cross-checked for every leaf path:

1. **The canonical contract** — the typed `SiteConfig` interface and
   `getDefaultThemeConfig()` in `app/composables/useDefaultThemeConfig.ts`.
   Per `CLAUDE.md`, the theme document is deep-merged onto this base and any
   path **not** in the contract is *silently ignored*.
2. **Real code references** — `grep` across `app/` and `server/`, because the
   interface is not fully exhaustive (see "kept" notes below).

A key is classified **dead** only when it is *both* out-of-contract *and* has
zero production references.

## Context

Two whole domains were removed from this fork (see `CLAUDE.md` → "Togel + QRIS
removed"):

- **Togel (lottery)** — pages, stores, services, schemas, and its theme tokens.
  The shared panel tokens that lived under `theme.togel.*` moved to
  `theme.panel.*`.
- **QRIS** payment method — the deposit tab and its assets.

Every dead key below is residue from those two removals, plus one out-of-contract
object and one misspelled key.

## Verified **used** — kept even though they look removable

| Path | Kept because |
|------|--------------|
| `seo.general.ampTag`, `seo.general.ampPageRedirect` | Read by `app/composables/useSeoHead.ts` (`generalCfg?.ampTag` / `ampPageRedirect`). Not in the `SeoGeneralConfig` interface, but genuinely consumed. |
| `assets.images.girlGif` | Read by `app/layouts/default.vue:250`. |
| `theme.logoStyles.loginModal.width` | `logoStyles.*` are `CssStyleMap` (`Record<string,string>`) — any CSS key is valid and applied as inline style. |
| `theme.nav.icons.virtual`, `theme.nav.icons.fishing` | Present in the canonical `getDefaultThemeConfig()` nav-icon set. |

## Unused keys removed (72 total)

### 1. `theme.togel.*` — entire object (39 keys)
Togel removed; the surviving panel tokens live under `theme.panel.*` (which this
file does not even set). No code reads `theme.togel`.

`textColor`, `infoIconBg`, `resultType`, `actionColor`, `ballBgColor`,
`borderColor`, `cardBgColor`, `infoTableBg`, `panelBorder`, `infoFooterBg`,
`panelGradient`, `headerGradient`, `infoPanelBorder`, `infoTableBorder`,
`sidebarGradient`, `gameTypeBtnBorder`, `infoTableHeaderBg`, `submitButtonColor`,
`gameHeaderGradient`, `gameTypeBtnGradient`, `contentPanelGradient`,
`gameTypeBtnHoverGlow`, `submitButtonGradient`, `sidebarHeaderGradient`,
`tableHeaderBackground`, `gameTypeBtnHoverBorder`, `gameTypeBtnHoverShadow`,
`sidebarContentGradient`, `submitButtonColorHover`, `gameTypeBtnActiveBorder`,
`gameTypeBtnActiveShadow`, `gameTypeBtnHoverGradient`, `gameTypeBtnActiveGradient`,
`sidebarHeaderHoverGradient`, `submitButtonGradientTriple`,
`gameTypeBtnHoverGradient`, `infoTableBorder`, `submitButtonGradient` … (all 39).

### 2. `assets.togel.*` — entire object (19 keys)
Togel domain removed.

`logo`, `mainBg`, `coinIcon`, `fallback`, `background`, `providerPath`,
`aturanMobileIcon`, `cardNameBarStyle`, `cardNameBarTextColor`,
`cardNameBarTextMarginTop`, and `navigation.{aturan, normor, invoice, meanang,
aturanActive, hadiahActive, normorActive, invoiceActive, meanangActive}`.

### 3. `assets.navIcons.menuItems.*` — entire object (8 keys)
Not in the contract. Production nav icons come from `theme.nav.icons.*`
(`Navbar.vue`). `menuItems` only appears in a stale e2e fixture and a historical
comment in `server/routes/sitemap.xml.ts`.

`hot.icon`, `mini.icon`, `slots.icon`, `togel.icon`, `casino.icon`,
`sports.icon`, `fishing.icon`, `virtual.icon`.

### 4. `assets.transaction.*` — QRIS keys (3)
QRIS payment removed.

`qris`, `qrisYellow`, `qrisIconSvg`.

### 5. `theme.nav.icons.togel` (1)
Togel removed; `Navbar.vue` renders hot/slot/casino/sport/mini/fishing only.

### 6. `assets.homepage.gameBg.togel` (1)
Togel removed; the canonical `gameBg` set has casino/sport/sportRatio/slot only.

### 7. `theme.nav.gifActiveBorder` (1)
Misspelled key — the code reads `theme.nav.activeGifBorder`
(`Navbar.vue`). This spelling is never read. (Also inert here because
`theme.nav.type` is `"png"`, so gif chrome isn't rendered at all.)

## Result

- **Removed:** 72 dead keys (the 7 groups above).
- **After:** `theme.json` re-validated as well-formed JSON; a `grep` for
  `togel` / `qris` / `menuItems` / `gifActiveBorder` returns nothing. Every
  remaining path matches the `SiteConfig` contract or is verified in-code.
