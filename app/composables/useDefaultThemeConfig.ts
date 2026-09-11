/**
 * Template3 Site Configuration
 *
 * Source-of-truth schema that the admin CMS will populate (via
 * /api/site/config/userpage, deep-merged in useSiteConfig.ts). The interface
 * below is the full contract: every leaf is typed and documented with what it
 * controls, where it appears in the UI, and the value format. The 6 top-level
 * groups map 1:1 to CMS tabs:
 *
 *   identity     → "Identity"     site name, document title, slug, logos, favicon, description
 *   theme        → "Theme"        colors / gradients / layout tokens
 *   assets       → "Assets"       images, nav icons, homepage art, transaction, pwa
 *   contact      → "Contact"      channel icons + handles
 *   integrations → "Integrations" tawk.to (+ future widgets)
 */

/** A CSS inline-style map (camelCase or kebab-case keys → CSS value strings). */
type CssStyleMap = Record<string, string>;

// ───────────────────────────────────────────────────────────────────────────
// identity
// ───────────────────────────────────────────────────────────────────────────

/** Brand identity: name, slug, logos, favicon, and description. */
export interface IdentityConfig {
    /** Brand display name. Used in headers and as the document-title fallback. Plain text. */
    siteName: string;
    /**
     * Document `<title>` — browser tab, bookmarks, task switcher. Falls back to
     * `siteName` when empty. Plain text.
     */
    documentTitle: string;
    /** Internal brand slug (e.g. "ocean"). Selects backend asset buckets/paths. Lowercase string. */
    slug: string;
    /** Primary brand logo. Header, modals, share image fallback. Public asset path or absolute URL. */
    logo: string;
    /** Mobile/compact logo variant shown in the mobile header. Public asset path or absolute URL. */
    logoMobile: string;
    /** Logo shown inside popups/announcement modals. Public asset path or absolute URL. */
    logoPopup: string;
    /** Marketing description. CMS copy; no reader in the app today. Plain text. */
    description: string;
    /** Favicon (browser tab icon). Public asset path or absolute URL. */
    favicon: string;
}

// ───────────────────────────────────────────────────────────────────────────
// theme
// ───────────────────────────────────────────────────────────────────────────

/** Announcement marquee styling (desktop banner + mobile bar). */
export interface ThemeAnnouncementConfig {
    /** Scrolling announcement message text. Plain text (empty = none / CMS-driven). */
    text: string;
    /**
     * Stroke (outline) color of the scrolling announcement text. Hex color;
     * empty means no outline — the text renders in `textFill` alone.
     */
    textStroke: string;
    /** Fill color of the scrolling announcement text. Hex color. */
    textFill: string;
    /** Desktop announcement bar background. CSS linear-gradient string. */
    desktopGradient: string;
    /** Mobile announcement bar background. CSS color or linear-gradient string. */
    mobileBg: string;
    /** Leading icon on the mobile announcement bar. Public asset path or absolute URL. */
    mobileIcon: string;
}

/** Inline-style overrides applied to the logo `<img>`/container in each surface. */
export interface ThemeLogoStylesConfig {
    /** Login modal logo container positioning. CSS style map. */
    loginModalContainer: CssStyleMap;
    /** Login modal logo image sizing. CSS style map. */
    loginModal: CssStyleMap;
    /** Profile modal logo image sizing. CSS style map. */
    profileModal: CssStyleMap;
    /** Desktop header logo image sizing. CSS style map. */
    desktopHeader: CssStyleMap;
    /** Mobile header logo image sizing. CSS style map. */
    mobileHeader: CssStyleMap;
}

/**
 * How the per-category nav icons are rendered.
 * - `png` → current site behaviour: masked silhouette tinted by
 *           `activeItemColor`/`#fff` (default, back-compat).
 * - `gif` → Lucky-nuxt layout: a 3-layer stack of `gifBg` tile + `gifBorder`
 *           frame + the per-category icon, no tint, no text label. The active
 *           item crossfades to the active icon + `activeGifBg` + `activeGifBorder`.
 * Future: `svg` | `lottie` | `video`.
 */
export type NavIconsType = "png" | "gif";

/** Per-category base nav icon paths. Keyed by API category (slot/sport). */
export interface NavIconsConfig {
    /** "Hot"/featured nav icon. Public asset path or absolute URL. */
    hot: string;
    /** Slot nav icon. Public asset path or absolute URL. */
    slot: string;
    /** Casino nav icon. Public asset path or absolute URL. */
    casino: string;
    /** Sport nav icon. Public asset path or absolute URL. */
    sport: string;
    /** Mini games nav icon. Public asset path or absolute URL. */
    mini: string;
    /** Fishing nav icon. Public asset path or absolute URL. */
    fishing: string;
    /** Virtual sports nav icon. Public asset path or absolute URL. */
    virtual: string;
}

/**
 * `gif`-mode hover/active per-category icons. The selected item (and the
 * hovered item — hover and active share the same look) crossfades its icon to
 * these; each falls back to its base icon when unset. Provided by the CMS API
 * (no bundled default).
 */
export interface NavActiveKeysConfig {
    hot?: string;
    slot?: string;
    casino?: string;
    sport?: string;
    mini?: string;
    fishing?: string;
    virtual?: string;
}

/** Top navigation bar colors/gradients (default + sticky states). */
export interface ThemeNavConfig {
    /** Gradient behind the centred desktop header while it is at the top. */
    headerBgGradient: string;
    /**
     * Artwork painted across the top header bar, above `stickyBg` and below
     * the logo/auth row. Public asset path or absolute URL.
     *
     * EMPTY STRING DISABLES IT — the header then renders exactly as it did
     * before this token existed (plain `stickyBg`), so an operator who does
     * not set artwork loses nothing. Separate from `headerBgGradient`
     * because that one binds to `backgroundColor`, which ignores a `url()`.
     */
    headerBG: string;
    /** Top nav background in its default (non-scrolled) state. Hex color. */
    defaultBg: string;
    /** Top nav background once the page is scrolled (sticky). CSS color (rgba allowed). */
    stickyBg: string;
    /** Color of the active/selected top-nav item label. Hex color. */
    activeItemColor: string;
    /** Background of the deposit section embedded in the nav. CSS linear-gradient string. */
    depositSectionGradient: string;
    /** How the per-category icons render. "png" (masked silhouette) | "gif" (3-layer). */
    type: NavIconsType;
    /** `gif`-mode background tile (z-0), inactive state. Public asset path or absolute URL. */
    gifBg?: string;
    /** `gif`-mode background tile (z-0) for the active/hover state. Public asset path or absolute URL. */
    activeGifBg?: string;
    /** `gif`-mode border frame (z-10), inactive state. Public asset path or absolute URL. */
    gifBorder?: string;
    /** `gif`-mode border frame for the active/hover state (API: `activeGifBorder`). Public asset path or absolute URL. */
    activeGifBorder?: string;
    /** Per-category base nav icon paths. */
    icons: NavIconsConfig;
    /** `gif`-mode active/hover per-category icons (provided by the CMS API). */
    activeKeys?: NavActiveKeysConfig;
}

/** Section header band styling (e.g. "Hot Games" headers). */
export interface ThemeSectionHeaderConfig {
    /** Section header band background. CSS linear-gradient string. */
    gradient: string;
}

/** Auth button (login/signup) backgrounds and text gradients. */
export interface ThemeAuthButtonConfig {
    /** Login button background (padding-box + border-box gradient). CSS background shorthand string. */
    loginBg: string;
    /** Login button border declaration. CSS border shorthand string. */
    loginBorder: string;
    /**
     * Login button border gradient, composed onto `loginBg`'s border-box layer
     * when that value carries only a fill. CSS linear-gradient string.
     */
    loginBorderGradient: string;
    /** Login button label gradient (clipped to text). CSS linear-gradient string. */
    loginTextGradient: string;
    /** Signup button background (padding-box + border-box gradient). CSS background shorthand string. */
    signupBg: string;
    /** Signup button border declaration. CSS border shorthand string. */
    signupBorder: string;
    /**
     * Signup button border gradient, composed onto `signupBg`'s border-box
     * layer when that value carries only a fill. CSS linear-gradient string.
     */
    signupBorderGradient: string;
    /** Background of the mobile auth section housing the buttons. CSS linear-gradient string. */
    mobileAuthSectionBg: string;
}

/** Miscellaneous UI control colors. */
export interface ThemeUiConfig {
    /** Background of the language-selector dropdown control. Hex color. */
    langSelectorBg: string;
}

/** Deposit/withdraw modal accent + primary-action button colors. */
export interface ThemeTransactionModalConfig {
    /** Accent color: active payment tab label/strip + selected quick-amount ring. Hex color. */
    accentColor: string;
    /** Primary action button background. Hex color. */
    buttonBgColor: string;
    /** Primary action button background on hover. Hex color. */
    buttonBgHoverColor: string;
    /** Primary action button text color. Hex color. */
    buttonTextColor: string;
    /** Primary action button gradient (overrides buttonBgColor). CSS gradient string. */
    buttonGradientColor: string;
    /** Primary action button gradient on hover. CSS gradient string. */
    buttonGradientHoverColor: string;
    /** Modal panel + scroll-area background. Hex color. */
    modalBgColor: string;
    /** Accent border on the modal panel. Hex color. */
    borderColor: string;
    /** Quick-amount chip background. Hex color. */
    quickAmountBgColor: string;
    /** Quick-amount chip background on hover. Hex color. */
    quickAmountBgHoverColor: string;
    /** Quick-amount chip text color. Hex color. */
    quickAmountTextColor: string;
    /** Text-field (amount/voucher/etc.) background. Hex color. */
    inputBgColor: string;
    /** Text-field border. Hex color. */
    inputBorderColor: string;
    /** Text-field text color. Hex color. */
    inputTextColor: string;
    /** Text-field placeholder color. Shared by deposit/withdraw/signup modals. Hex color. */
    inputPlaceholderColor: string;
    /** Show the title text alongside the deposit modal image. */
    showDepositImageTitle: boolean;
    /** Show the title text alongside the withdrawal modal image. */
    showWithdrawalImageTitle: boolean;
}

/**
 * Login modal theme — panel border/glow + primary (Login) button. Kept separate
 * from `transactionmodal` so the login screen can be re-skinned independently of
 * the deposit/withdraw modals.
 */
export interface ThemeLoginModalConfig {
    /** Modal panel background. Hex color. */
    modalBgColor: string;
    /** Accent color: border corners, input focus ring, sign-up link. Hex color. */
    accentColor: string;
    /** Accent border on the modal panel (border mid stop). Hex color. */
    borderColor: string;
    /** Primary (Login) button text color. Hex color. */
    buttonTextColor: string;
    /** Primary (Login) button gradient. CSS gradient string. */
    buttonGradientColor: string;
    /** Warm top glow band behind the logo/header (the `.login-card::before`
     * band). Orange fading to near-black. CSS linear-gradient string. */
    bandGradient: string;
}

/**
 * Signup modal theme — panel border + inputs + primary (Daftar) button. Kept
 * separate from `transactionmodal` so the signup screen can be re-skinned
 * independently of the deposit/withdraw modals.
 */
export interface ThemeSignupModalConfig {
    /** Modal panel background. Hex color. */
    modalBgColor: string;
    /** Accent color: border corners, focus ring, close button, highlights. Hex color. */
    accentColor: string;
    /** Accent border on the modal panel (border mid stop). Hex color. */
    borderColor: string;
    /** Text-field background. Hex color. */
    inputBgColor: string;
    /** Text-field border. Hex color. */
    inputBorderColor: string;
    /** Text-field text color. Hex color. */
    inputTextColor: string;
    /** Text-field placeholder color. Hex color. */
    inputPlaceholderColor: string;
    /** Primary (Daftar) button gradient. CSS gradient string. */
    buttonGradientColor: string;
}

/**
 * Popup banner (promo pop-up) theme — the framed promo cards shown on load.
 * Gradient border + warm header/footer bands + the "Block pop-up" button, all
 * sharing the same orange language as the auth modals but independently
 * skinnable from the CMS.
 */
export interface ThemePopupBannerConfig {
    /** Card panel background. Hex color. */
    modalBgColor: string;
    /** Accent color: gradient border corners, glow, close icon. Hex color. */
    accentColor: string;
    /** Accent border on the card panel (border mid stop). Hex color. */
    borderColor: string;
    /** Warm header/footer band gradient (orange → dark; footer is mirrored). CSS gradient string. */
    bandGradient: string;
    /** "Block pop-up" button background. Hex color. */
    blockButtonBgColor: string;
    /** "Block pop-up" button text color. Hex color. */
    blockButtonTextColor: string;
    /** "Block pop-up" button border color. Hex color. */
    blockButtonBorderColor: string;
}

/**
 * Post-login notice modal theme — the "Selamat Datang / Responsible Gaming"
 * card shown after login. Neutral grey glass look: a subtle light-grey border
 * and a vertical gradient that is light grey at the top and bottom, fading to
 * near-black through the middle. Independent of the orange auth/popup modals.
 */
export interface ThemeNoticeModalConfig {
    /**
     * Master on/off switch for the post-login notice modal. When false the
     * notice never opens, regardless of the notice content published in the CMS.
     */
    enabled: boolean;
    /** Card base/mid background (darkest stop). Hex color. */
    modalBgColor: string;
    /** Card border — subtle light grey. CSS color (rgba allowed). */
    borderColor: string;
    /** Card background gradient: light grey top → dark middle → grey bottom. CSS gradient string. */
    cardGradient: string;
    /** Divider line above the action buttons. CSS color (rgba allowed). */
    dividerColor: string;
    /** "Agree" (Saya Setuju) button colour — text + border. Hex color. */
    agreeColor: string;
    /** "Disagree" (Saya Tidak Setuju) button colour — text + border. Hex color. */
    disagreeColor: string;
}

/** Lobby card frame (border + decorative band). */
export interface ThemeCardFrameConfig {
    /** Card frame outer border color. Hex color. */
    borderColor: string;
    /** Card frame inner background. Hex color. */
    bgColor: string;
    /** Placeholder background shown before the thumbnail loads. Hex color. */
    placeholderBg: string;
    /** Decorative vertical band overlay on the card frame. CSS linear-gradient string. */
    bandGradient: string;
}

/** Color stops for the mobile bottom-nav bar gradient. */
export interface ThemeBottomNavBarGradientStops {
    /** Lightest stop (top highlight) of the bottom-nav bar. Hex color. */
    light: string;
    /** Mid-dark stop of the bottom-nav bar. Hex color. */
    midDark: string;
    /** Stop just past the bar edge. Hex color. */
    postEdge: string;
    /** Darkest stop of the bottom-nav bar. Hex color. */
    dark: string;
}

/** Mobile bottom navigation styling. */
export interface ThemeBottomNavConfig {
    /** Gradient color stops composing the bottom-nav bar. */
    barGradientStops: ThemeBottomNavBarGradientStops;
    /** Background of the raised center promo circle in the bottom nav. CSS linear-gradient string. */
    promoCircleGradient: string;
}

/**
 * Shared theme tokens for the account/activity panels (header band, panels,
 * active tab buttons, table header, action accent). Kept FLAT — consumers read
 * `theme.panel.<leaf>` directly.
 */
export interface ThemePanelConfig {
    /** Content panel background. CSS linear-gradient string. */
    contentPanelGradient: string;
    /** Table header cell background. CSS color (rgba/hex). */
    tableHeaderBackground: string;
    /** Header band background. CSS linear-gradient string. */
    headerGradient: string;
    /** Active/selected tab button background. CSS linear-gradient string. */
    gameTypeBtnActiveGradient: string;
    /** Active/selected tab button border. Hex color. */
    gameTypeBtnActiveBorder: string;
    /** Active/selected tab button box-shadow. CSS box-shadow string. */
    gameTypeBtnActiveShadow: string;
    /** Generic panel background. CSS linear-gradient string. */
    panelGradient: string;
    /** Generic panel border. CSS color (rgba). */
    panelBorder: string;
    /** Accent for active tabs, headings, and link/action text. Hex color. */
    actionColor: string;
}

/** Desktop left-rail shell (lg+ two-column layout). */
export interface ThemeSidebarConfig {
    /** Rail container border color. Hex color (the 1px width is fixed in AppSidebar). */
    borderColor: string;
    /** Rail container background. CSS color (rgba/hex). */
    bg: string;
    /** Rule between the game and account groups. Hex color. */
    divider: string;
    /** Label color for the active route. Hex color. */
    activeItemColor: string;
    /**
     * Outline color of the active row (the 1px width is fixed in AppSidebar,
     * as it is for the rail itself). Hex color; empty means no outline, so the
     * active row is marked by its label colour alone.
     */
    activeItemBorderColor: string;
    /**
     * Row hover background. CSS color (rgba).
     *
     * UNUSED as of the change that made a hovered row wear the ACTIVE row's
     * look — hover now resolves `activeItemColor` / `activeItemBorderColor`
     * instead, so the two states can never drift apart. Kept because the field
     * is part of the CMS theme contract: dropping it means removing it from
     * `theme-schema` in both admin apps too. Setting it has no effect.
     */
    hoverBg: string;
    /**
     * Ordered account-menu items the rail renders below its divider — and the
     * same list the mobile profile modal shows, since both read one config.
     * See {@link ProfileMenuItem}; consumed via `useMenuSettings()`.
     */
    menus: ProfileMenuItem[];
}

/** All colors, gradients, and layout tokens (the "Theme" CMS tab). */
export interface ThemeConfig {
    /** Primary brand color (accents, highlights). Hex color. */
    brandColor: string;
    /** Theme color (PWA theme-color meta, dark chrome). Hex color. */
    themeColor: string;
    /** Page body background. Hex color. */
    bodyBgColor: string;
    /**
     * Aspect ratio of the desktop banner slot. CSS aspect-ratio string.
     *
     * Set this to the BANNER ARTWORK's own ratio, not to a desired height. The
     * slot fits its layers with object-cover, so any gap between this ratio and
     * the artwork's is paid for by cropping the banner (and its overlay) — see
     * BannerPreview.vue.
     */
    desktopBannerAspectRatio: string;
    /** Aspect ratio of the mobile banner slot. Same rule as the desktop one above. */
    mobileBannerAspectRatio: string;
    /**
     * Mobile/tablet header design height, scaled by min(1, vw/786). Read in sync
     * by app.vue (pre-paint), AppHeader, and default.vue. The desktop header
     * takes over at >=850px. px number.
     */
    mobileHeaderHeight: number;
    /** Top margin applied to each top-nav menu item. CSS length string. */
    navMenuItemMarginTop: string;
    /** Announcement marquee styling. */
    announcement: ThemeAnnouncementConfig;
    /** Per-surface logo image/container style overrides. */
    logoStyles: ThemeLogoStylesConfig;
    /** Top navigation bar colors. */
    nav: ThemeNavConfig;
    /** Section header band styling. */
    sectionHeader: ThemeSectionHeaderConfig;
    /** Auth button backgrounds and text gradients. */
    authButton: ThemeAuthButtonConfig;
    /** Deposit/withdraw modal accent + button colors. */
    transactionmodal: ThemeTransactionModalConfig;
    /** Login modal panel border + primary button colors. */
    loginModal: ThemeLoginModalConfig;
    /** Signup modal panel border + input + primary button colors. */
    signupModal: ThemeSignupModalConfig;
    /** Popup promo banner card border + bands + block button colors. */
    popupBanner: ThemePopupBannerConfig;
    /** Post-login notice modal border + grey gradient + agree/disagree buttons. */
    noticeModal: ThemeNoticeModalConfig;
    /** Misc UI control colors. */
    ui: ThemeUiConfig;
    /** Lobby card frame styling. */
    cardFrame: ThemeCardFrameConfig;
    /** Mobile bottom navigation styling. */
    bottomNav: ThemeBottomNavConfig;
    /** Shared account/activity panel theme tokens. */
    panel: ThemePanelConfig;
    /** Desktop left-rail shell (lg+ two-column layout). */
    sidebar: ThemeSidebarConfig;
}

// ───────────────────────────────────────────────────────────────────────────
// assets
// ───────────────────────────────────────────────────────────────────────────

/** Generic site imagery (backgrounds, modal art). */
export interface AssetsImagesConfig {
    /** Gold-tier medal/stone icon (level system, rankings). Public asset path or absolute URL. */
    gold: string;
    /** Bronze-tier level stone icon. Public asset path or absolute URL. */
    bronze: string;
    /** Silver-tier level stone icon. Public asset path or absolute URL. */
    silver: string;
    /** Platinum-tier level stone icon. Public asset path or absolute URL. */
    platinum: string;
    /** Ruby-tier level stone icon. Public asset path or absolute URL. */
    ruby: string;
    /** Sapphire-tier level stone icon. Public asset path or absolute URL. */
    sapphire: string;
    /** Diamond-tier level stone icon ("diamond" level name maps here). Public asset path or absolute URL. */
    diamonds: string;
    /** Full-page background image. Empty string disables it. Public asset path or absolute URL. */
    mainBackground: string;
    /** Whether the main background is fixed (no scroll). Boolean. */
    fixedMainBackground: boolean;
    /** Whether the main background applies on mobile too. Boolean. */
    mainBackgroundMobile: boolean;
    /** Decorative animated "girl" GIF overlay. Empty disables it. Public asset path or absolute URL. */
    girlGif: string;
    /** Login modal background art. Public asset path or absolute URL. */
    loginModalBg: string;
    /** Fallback thumbnail when a game has no image. Public asset path or absolute URL. */
    defaultThumbnail: string;
    /** "Ratio" badge image used on ratio sport lobbies. Public asset path or absolute URL. */
    ratio: string;
    /** Optional decorative media displayed to the left of desktop content. */
    leftDecor: string;
    /** Optional decorative media displayed to the right of desktop content. */
    rightDecor: string;
}

/** Optional fixed decorative media flanking the desktop content column. */
export interface AssetsDecorativeImagesConfig {
    /** Whether either decorative media element is rendered. */
    enabled: boolean;
    /** Positioning and sizing for the left media container. */
    leftContainerStyle: CssStyleMap;
    /** Positioning and sizing for the right media container. */
    rightContainerStyle: CssStyleMap;
    /** Presentation overrides for the left image or video. */
    leftMediaStyle: CssStyleMap;
    /** Presentation overrides for the right image or video. */
    rightMediaStyle: CssStyleMap;
}

/** Top-navigation iconography (was `assets.navigation`). */
export interface AssetsNavIconsConfig {
    /** Optional background behind the nav icon row. Empty = none. Public asset path or absolute URL. */
    background: string;
    /** Right-pointing chevron used in nav rows/submenus. Public asset path or absolute URL. */
    arrowRight: string;
    /**
     * Deposit shortcut icon in the desktop nav deposit/withdraw section.
     * Public asset path or absolute URL.
     */
    depositIcon: string;
    /**
     * Withdraw shortcut icon in the desktop nav deposit/withdraw section.
     * Public asset path or absolute URL.
     */
    withdrawIcon: string;
    /** Gold coin beside the wallet balance in the desktop account bar. Public asset path or absolute URL. */
    walletIcon: string;
    /** Blue "P" beside the point balance in the desktop account bar. Public asset path or absolute URL. */
    pointIcon: string;
    /** Point-conversion (swap) action in the desktop account bar. Public asset path or absolute URL. */
    swapIcon: string;
    /** Wallet-reload action in the desktop account bar. Public asset path or absolute URL. */
    refreshIcon: string;
    /** Notification bell in the desktop account bar. Public asset path or absolute URL. */
    bellIcon: string;
}

/** Deposit/withdraw and banking assets. */
export interface AssetsTransactionConfig {
    /** Base path for bank account-list logos. Absolute URL. */
    bankAccountListPath: string;
    /** Fallback bank account-list image. Public asset path or absolute URL. */
    bankAccountNoImage: string;
    /** Deposit action icon. Public asset path or absolute URL. */
    depositIcon: string;
    /** Withdraw action icon. Public asset path or absolute URL. */
    withdrawIcon: string;
    /** Base path for bank logos. Absolute URL. */
    bankBasePath: string;
    /** Fallback bank logo. Public asset path or absolute URL. */
    bankNoImage: string;
}

/** Lobby card thumbnail backgrounds and borders. */
export interface AssetsLobbyCardConfig {
    /** Mobile thumbnail background base path. Absolute URL. */
    thumbnailBgPathMobile: string;
    /** Web thumbnail background base path. Absolute URL. */
    thumbnailBgPathWeb: string;
    /** Decorative top border of the lobby card. Public asset path or absolute URL. */
    topBorder: string;
    /** Decorative bottom border of the lobby card. Public asset path or absolute URL. */
    bottomBorder: string;
    /**
     * CMS-populated map of pre-rendered thumbnail images keyed by
     * `<gameType><Mobile|Web>` (e.g. `casinoMobile`). Overrides the path-based
     * fallback when present. Each value is a public asset path or absolute URL.
     */
    thumbnail?: Record<string, string>;
}

/** Homepage game-tile logos per category (base path; file resolved per lobby). */
export interface AssetsHomepageGameLogos {
    /** Casino game logos base path. Public asset path or absolute URL. */
    casino: string;
    /** Sports game logos base path. Public asset path or absolute URL. */
    sports: string;
    /** Slot game logos base path. Public asset path or absolute URL. */
    slot: string;
}

/** Homepage decorative character art per category. */
export interface AssetsHomepageGameCharacters {
    /** Casino section character art base path. Public asset path or absolute URL. */
    casino: string;
    /** Sports section character art base path. Public asset path or absolute URL. */
    sports: string;
    /** Slot section character art base path. Public asset path or absolute URL. */
    slot: string;
}

/** Per-lobby custom character art overrides, keyed by lobby UUID.
 *  Empty by default; CMS populates. Overrides the cycled pool for that
 *  lobby only — unlisted lobbies keep the generic cycling character. */
export interface AssetsHomepageGameCharacterOverrides {
    /** Casino: lobby UUID -> character image path/URL. */
    casino: Record<string, string>;
    /** Sports: lobby UUID -> character image path/URL. */
    sports: Record<string, string>;
    /** Slot: lobby UUID -> character image path/URL. */
    slot: Record<string, string>;
}

/** Homepage game-tile background images per category. */
export interface AssetsHomepageGameBg {
    /** Casino tile background. Public asset path or absolute URL. */
    casino: string;
    /** Sports tile background. Public asset path or absolute URL. */
    sport: string;
    /** Sports "ratio" variant tile background. Public asset path or absolute URL. */
    sportRatio: string;
    /** Slot tile background. Public asset path or absolute URL. */
    slot: string;
}

/** Homepage game-tile frame overlays per category. */
export interface AssetsHomepageGameFrame {
    /** Casino tile frame overlay. Public asset path or absolute URL. */
    casino: string;
    /** Sports tile frame overlay. Public asset path or absolute URL. */
    sport: string;
    /** Slot tile frame overlay. Public asset path or absolute URL. */
    slot: string;
}

/**
 * Optional homepage game-section background block.
 * Populated by the admin CMS — disabled by default.
 */
export interface AssetsHomepageGameSectionBg {
    /** Whether the game-section background is rendered. Boolean. */
    enabled: boolean;
    /** Background image. Public asset path or absolute URL. */
    image: string;
    /** Whether the background only applies on mobile. Boolean. */
    mobileOnly: boolean;
    /** Extra desktop CSS properties for the section background. */
    desktopStyle: Record<string, string>;
    /** Extra mobile CSS properties for the section background. */
    mobileStyle: Record<string, string>;
}

/** Homepage game-section artwork (logos, characters, backgrounds, frames). */
export interface AssetsHomepageConfig {
    /** Per-category game logos. */
    gameLogos: AssetsHomepageGameLogos;
    /** Per-category decorative character art. */
    gameCharacters: AssetsHomepageGameCharacters;
    /** Per-lobby character overrides (keyed by lobby UUID); falls back to the
     *  cycled `gameCharacters` pool when a lobby has no override. */
    gameCharacterOverrides: AssetsHomepageGameCharacterOverrides;
    /** Per-category tile backgrounds. */
    gameBg: AssetsHomepageGameBg;
    /** Per-category tile frame overlays. */
    gameFrame: AssetsHomepageGameFrame;
    /**
     * UUIDs of sports lobbies that render the "Ratio X : Y" variant background.
     * Populate when the back-office flags a provider as ratio. Array of UUID strings.
     */
    ratioSportIds: string[];
    /** Optional homepage game-section background block (CMS-populated). */
    gameSectionBg: AssetsHomepageGameSectionBg;
}

/**
 * One profile / "My Account" menu item. Lives in `theme.sidebar.menus`.
 *
 * Carries visibility, page placement, order and an optional icon override. The
 * admin theme editor manages this array (drag-reorder + toggle + page + icon).
 * When the icon is empty, the frontend falls back to
 * {@link PROFILE_MENU_ICON_DEFAULTS} by `key`.
 */
export interface ProfileMenuItem {
    /** Stable item key, e.g. 'referral'. Maps to a translated label + default icon. */
    key: string;
    /** Whether the item is shown on the user-facing site. */
    is_active: boolean;
    /** Which menu page the item belongs to (1 or 2). */
    page: number;
    /** Sort order within its page (ascending). */
    sort: number;
    /** Icon image override (empty = use the bundled default for `key`). */
    image: string;
}

/**
 * Bundled default icons for profile-menu items, keyed by item `key`.
 *
 * Single source of truth for both the bundled `theme.sidebar.menus` default and
 * the runtime icon fallback in `useProfileMenu`. The fallback is required
 * because the CMS theme doc replaces the whole `theme.sidebar.menus` array
 * wholesale (deep-merge does not merge arrays element-wise), and admin items
 * typically carry an empty `image`.
 */
export const PROFILE_MENU_ICON_DEFAULTS = {
    referral: "/designs/my-account/refferal.webp",
    bettingReport: "/designs/my-account/betting-report.webp",
    loginHistory: "/designs/my-account/login-history.webp",
    changePassword: "/designs/my-account/change-password.webp",
    promotions: "/designs/my-account/promotions.webp",
    faq: "/designs/my-account/fandq.webp",
    apk: "/designs/my-account/apk.webp",
    telegram: "/designs/my-account/telegram.webp",
    inquiry: "/designs/my-account/inquiry.webp",
    contact: "/designs/my-account/contact.webp",
    activity: "/designs/menu/activity.webp",
    livechat: "/designs/menu/livechat.webp",
    partner: "/designs/menu/partner.webp",
};

/** PWA manifest icon assets. */
export interface AssetsIconsConfig {
    /** PWA app icons keyed by size (e.g. "192x192"). Map of size → asset path/URL. */
    pwa: Record<string, string>;
}

/** All image/icon assets (the "Assets" CMS tab). */
/**
 * Left-rail iconography. Separate from `navIcons` because the rail uses the
 * flat monochrome set in /designs/navigation, not the top nav's coloured webp
 * icons — the two surfaces are themed independently.
 */
export interface AssetsSidebarIconsConfig {
    /** "Hot"/featured game rail icon. Public asset path or absolute URL. */
    hot: string;
    /** Slot game rail icon. Public asset path or absolute URL. */
    slot: string;
    /** Live casino rail icon. Public asset path or absolute URL. */
    casino: string;
    /** Sports rail icon. Public asset path or absolute URL. */
    sport: string;
    /** Mini games rail icon. Public asset path or absolute URL. */
    mini: string;
    /** Fishing games rail icon. Public asset path or absolute URL. */
    fishing: string;
    /** Virtual games rail icon. Public asset path or absolute URL. */
    virtual: string;
    /** Notice rail icon. Public asset path or absolute URL. */
    notice: string;
    /** Promotion rail icon. Public asset path or absolute URL. */
    promotion: string;
    /** Customer inquiry rail icon. Public asset path or absolute URL. */
    inquiry: string;
    /** Transaction-history rail icon. Public asset path or absolute URL. */
    transaction: string;
    /** Betting-history rail icon. Public asset path or absolute URL. */
    betting: string;
    /** Change-password rail icon. Public asset path or absolute URL. */
    password: string;
    /** Referral rail icon. Public asset path or absolute URL. */
    referral: string;
    /** Login-history rail icon. Public asset path or absolute URL. */
    loginHistory: string;
    /** Activity rail icon. Public asset path or absolute URL. */
    activity: string;
    /** APK install rail icon. Public asset path or absolute URL. */
    apk: string;
    /** Telegram rail icon. Public asset path or absolute URL. */
    telegram: string;
    /** Contact rail icon. Public asset path or absolute URL. */
    contact: string;
    /** Live-chat rail icon. Public asset path or absolute URL. */
    livechat: string;
    /** Slot-RTP rail icon. Public asset path or absolute URL. */
    rtp: string;
}

export interface AssetsConfig {
    /** Generic site imagery. */
    images: AssetsImagesConfig;
    /** Optional decorative images/videos flanking desktop content. */
    decorativeImages: AssetsDecorativeImagesConfig;
    /** Top-navigation iconography (was `navigation`). */
    navIcons: AssetsNavIconsConfig;
    /** Deposit/withdraw and banking assets. */
    transaction: AssetsTransactionConfig;
    /** Lobby card backgrounds and borders. */
    lobbyCard: AssetsLobbyCardConfig;
    /** Homepage game-section artwork. */
    homepage: AssetsHomepageConfig;
    /** PWA manifest icon assets. */
    icons: AssetsIconsConfig;
    /** Desktop left-rail iconography. */
    sidebarIcons: AssetsSidebarIconsConfig;
}

// ───────────────────────────────────────────────────────────────────────────
// contact
// ───────────────────────────────────────────────────────────────────────────

/** Contact handles/numbers shown next to each channel (was `*Text` keys). */
export interface ContactHandlesConfig {
    /** Messenger handle/username. Plain text. */
    messenger: string;
    /** WhatsApp phone number. Plain text. */
    whatsapp: string;
    /** LINE id/handle. Plain text. */
    line: string;
    /** Telegram bot/handle. Plain text. */
    telegram: string;
}

/** Contact channels (the "Contact" CMS tab). */
export interface ContactConfig {
    /** Per-channel contact handles. */
    handles: ContactHandlesConfig;
}

// ───────────────────────────────────────────────────────────────────────────
// integrations
// ───────────────────────────────────────────────────────────────────────────

/** tawk.to live-chat widget identifiers (null disables the widget). */
export interface IntegrationsTawkToConfig {
    /** tawk.to property id. Null = live chat disabled. String or null. */
    propertyId: string | null;
    /** tawk.to widget id. Null = live chat disabled. String or null. */
    widgetId: string | null;
}

/** Third-party widget integrations (the "Integrations" CMS tab). */
export interface IntegrationsConfig {
    /** tawk.to live-chat configuration. */
    tawkTo: IntegrationsTawkToConfig;
}

// ───────────────────────────────────────────────────────────────────────────
// SiteConfig (root)
// ───────────────────────────────────────────────────────────────────────────

/**
 * CMS-authored copy carried inside the site-config document.
 *
 * Distinct from the other groups, which hold styling tokens and asset paths:
 * these are editorial bodies written in the CMS. They ride in the theme blob so
 * this app reads them from the config it already fetches during SSR, with no
 * extra endpoint and no second source of truth.
 *
 * ⚠ This interface is the userpage half of a cross-repo contract — the admin
 * mirrors it in `monkey-admin/app/theme-schema/site-config.ts`. The shapes must
 * match: `useSiteConfig()` silently ignores CMS paths that are absent from this
 * typed default, so a drift shows up as a value that never appears, with no
 * error anywhere.
 */
export interface ContentConfig {
    /**
     * Deposit rules / instructions as an HTML string, authored on the CMS
     * "Deposit Rule" page and rendered in the bank-account card of the deposit
     * modal (BankPaymentContent.vue). Untrusted — sanitize at the render
     * boundary, never here. Empty string means "render nothing".
     */
    depositRule: string;
    /**
     * Admin-authored footer HTML rendered at the bottom of every page by
     * `layouts/default.vue`. Untrusted — sanitize at the render boundary.
     * Empty string means "render nothing".
     */
    footer: string;
}

/** The full bundled site-config contract (7 CMS-tab-aligned groups). */
export interface SiteConfig {
    /** Brand identity. */
    identity: IdentityConfig;
    /** Colors, gradients, and layout tokens. */
    theme: ThemeConfig;
    /** Image and icon assets. */
    assets: AssetsConfig;
    /** Contact channels. */
    contact: ContactConfig;
    /** Third-party widget integrations. */
    integrations: IntegrationsConfig;
    /** CMS-authored copy (deposit rule). */
    content: ContentConfig;
}

/**
 * Slot card character art, pinned per lobby.
 *
 * Without a pin, `resolveLobbyCharacter` cycles the generic pool by a card's
 * POSITION in the row, so which character a provider gets depends entirely on
 * the order the API happens to return lobbies in — two deployments serving the
 * same catalogue can pair the same provider with different art, and any change
 * to the ordering reshuffles the whole page.
 *
 * These pins are the pairing on the reference deployment (kimaktoto), read off
 * its live /slots grid: its cards run `01.webp`..`37.webp` in order, and each
 * entry below maps that card's lobby to the character it carries there. Lobby
 * UUIDs are stable across deployments of this catalogue — the same ids name the
 * provider logo assets in this repo's history — so pinning by id reproduces the
 * reference pairing whatever order our own API returns.
 *
 * The character files are byte-identical to the reference's already; only the
 * pairing needed fixing. Comments carry the provider name because the ids do
 * not: keep them in step when editing.
 *
 * A CMS `assets.homepage.gameCharacterOverrides.slot` entry still wins per lobby
 * (the config merge is per-key), and any lobby not listed here falls back to the
 * cycled pool as before.
 */
const SLOT_CHARACTER_PINS: Record<string, string> = {
    "f814f404-d4da-4527-9c40-3f8d7896de79": "01", // PG Soft
    "d2ab8d39-bd7f-47fe-80b5-0596e1e4e378": "02", // Pragmatic Slots
    "ee39ebdb-e60e-497a-be90-906007df3cbb": "03", // No Limity City
    "8f0ab05d-37cd-4d95-938b-485dfc87d724": "04", // Habanero
    "c4713b9a-a2d9-4357-a54c-d3a2da1a28ef": "05", // Joker
    "ee0f3e3d-1db7-4fb5-bfe1-cb076564614a": "06", // Spade Slots
    "6fc33ddf-d23f-47ba-bc7b-c12b0c8041b0": "07", // Play N Go
    "ec09fc45-7689-4f50-89ea-6d143fd8f854": "08", // Micro Gaming Slots
    "ff5f88f6-12c2-4790-8769-8551c8bcfaeb": "09", // Quickspin
    "4d895741-a0d5-4eaf-8c00-420396590c62": "10", // BNG
    "fce22874-4027-4a53-a822-1a176ee38b54": "11", // World Match
    "c4302402-0d1e-424d-ad85-b38d2f600ba0": "12", // OneTouch
    "a043ea86-5531-4467-b97e-9593632d3e50": "13", // YGGDrasil
    "448faa03-a472-49ca-b49e-3e23f7b1a80b": "14", // CQ9
    "1e00e0a8-4abe-45c6-870d-9503e9bfd69d": "15", // Skywind Slots
    "f711334b-7bd3-4c97-be62-ddc42bcfcd24": "16", // Wazdan
    "81bb5067-1d2c-470a-842c-a2b7d43e5484": "17", // Relax
    "2aba0649-346c-4c5e-bea8-fdaec2db1544": "18", // NextSpin
    "e6285253-4ae0-4b15-b357-727fd5e7c3aa": "19", // Naga
    "543cbf59-91a0-41cc-a97d-b705288c9e84": "20", // Slotmill
    "b3d79198-b254-41e4-bf18-8abe633496f7": "21", // Hacksaw
    "99af7fab-4d7c-425c-88ee-1116c08b109a": "22", // Blueprint
    "001c8371-235e-4d77-9eb4-a00ef115c1da": "23", // JiLi
    "61eaeeaf-dd7a-4a5c-81f9-3b70135ab0be": "24", // Booming
    "f8056220-5286-4ac5-b0a6-d568fecd34cc": "25", // Evoplay
    "f7624c71-3929-4bb9-9e44-47e107364db0": "26", // Smartsoft
    "1893358f-1d6f-45cd-860d-8b0bc6c9fe37": "27", // Octoplay
    "13ffb7a8-74b5-487a-b8e7-511f4335c15c": "28", // VA Gaming
    "136d0c79-23a2-4bcf-bfb4-55b2b4921d8b": "29", // Winfast
    "d3a46904-82e5-47a7-b587-5e957be3c1b8": "30", // Red Tiger
    "d71c81c9-2fbe-46fa-a4b3-f20cafd5ac8a": "31", // Netent
    "9807256f-2e3c-4354-aaf0-3ffbc36c9f7e": "32", // Big Time Gaming
    "960eb0b7-889c-4cce-91aa-221be10c6491": "33", // Playtech
    "dd6c818e-6617-4806-a35a-979d2e35a8a7": "34", // Wonwon
    "92f3b817-a577-42f1-a76a-f1ebeeaacf6b": "35", // CosmoPlay
    "cbb4d9f9-f9b5-46e8-9b87-b9041bbd5bbd": "36", // Oriental Slots
    "81532f7d-c0a6-4a7b-b1e0-903f13978822": "37", // JDB
};

/** The pins as the override map the config exposes (`<base>/NN.webp`). */
const SLOT_CHARACTER_OVERRIDES: Record<string, string> = Object.fromEntries(
    Object.entries(SLOT_CHARACTER_PINS).map(([lobbyId, n]) => [
        lobbyId,
        `/designs/template-3/slots-character/${n}.webp`,
    ]),
);

/**
 * PWA app icons. Every entry below declares a SQUARE size, so this is the
 * square mark cropped from the brand wordmark rather than the wordmark
 * itself, which runs 5.6:1 and would be squashed at each of them.
 */
const JAE_ICON = "/designs/logo/ocean-icon.png";
const PWA_ICONS = {
    "72x72": JAE_ICON,
    "96x96": JAE_ICON,
    "128x128": JAE_ICON,
    "144x144": JAE_ICON,
    "152x152": JAE_ICON,
    "192x192": JAE_ICON,
    "384x384": JAE_ICON,
    "512x512": JAE_ICON,
} as const;

/**
 * Get Template3 site configuration
 *
 * @returns {SiteConfig} Template3 site configuration
 */
export const getDefaultThemeConfig = (): SiteConfig => {
    const siteName = "Jae";
    return {
        // ───────────────────────────────────────────────────────────────────
        // identity — site name, slug, logos, favicon, description
        // ───────────────────────────────────────────────────────────────────
        identity: {
            siteName,
            documentTitle: `Play Online Casino Games, Slots & Live Dealer | ${siteName}`,
            slug: "ocean",
            logo: "/designs/logo/ocean.webp",
            logoMobile: "/designs/logo/ocean.webp",
            logoPopup: "/designs/logo/ocean.webp",
            description: `Experience the best online gaming experience with ${siteName}`,
            favicon: "/designs/logo/ocean-icon.png",
        },

        // ───────────────────────────────────────────────────────────────────
        // theme — colors, gradients, layout tokens
        // ───────────────────────────────────────────────────────────────────
        theme: {
            brandColor: "#D9A441",
            themeColor: "#0A0908",
            bodyBgColor: "#0A0908",
            // 1200 / 450 is the banner overlay artwork's own size, so both
            // layers fill the slot with nothing cropped.
            desktopBannerAspectRatio: "1200 / 450",
            mobileBannerAspectRatio: "1200 / 450",
            // Mobile/tablet header design height (scaled by min(1, vw/786)).
            // Read in sync by app.vue (pre-paint), AppHeader, and default.vue.
            // 63px keeps the bar compact on phones (the desktop header takes
            // over at >=850px at 83px).
            mobileHeaderHeight: 63,
            navMenuItemMarginTop: "3px",
            announcement: {
                text: "",
                textStroke: "#382D21",
                textFill: "#FEF7C4",
                desktopGradient:
                    "linear-gradient(90deg, #0A0908 0%, #191512 50%, #0A0908 100%)",
                mobileBg: "#191512",
                mobileIcon: "/designs/template-3/announcement-icon.png",
            },
            logoStyles: {
                loginModalContainer: { top: "-45px" },
                loginModal: { marginBottom: "4px" },
                profileModal: {
                    width: "145px",
                    height: "auto",
                    "margin-bottom": "6px",
                },
                desktopHeader: { maxHeight: "75px", maxWidth: "282px" },
                mobileHeader: {
                    width: "auto",
                    height: "50px",
                    marginBottom: "4px",
                },
            },
            nav: {
                headerBgGradient: "#0A0908",
                headerBG: "",
                defaultBg: "#0A0908",
                stickyBg: "rgba(10, 9, 8, 0.88)",
                activeItemColor: "#FEF7C4",
                depositSectionGradient:
                    "linear-gradient(to right, #100E0D 0%, #382D21 50.48%, #100E0D 100%)",
                // Render type: "png" = masked-silhouette icons (template-3,
                // current behaviour) | "gif" = Lucky 3-layer composite. To run
                // the gif skin, set type "gif" and point icons.* at the
                // per-category 01 blue variants (hot/01.webp, slot/01.webp, …).
                type: "png",
                // gif-mode chrome (template-1): inactive uses the 01 variant,
                // active/hover uses the 05 variant (bg tile + border).
                gifBg: "/designs/template-1/navbar/gif-bg/01.gif",
                activeGifBg: "/designs/template-1/navbar/gif-bg/05.gif",
                gifBorder: "/designs/template-1/navbar/border/01.webp",
                activeGifBorder: "/designs/template-1/navbar/border/05.webp",
                icons: {
                    hot: "/designs/template-3/nav-icons/hot/01.webp",
                    slot: "/designs/template-3/nav-icons/slot/01.webp",
                    casino: "/designs/template-3/nav-icons/casino/01.webp",
                    sport: "/designs/template-3/nav-icons/sport/01.webp",
                    mini: "/designs/template-3/nav-icons/mini/01.webp",
                    fishing: "/designs/template-3/nav-icons/fishing.webp",
                    virtual: "/designs/template-3/nav-icons/virtual.webp",
                },
                // activeKeys (gif active/hover icons) now comes from the API.
            },
            sectionHeader: {
                // Leather band with polished champagne end-caps. Two constraints
                // shape this value beyond taste:
                //  1. RtpGameCard reuses it as an RTP bar fill AND scrapes the
                //     BRIGHTEST 6-digit hex out of it for its accent colour, so
                //     the stops must stay hex (not rgba) and must include a light
                //     one — an all-dark ramp made that accent near-black, and a
                //     value with no hex at all falls back to orange #FFB300.
                //  2. GameSectionHeader prints a bold WHITE label over the
                //     centre, so the gold is confined to the outer ~6% where the
                //     text never reaches; the middle stays dark chocolate at
                //     16:1 against white.
                gradient:
                    "linear-gradient(90deg, #FFF1B8 0%, #C99A3E 1.5%, #7A5120 6%, #4A2F18 16%, #2B1A10 32%, #1B110B 50%, #2B1A10 68%, #4A2F18 84%, #7A5120 94%, #C99A3E 98.5%, #FFF1B8 100%)",
            },
            sidebar: {
                borderColor: "#E9D399",
                bg: "rgba(10, 9, 8, 0.72)",
                divider: "#382D21",
                activeItemColor: "#FEF7C4",
                activeItemBorderColor: "#D9A441",
                hoverBg: "rgba(217, 164, 65, 0.08)",
                // Ordered menu config, shared by the rail and the mobile profile
                // modal. Page 1 is the game-category group, page 2 the
                // account/support group — the two groups the rail renders either
                // side of its divider. An empty `image` resolves at runtime from
                // PROFILE_MENU_ICON_DEFAULTS by `key`, so icon paths have a
                // single source of truth. The CMS theme doc replaces this whole
                // array — deep-merge does not merge arrays element-wise.
                menus: [
                    // Rail artwork lives under /designs/navigation. The file
                    // names are pluralised for two of them — slots.png and
                    // sports.png — while the menu keys are not, so these cannot
                    // be derived from `key`.
                    { key: 'hot', is_active: true, page: 1, sort: 1, image: 'https://krw-demo1.jaeisol.com/designs/navigation/hot.png' },
                    { key: 'slot', is_active: true, page: 1, sort: 2, image: 'https://krw-demo1.jaeisol.com/designs/navigation/slots.png' },
                    { key: 'casino', is_active: true, page: 1, sort: 3, image: 'https://krw-demo1.jaeisol.com/designs/navigation/casino.png' },
                    { key: 'sport', is_active: true, page: 1, sort: 4, image: 'https://krw-demo1.jaeisol.com/designs/navigation/sports.png' },
                    { key: 'mini', is_active: true, page: 1, sort: 5, image: 'https://krw-demo1.jaeisol.com/designs/navigation/mini.png' },
                    { key: 'fishing', is_active: true, page: 1, sort: 6, image: 'https://krw-demo1.jaeisol.com/designs/navigation/fishing.png' },
                    { key: 'virtual', is_active: true, page: 1, sort: 7, image: 'https://krw-demo1.jaeisol.com/designs/navigation/virtual.png' },
                    { key: 'rtp', is_active: true, page: 2, sort: 1, image: 'https://krw-demo1.jaeisol.com/designs/navigation/rtp.png' },
                    { key: 'livechat', is_active: true, page: 2, sort: 2, image: 'https://krw-demo1.jaeisol.com/designs/menu/livechat.webp' },
                    { key: 'transaksi', is_active: true, page: 2, sort: 3, image: 'https://krw-demo1.jaeisol.com/designs/menu/transaction.webp' },
                    { key: 'activity', is_active: true, page: 2, sort: 4, image: 'https://krw-demo1.jaeisol.com/designs/menu/activity.webp' },
                    { key: 'referral', is_active: true, page: 2, sort: 5, image: 'https://krw-demo1.jaeisol.com/designs/menu/referral.webp' },
                    { key: 'bettingReport', is_active: true, page: 2, sort: 6, image: 'https://krw-demo1.jaeisol.com/designs/menu/betting-report.webp' },
                    { key: 'history', is_active: true, page: 2, sort: 7, image: 'https://krw-demo1.jaeisol.com/designs/menu/history.webp' },
                    { key: 'contact', is_active: true, page: 2, sort: 8, image: 'https://krw-demo1.jaeisol.com/designs/menu/contact.webp' },
                    { key: 'changePassword', is_active: true, page: 2, sort: 9, image: 'https://krw-demo1.jaeisol.com/designs/menu/change-pass.webp' },
                    { key: 'apk', is_active: true, page: 2, sort: 10, image: 'https://krw-demo1.jaeisol.com/designs/menu/apk.webp' },
                    { key: 'telegram', is_active: false, page: 2, sort: 11, image: 'https://krw-demo1.jaeisol.com/designs/menu/telegram.webp' },
                    { key: 'faq', is_active: true, page: 2, sort: 12, image: 'https://krw-demo1.jaeisol.com/designs/menu/faq.webp' },
                    { key: 'loginHistory', is_active: true, page: 2, sort: 13, image: 'https://krw-demo1.jaeisol.com/designs/menu/login.webp' },
                    { key: 'inquiry', is_active: true, page: 2, sort: 14, image: 'https://krw-demo1.jaeisol.com/designs/menu/inquiry.webp' },
                ],
            },
            authButton: {
                loginBg:
                    "linear-gradient(180deg, #9A6B2F 0%, #5C3B18 45%, #3A2512 100%) padding-box, linear-gradient(180deg, #FFF3B0 0%, #C8953D 50%, #6B4318 100%) border-box",

                loginBorder: "1.5px solid transparent",

                loginBorderGradient:
                    "linear-gradient(180deg, #FFF3B0 0%, #D9A441 45%, #85561D 100%)",

                loginTextGradient:
                    "linear-gradient(180deg, #FFFBE2 0%, #F5D98A 50%, #D6A94B 100%)",

                signupBg:
                    "linear-gradient(180deg, #A87835 0%, #63421D 48%, #382411 100%) padding-box, linear-gradient(180deg, #F8E7A8 0%, #C99742 50%, #714719 100%) border-box",

                signupBorder: "1.5px solid transparent",

                signupBorderGradient:
                    "linear-gradient(180deg, #F8E7A8 0%, #D4A04A 50%, #714719 100%)",

                mobileAuthSectionBg:
                    "linear-gradient(180deg, #17110C 0%, #0D0A07 100%)",
            },
            transactionmodal: {
                // Black-marble deposit modal with champagne-gold hardware: active tab +
                // selected ring accent, the primary action buttons, a thin
                // antique-gold panel border, and charcoal quick-amount chips.
                accentColor: "#D9A441",
                buttonBgColor: "#D9A441",
                buttonBgHoverColor: "#85561D",
                buttonTextColor: "#0A0908",
                // Primary buttons — satin champagne, light at the top edge falling to
                // antique gold, so the fill reads as brushed metal rather than
                // a gloss highlight.
                buttonGradientColor:
                    "linear-gradient(180deg, #FEF7C4 0%, #D9A441 45%, #85561D 100%)",
                buttonGradientHoverColor:
                    "linear-gradient(180deg, #FFFCE0 0%, #F3BE66 45%, #9A6626 100%)",
                modalBgColor: "#0A0908",
                borderColor: "#E9D399",
                quickAmountBgColor: "#191512",
                quickAmountBgHoverColor: "#382D21",
                quickAmountTextColor: "#F5F3F5",
                // Luxury-black fields with a thin antique-gold hairline border.
                inputBgColor: "#100E0D",
                inputBorderColor: "#E9D399",
                inputTextColor: "#F5F3F5",
                inputPlaceholderColor: "#C3B49A",
                showDepositImageTitle: false,
                showWithdrawalImageTitle: false,
            },
            // Login modal: mirrors the transaction-modal gold theme by default,
            // but is a separate object so the login screen can be re-skinned on
            // its own from the CMS theme document.
            loginModal: {
                modalBgColor: "#0A0908",
                accentColor: "#D9A441",
                borderColor: "#E9D399",
                buttonTextColor: "#0A0908",
                buttonGradientColor:
                    "linear-gradient(180deg, #FEF7C4 0%, #D9A441 45%, #85561D 100%)",
                // Warm champagne glow band behind the header, falling through
                // espresso to deep black (login-card::before).
                bandGradient:
                    "linear-gradient(180deg, #FEF7C4 0%, #85561D 18%, #4A3A24 42%, #382D21 66%, #0A0908 100%)",
            },
            // Signup modal: mirrors the transaction-modal gold theme by default,
            // but is a separate object so the signup screen can be re-skinned on
            // its own from the CMS theme document.
            signupModal: {
                modalBgColor: "#0A0908",
                accentColor: "#D9A441",
                borderColor: "#E9D399",
                inputBgColor: "#100E0D",
                inputBorderColor: "#E9D399",
                inputTextColor: "#F5F3F5",
                inputPlaceholderColor: "#C3B49A",
                buttonGradientColor:
                    "linear-gradient(180deg, #FEF7C4 0%, #D9A441 45%, #85561D 100%)",
            },
            // Popup promo banner: champagne gradient frame + warm header/footer
            // bands, matching the auth modals. Separate object so the promo
            // pop-ups can be re-skinned on their own from the CMS.
            popupBanner: {
                modalBgColor: "#100E0D",
                accentColor: "#D9A441",
                borderColor: "#E9D399",
                bandGradient:
                    "linear-gradient(180deg, #FEF7C4 0%, #85561D 18%, #4A3A24 42%, #382D21 66%, #0A0908 100%)",
                blockButtonBgColor: "#191512",
                blockButtonTextColor: "#FEF7C4",
                blockButtonBorderColor: "#E9D399",
            },
            // Post-login notice modal: black glass under a champagne hairline —
            // a thin gold band at the very top and bottom edges fading to deep
            // black through the middle. Agree/disagree keep their semantic
            // green/red but in muted, non-neon tones that sit with the gold.
            noticeModal: {
                enabled: true,
                modalBgColor: "#0A0908",
                borderColor: "rgba(217, 164, 65, 0.18)",
                // Thin champagne band at the very top and bottom edges only;
                // the whole middle stays solid black.
                cardGradient:
                    "linear-gradient(180deg, #85561D 0%, #4A3A24 5%, #0A0908 10%, #0A0908 90%, #4A3A24 95%, #85561D 100%)",
                dividerColor: "rgba(217, 164, 65, 0.12)",
                agreeColor: "#A9B488",
                disagreeColor: "#CE8464",
            },
            ui: {
                langSelectorBg: "#191512",
            },
            cardFrame: {
                borderColor: "#C8942E",
                bgColor: "#000000",
                placeholderBg: "#000000",
                // Edge bands only — the MIDDLE MUST STAY TRANSPARENT.
                // HomeGameCard paints this as `.casino-frame-band` ABOVE the
                // character art (z-10), so an all-opaque ramp here hides the
                // character on every casino/slot/sport card and leaves just the
                // gradient plus the provider logo. The dark bottom band is what
                // lets that logo read; the top band caps the card.
                bandGradient:
                    "linear-gradient(to bottom, #B8882F 0%, #5B3F1C 2%, #18130F 4%, rgba(8,7,6,0.95) 5%, rgba(8,7,6,0.85) 7%, rgba(8,7,6,0.6) 9%, rgba(8,7,6,0.3) 10.5%, transparent 12%, transparent 88%, rgba(8,7,6,0.3) 89.5%, rgba(8,7,6,0.6) 91%, rgba(8,7,6,0.85) 93%, rgba(8,7,6,0.95) 95%, #18130F 96%, #5B3F1C 98%, #B8882F 100%)",
            },
            bottomNav: {
                barGradientStops: {
                    light: "#4A3A24",
                    midDark: "#100E0D",
                    postEdge: "#382D21",
                    dark: "#0A0908",
                },
                promoCircleGradient:
                    "linear-gradient(135deg, #FEF7C4 0%, #85561D 100%)",
            },
            panel: {
                contentPanelGradient:
                    "linear-gradient(180deg, #382D21 0%, #100E0D 14.42%, #100E0D 82.69%, #382D21 100%)",
                tableHeaderBackground: "#382D21",
                headerGradient:
                    "linear-gradient(to bottom, rgba(149,98,34,0.28), rgba(16,15,13,0.95), rgba(58,36,22,0.35))",
                gameTypeBtnActiveGradient:
                    "linear-gradient(to right, #E9D399, #D9A441, #E9D399)",
                gameTypeBtnActiveBorder: "#FEF7C4",
                gameTypeBtnActiveShadow: "0 1px 0 rgba(254,247,196,0.35), 0 6px 18px rgba(0,0,0,0.55)",
                panelGradient:
                    "linear-gradient(135deg, rgba(25,21,18,0.6), rgba(48,37,25,0.6), rgba(16,15,13,0.6))",
                panelBorder: "rgba(217,164,65,0.16)",
                actionColor: "#D9A441",
            },
        },

        // ───────────────────────────────────────────────────────────────────
        // assets — images, nav icons, homepage art, transaction, pwa
        // ───────────────────────────────────────────────────────────────────
        assets: {
            images: {
                gold: "https://banana.sg-sin-1.linodeobjects.com/dragon/stones/gold.webp",
                bronze: "https://banana.sg-sin-1.linodeobjects.com/dragon/stones/bronze.webp",
                silver: "https://banana.sg-sin-1.linodeobjects.com/dragon/stones/silver.webp",
                platinum: "https://banana.sg-sin-1.linodeobjects.com/dragon/stones/platinum.webp",
                ruby: "https://banana.sg-sin-1.linodeobjects.com/dragon/stones/ruby.webp",
                sapphire: "https://banana.sg-sin-1.linodeobjects.com/dragon/stones/sapphire.webp",
                diamonds: "https://banana.sg-sin-1.linodeobjects.com/dragon/stones/diamonds.webp",
                // Luxury night terrace — warm gold lighting and palms against a
                // black sky, matching the reference mockup. Sourced from Pexels
                // (Pexels License, commercial use, no attribution required) and
                // graded locally: cropped to 16:9, softened, dimmed to ~45 mean
                // luminance and warmed, so it sits BEHIND the dark UI panel
                // instead of competing with it. Served from /public, not
                // hotlinked, so no external host or CSP entry is involved.
                mainBackground: "/designs/banana/imageAssets/image-50-1-1778909515732.png",
                // Fixed: the scene should read as the room the UI sits in, not
                // as content that scrolls away.
                fixedMainBackground: true,
                mainBackgroundMobile: false,
                girlGif: "",
                loginModalBg: "/designs/misc/modal-login-bg.webp",
                defaultThumbnail: "/designs/misc/default.webp",
                ratio: "/designs/misc/ratio.webp",
                leftDecor: "",
                rightDecor: "",
            },
            decorativeImages: {
                enabled: false,
                leftContainerStyle: {},
                rightContainerStyle: {},
                leftMediaStyle: {},
                rightMediaStyle: {},
            },
            navIcons: {
                background: "",
                arrowRight: "/designs/navigation/arrow-right.webp",
                depositIcon: "/designs/template-3/nav-icons/deposit.png",
                withdrawIcon: "/designs/template-3/nav-icons/withdraw.png",
                walletIcon: "/designs/navigation/Group 605.png",
                pointIcon: "/designs/navigation/Group 604.png",
                swapIcon: "/designs/navigation/swap_horiz_24dp_FFFFFF 1.png",
                refreshIcon: "/designs/navigation/refresh_24dp_434343 1.png",
                bellIcon: "/designs/navigation/notifications_none_24dp_EFEFEF 1.png",
            },
            transaction: {
                bankAccountListPath:
                    "https://sg-sin-1.linodeobjects.com/banana/ocean/banks/accountlist",
                bankAccountNoImage: "/designs/banks/accountlist/NOIMG.webp",
                depositIcon: "/designs/misc/deposit.webp",
                withdrawIcon: "/designs/misc/withdraw.webp",
                bankBasePath: "https://sg-sin-1.linodeobjects.com/banana/ocean/banks",
                bankNoImage: "/designs/banks/NOIMAGE.webp",
            },
            lobbyCard: {
                thumbnailBgPathMobile:
                    "https://sg-sin-1.linodeobjects.com/banana/ocean/gif/thumbnail-bg/mobile",
                thumbnailBgPathWeb:
                    "https://sg-sin-1.linodeobjects.com/banana/ocean/gif/thumbnail-bg/web",
                topBorder: "/designs/gif-border/top-border.webp",
                bottomBorder: "/designs/gif-border/bottom-border.webp",
            },
            homepage: {
                gameLogos: {
                    casino: "/designs/casino-logo",
                    sports: "/designs/sport-logo",
                    slot: "/designs/slot-logo",
                },
                gameCharacters: {
                    casino: "/designs/template-3/casino-character",
                    sports: "/designs/template-3/sports-character",
                    slot: "/designs/template-3/slots-character",
                },
                gameCharacterOverrides: {
                    casino: {},
                    sports: {},
                    // Pinned to the reference deployment's pairing so a provider
                    // keeps its character whatever order the API returns —
                    // see SLOT_CHARACTER_PINS.
                    slot: SLOT_CHARACTER_OVERRIDES,
                },
                gameBg: {
                    casino: "/designs/template-3/game-thumbnail-bg/01.webp",
                    sport: "/designs/template-3/game-thumbnail-bg/09.webp",
                    sportRatio: "/designs/template-3/sport-ratio-bg.png",
                    slot: "/designs/template-3/game-thumbnail-bg/02.webp",
                },
                gameFrame: {
                    casino: "/designs/template-3/frame.png",
                    sport: "/designs/template-3/frame.png",
                    slot: "/designs/template-3/frame.png",
                },
                // UUIDs of sports lobbies that should render the "Ratio X : Y"
                // variant background. Populate when the back-office flags a
                // provider as ratio — leave empty otherwise.
                ratioSportIds: [] as string[],
                // Populated by the admin CMS — disabled by default.
                gameSectionBg: {
                    enabled: false,
                    image: "",
                    mobileOnly: false,
                    desktopStyle: {},
                    mobileStyle: {},
                },
            },
            icons: {
                pwa: { ...PWA_ICONS },
            },
            sidebarIcons: {
                hot: "/designs/navigation/hot.png",
                slot: "/designs/navigation/slots.png",
                casino: "/designs/navigation/casino.png",
                sport: "/designs/navigation/sports.png",
                mini: "/designs/navigation/mini.png",
                fishing: "/designs/navigation/fishing.png",
                virtual: "/designs/navigation/virtual.png",
                notice: "/designs/navigation/Group 306.png",
                promotion: "/designs/navigation/Group 301.png",
                inquiry: "/designs/navigation/Group 302.png",
                transaction: "/designs/navigation/Group 303.png",
                betting: "/designs/navigation/Group 304.png",
                password: "/designs/navigation/Group 305.png",
                referral: "/designs/navigation/referral.png",
                loginHistory: "/designs/navigation/login-history.png",
                activity: "/designs/navigation/activity.png",
                apk: "/designs/navigation/apk.png",
                telegram: "/designs/navigation/telegram.png",
                contact: "/designs/navigation/contact.png",
                livechat: "/designs/navigation/livechat.png",
                rtp: "/designs/navigation/rtp.png",
            },
        },

        // ───────────────────────────────────────────────────────────────────
        // contact — channel icons + handles
        // ───────────────────────────────────────────────────────────────────
        contact: {
            handles: {
                messenger: "@LuckCasino",
                whatsapp: "+822213122393",
                line: "@LuckCasino",
                telegram: "luckcasino88bot",
            },
        },

        // ───────────────────────────────────────────────────────────────────
        // integrations — tawk.to (+ future widgets)
        // ───────────────────────────────────────────────────────────────────
        integrations: {
            tawkTo: {
                propertyId: null,
                widgetId: null,
            },
        },

        // ───────────────────────────────────────────────────────────────────
        // content — CMS-authored copy (deposit rule, footer)
        // ───────────────────────────────────────────────────────────────────
        content: {
            // Empty by default: the deposit modal renders nothing until an
            // admin publishes a rule on the CMS "Deposit Rule" page.
            depositRule: "",
            // Empty by default — the copyright lives in AppFooter. A CMS-authored
            // footer renders above it when the admin publishes one.
            footer: "",
        },
    };
};
