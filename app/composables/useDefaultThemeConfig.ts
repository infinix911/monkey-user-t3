/**
 * Template3 Site Configuration
 *
 * Source-of-truth schema that the admin CMS will populate (via
 * /api/site/config/userpage, deep-merged in useSiteConfig.ts). The interface
 * below is the full contract: every leaf is typed and documented with what it
 * controls, where it appears in the UI, and the value format. The 6 top-level
 * groups map 1:1 to CMS tabs:
 *
 *   identity     → "Identity"     site name, slug, logos, favicon, description
 *   theme        → "Theme"        colors / gradients / layout tokens
 *   assets       → "Assets"       images, nav icons, homepage art, transaction, pwa
 *   contact      → "Contact"      channel icons + handles
 *   integrations → "Integrations" tawk.to (+ future widgets)
 *   seo          → "SEO"          general / social / robot / meta / canonical / pageTitles
 */

/** A CSS inline-style map (camelCase or kebab-case keys → CSS value strings). */
type CssStyleMap = Record<string, string>;

// ───────────────────────────────────────────────────────────────────────────
// identity
// ───────────────────────────────────────────────────────────────────────────

/** Brand identity: name, slug, logos, favicon, and description. */
export interface IdentityConfig {
    /** Brand display name. Used in headers, titles, og/twitter tags, SEO. Plain text. */
    siteName: string;
    /** Internal brand slug (e.g. "ocean"). Selects backend asset buckets/paths. Lowercase string. */
    slug: string;
    /** Primary brand logo. Header, modals, share image fallback. Public asset path or absolute URL. */
    logo: string;
    /** Mobile/compact logo variant shown in the mobile header. Public asset path or absolute URL. */
    logoMobile: string;
    /** Logo shown inside popups/announcement modals. Public asset path or absolute URL. */
    logoPopup: string;
    /** Marketing description. Feeds default meta/SEO description text. Plain text. */
    description: string;
    /** Canonical favicon (browser tab icon). Mirrored into seo.general.favicon. Public asset path or absolute URL. */
    favicon: string;
}

// ───────────────────────────────────────────────────────────────────────────
// theme
// ───────────────────────────────────────────────────────────────────────────

/** Announcement marquee styling (desktop banner + mobile bar). */
export interface ThemeAnnouncementConfig {
    /** Scrolling announcement message text. Plain text (empty = none / CMS-driven). */
    text: string;
    /** Stroke (outline) color of the scrolling announcement text. Hex color. */
    textStroke: string;
    /** Fill color of the scrolling announcement text. Hex color. */
    textFill: string;
    /** Desktop announcement bar background. CSS linear-gradient string. */
    desktopGradient: string;
    /** Mobile announcement bar background. Hex color. */
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
    /** Login button label gradient (clipped to text). CSS linear-gradient string. */
    loginTextGradient: string;
    /** Signup button background (padding-box + border-box gradient). CSS background shorthand string. */
    signupBg: string;
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

/**
 * Partner-section (partner dashboard) theme tokens. Independent from the shared
 * `theme.panel.*` palette so the partner UI can be re-skinned on its own.
 * Consumed by `usePartnerTheme` — read `theme.partner.<leaf>` directly.
 */
export interface ThemePartnerConfig {
    /** Accent — icons, active states, table-header text, active-tab gradient base. Hex color. */
    accentColor: string;
    /** Container border — nav bar, body container, cards. CSS color. */
    borderColor: string;
    /** Container background — nav bar, partner body, drawers. CSS gradient/color string. */
    panelBgColor: string;
    /** Card background — section cards, tables, submenus. CSS gradient/color string. */
    cardBgColor: string;
    /** Table header background. CSS color. */
    headBgColor: string;
    /** Text color on the active tab / primary button. Hex color. */
    activeTextColor: string;
    /** Large decorative background watermark emoji (empty = none). Single emoji. */
    watermarkEmoji: string;
}

/** All colors, gradients, and layout tokens (the "Theme" CMS tab). */
export interface ThemeConfig {
    /** Primary brand color (accents, highlights). Hex color. */
    brandColor: string;
    /** Theme color (PWA theme-color meta, dark chrome). Hex color. */
    themeColor: string;
    /** Page body background. Hex color. */
    bodyBgColor: string;
    /** Aspect ratio of the mobile banner slot. CSS aspect-ratio string (e.g. "375 / 190"). */
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
    /** Partner-section (partner dashboard) theme tokens. */
    partner: ThemePartnerConfig;
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
 * One profile / "My Account" menu item.
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

/** Ordered profile / "My Account" menu config. */
export type AssetsProfileMenuConfig = ProfileMenuItem[];

/**
 * Bundled default icons for profile-menu items, keyed by item `key`.
 *
 * Single source of truth for both the bundled {@link AssetsProfileMenuConfig}
 * default and the runtime icon fallback in `useProfileMenu`. The fallback is
 * required because the CMS theme doc replaces the whole `assets.profileMenu`
 * array wholesale (deep-merge does not merge arrays element-wise), and admin
 * items typically carry an empty `image`.
 */
export const PROFILE_MENU_ICON_DEFAULTS = {
    referral: "/designs/my-account/refferal.webp",
    bonusHistory: "/designs/my-account/bonus-history.webp",
    bettingReport: "/designs/my-account/betting-report.webp",
    levelSystem: "/designs/my-account/level-system.webp",
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
};

/** PWA manifest icon assets. */
export interface AssetsIconsConfig {
    /** PWA app icons keyed by size (e.g. "192x192"). Map of size → asset path/URL. */
    pwa: Record<string, string>;
}

/** All image/icon assets (the "Assets" CMS tab). */
export interface AssetsConfig {
    /** Generic site imagery. */
    images: AssetsImagesConfig;
    /** Top-navigation iconography (was `navigation`). */
    navIcons: AssetsNavIconsConfig;
    /** Deposit/withdraw and banking assets. */
    transaction: AssetsTransactionConfig;
    /** Lobby card backgrounds and borders. */
    lobbyCard: AssetsLobbyCardConfig;
    /** Homepage game-section artwork. */
    homepage: AssetsHomepageConfig;
    /** Profile / "My Account" menu items (array; see ProfileMenuItem). */
    profileMenu: ProfileMenuItem[];
    /** PWA manifest icon assets. */
    icons: AssetsIconsConfig;
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
// seo
// ───────────────────────────────────────────────────────────────────────────

/** General SEO/organization metadata. */
export interface SeoGeneralConfig {
    /** Canonical site URL. Absolute URL (may be empty until configured). */
    siteUrl: string;
    /** Site name for structured data / titles. Plain text. */
    siteName: string;
    /** Author name for structured data. Plain text. */
    authorName: string;
    /** Organization name for structured data. Plain text. */
    organizationName: string;
    /** schema.org organization type. String (e.g. "Company"). */
    organizationType: string;
    /** Favicon (mirrors identity.favicon). Public asset path or absolute URL. */
    favicon: string;
}

/** Custom per-page SEO snippets. */
export interface SeoCustomSeoConfig {
    /** Default SEO footer HTML/text. Empty = none. HTML/plain text string. */
    footer: string;
}

/** Social (Open Graph / Twitter) share metadata. */
export interface SeoSocialConfig {
    /** Default Open Graph title. Plain text. */
    defaultOgTitle: string;
    /** Twitter card type. String (e.g. "summary_large_image"). */
    twitterCardType: string;
    /** Default Twitter title. Plain text. */
    defaultTwitterTitle: string;
    /** Default Open Graph share image. Public asset path or absolute URL. */
    defaultOgImage: string;
    /** Default Open Graph description. Plain text. */
    defaultOgDescription: string;
    /** Default Twitter description. Plain text. */
    defaultTwitterDescription: string;
    /** Default Twitter share image. Public asset path or absolute URL. */
    defaultTwitterImage: string;
    /** Open Graph image width. px number. */
    defaultOgImageWidth: number;
    /** Open Graph image height. px number. */
    defaultOgImageHeight: number;
    /** Open Graph image type. String (e.g. "WEBP"). */
    defaultOgImageType: string;
    /** Twitter image width. px number. */
    defaultTwitterImageWidth: number;
    /** Twitter image height. px number. */
    defaultTwitterImageHeight: number;
    /** Twitter image type. String (e.g. "WEBP"). */
    defaultTwitterImageType: string;
}

/** Robots crawl directives. */
export interface SeoRobotConfig {
    /** Default index directive. Boolean. */
    defaultIndex: boolean;
    /** Default follow directive. Boolean. */
    defaultFollow: boolean;
    /** noimageindex directive. Boolean. */
    noimageindex: boolean;
    /** nosnippet directive. Boolean. */
    nosnippet: boolean;
    /** max-snippet value. String (empty = unset). */
    maxSnippet: string;
}

/** Default meta tags. */
export interface SeoMetaConfig {
    /** Default meta keywords. Comma-separated string. */
    defaultMetaKeywords: string;
    /** Default meta title. Plain text. */
    defaultMetaTitle: string;
    /** Default meta description. Plain text. */
    defaultMetaDescription: string;
}

/** Canonical meta block injected on every page. */
export interface SeoCanonicalMetaConfig {
    /** Fixed canonical meta name→content map. Record of string→string. */
    SEO_CANONICAL_META: Record<string, string>;
}

/** SEO configuration (the "SEO" CMS tab). */
export interface SeoConfig {
    /** General SEO/organization metadata. */
    general: SeoGeneralConfig;
    /** Custom per-page SEO snippets. */
    customSeo: SeoCustomSeoConfig;
    /**
     * Custom per-page SEO rows written by `lib/siteConfig.ts`.
     * Populated by the admin CMS — empty by default.
     * Array of API-defined row objects.
     */
    customSeoRows: Record<string, unknown>[];
    /** Social (OG/Twitter) share metadata. */
    social: SeoSocialConfig;
    /** Robots crawl directives. */
    robot: SeoRobotConfig;
    /** Default meta tags. */
    meta: SeoMetaConfig;
    /** Canonical meta block. */
    canonicalMeta: SeoCanonicalMetaConfig;
}

// ───────────────────────────────────────────────────────────────────────────
// SiteConfig (root)
// ───────────────────────────────────────────────────────────────────────────

/** The full bundled site-config contract (6 CMS-tab-aligned groups). */
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
    /** SEO configuration. */
    seo: SeoConfig;
}

/** PWA app icons - use the Jae brand logo (matches favicon/logo) */
const JAE_ICON = "/designs/logo/ocean.webp";
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
            slug: "ocean",
            logo: "/designs/logo/ocean.webp",
            logoMobile: "/designs/logo/ocean.webp",
            logoPopup: "/designs/logo/ocean.webp",
            description: `Experience the best online gaming experience with ${siteName}`,
            favicon: "/designs/logo/ocean.webp",
        },

        // ───────────────────────────────────────────────────────────────────
        // theme — colors, gradients, layout tokens
        // ───────────────────────────────────────────────────────────────────
        theme: {
            brandColor: "#0077B6",
            themeColor: "#000000",
            bodyBgColor: "#000000",
            mobileBannerAspectRatio: "375 / 190",
            // Mobile/tablet header design height (scaled by min(1, vw/786)).
            // Read in sync by app.vue (pre-paint), AppHeader, and default.vue.
            // 63px keeps the bar compact on phones (the desktop header takes
            // over at >=850px at 83px).
            mobileHeaderHeight: 63,
            navMenuItemMarginTop: "3px",
            announcement: {
                text: "",
                textStroke: "#B60000",
                textFill: "#FFF600",
                desktopGradient:
                    "linear-gradient(90deg, #001F50 0%, #204D97 50%, #001F50 100%)",
                mobileBg: "#3493FF",
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
                defaultBg: "#000000",
                stickyBg: "rgba(0, 0, 0, 0.8)",
                activeItemColor: "#f3ef0b",
                depositSectionGradient:
                    "linear-gradient(to right, #001F50 0%, #204D97 50.48%, #001F50 100%)",
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
                    hot: "/designs/template-3/nav-icons/hot.webp",
                    slot: "/designs/template-3/nav-icons/slot.webp",
                    casino: "/designs/template-3/nav-icons/casino.webp",
                    sport: "/designs/template-3/nav-icons/sports.webp",
                    mini: "/designs/template-3/nav-icons/mini.webp",
                    fishing: "/designs/template-3/nav-icons/fishing.webp",
                    virtual: "/designs/template-3/nav-icons/virtual.webp",
                },
                // activeKeys (gif active/hover icons) now comes from the API.
            },
            sectionHeader: {
                gradient:
                    "linear-gradient(90deg, #001F50 0%, #204D97 50.48%, #001F50 100%)",
            },
            authButton: {
                loginBg:
                    "linear-gradient(to bottom, #0C316C, #175FD2) padding-box, linear-gradient(to bottom, #F7E652, #C9B10C 66.8%, #F7E652) border-box",
                loginTextGradient:
                    "linear-gradient(to right, #F7E652, #C9B10C 66.8%, #F7E652)",
                signupBg:
                    "linear-gradient(to bottom, #0C316C, #175FD2) padding-box, linear-gradient(to bottom, #3890F9, #194488 66.8%, #3890F9) border-box",
                mobileAuthSectionBg:
                    "linear-gradient(to right, #001F50 0%, #204D97 50.48%, #001F50 100%)",
            },
            transactionmodal: {
                // Black deposit-modal theme with orange accents: active tab +
                // selected ring accent, the primary action buttons, an orange
                // panel border, and dark quick-amount chips.
                accentColor: "#FF7A00",
                buttonBgColor: "#FF7A00",
                buttonBgHoverColor: "#E66E00",
                buttonTextColor: "#000000",
                // Primary buttons — exact orange gradient sampled from the
                // reference (top gold #FBAD00 → bottom orange #FF7800).
                buttonGradientColor:
                    "linear-gradient(180deg, #FBAD00 0%, #FF7800 100%)",
                buttonGradientHoverColor:
                    "linear-gradient(180deg, #FFBB1F 0%, #FF8A1F 100%)",
                modalBgColor: "#000000",
                borderColor: "#C2691A",
                quickAmountBgColor: "#1C1C1C",
                quickAmountBgHoverColor: "#2A2A2A",
                quickAmountTextColor: "#FFFFFF",
                // Dark text fields with a muted-orange border (sampled).
                inputBgColor: "#0D0D0D",
                inputBorderColor: "#A85C2E",
                inputTextColor: "#FFFFFF",
                inputPlaceholderColor: "#6F6F6F",
                showDepositImageTitle: false,
                showWithdrawalImageTitle: false,
            },
            // Login modal: mirrors the transaction-modal orange theme by default,
            // but is a separate object so the login screen can be re-skinned on
            // its own from the CMS theme document.
            loginModal: {
                modalBgColor: "#000000",
                accentColor: "#FF7A00",
                borderColor: "#C2691A",
                buttonTextColor: "#000000",
                buttonGradientColor:
                    "linear-gradient(180deg, #FBAD00 0%, #FF7800 100%)",
                // Warm top glow band behind the header (login-card::before).
                bandGradient:
                    "linear-gradient(180deg, #D67A12 0%, #B95A00 20%, #7A3200 45%, #2C1200 70%, #02010A 100%)",
            },
            // Signup modal: mirrors the transaction-modal orange theme by default,
            // but is a separate object so the signup screen can be re-skinned on
            // its own from the CMS theme document.
            signupModal: {
                modalBgColor: "#000000",
                accentColor: "#FF7A00",
                borderColor: "#C2691A",
                inputBgColor: "#0D0D0D",
                inputBorderColor: "#A85C2E",
                inputTextColor: "#FFFFFF",
                inputPlaceholderColor: "#6F6F6F",
                buttonGradientColor:
                    "linear-gradient(180deg, #FBAD00 0%, #FF7800 100%)",
            },
            // Popup promo banner: orange gradient frame + warm header/footer
            // bands, matching the auth modals. Separate object so the promo
            // pop-ups can be re-skinned on their own from the CMS.
            popupBanner: {
                modalBgColor: "#0A0A0A",
                accentColor: "#FF7A00",
                borderColor: "#C2691A",
                bandGradient:
                    "linear-gradient(180deg, #D67A12 0%, #B95A00 20%, #7A3200 45%, #2C1200 70%, #02010A 100%)",
                blockButtonBgColor: "#140A02",
                blockButtonTextColor: "#E7C9A6",
                blockButtonBorderColor: "#C2691A",
            },
            // Post-login notice modal: neutral grey glass — subtle light-grey
            // border and a vertical gradient that is light grey at the top and
            // bottom, fading to near-black through the middle. Green/red outline
            // agree/disagree buttons. Independent of the orange auth modals.
            noticeModal: {
                modalBgColor: "#0A0A0C",
                borderColor: "rgba(255, 255, 255, 0.14)",
                // Small light-grey band at the very top and bottom edges only;
                // the whole middle stays solid black.
                cardGradient:
                    "linear-gradient(180deg, #3A3D44 0%, #14151A 5%, #0A0A0C 10%, #0A0A0C 90%, #14151A 95%, #2A2C31 100%)",
                dividerColor: "rgba(255, 255, 255, 0.10)",
                agreeColor: "#34D399",
                disagreeColor: "#FB7185",
            },
            ui: {
                langSelectorBg: "#262626",
            },
            cardFrame: {
                borderColor: "#de6000",
                bgColor: "#160a02",
                placeholderBg: "#d9d9d9",
                bandGradient:
                    "linear-gradient(to bottom, #9f4400 0%, #5f2900 2%, #1e0c00 4%, rgba(0,0,0,0.95) 5%, rgba(0,0,0,0.85) 7%, rgba(0,0,0,0.6) 9%, rgba(0,0,0,0.3) 10.5%, transparent 12%, transparent 88%, rgba(0,0,0,0.3) 89.5%, rgba(0,0,0,0.6) 91%, rgba(0,0,0,0.85) 93%, rgba(0,0,0,0.95) 95%, #1e0c00 96%, #5f2900 98%, #9f4400 100%)",
            },
            bottomNav: {
                barGradientStops: {
                    light: "#5DAAFF",
                    midDark: "#0A64CD",
                    postEdge: "#6FB1FD",
                    dark: "#006CEA",
                },
                promoCircleGradient:
                    "linear-gradient(135deg, #5DAAFF 0%, #3386E5 100%)",
            },
            panel: {
                contentPanelGradient:
                    "linear-gradient(180deg, #002A3A 0%, #0F0F0F 14.42%, #0F0F0F 82.69%, #001A2E 100%)",
                tableHeaderBackground: "#002A3A",
                headerGradient:
                    "linear-gradient(to bottom, rgba(0,119,182,0.9), rgba(20,20,20,0.95), rgba(0,95,115,0.9))",
                gameTypeBtnActiveGradient:
                    "linear-gradient(to right, #005F73, #0077B6, #005F73)",
                gameTypeBtnActiveBorder: "#00B4D8",
                gameTypeBtnActiveShadow: "0 0 8px rgba(0,180,216,0.15)",
                panelGradient:
                    "linear-gradient(135deg, rgba(20,20,20,0.6), rgba(10,22,25,0.6), rgba(15,15,15,0.6))",
                panelBorder: "rgba(0,180,216,0.15)",
                actionColor: "#00B4D8",
            },
            // Partner-section palette. Defaults mirror the ocean `panel.*`
            // tokens so the partner UI stays consistent when a theme document
            // does not override `theme.partner.*`.
            partner: {
                accentColor: "#0077B6",
                borderColor: "rgba(0,180,216,0.15)",
                panelBgColor:
                    "linear-gradient(135deg, rgba(20,20,20,0.6), rgba(10,22,25,0.6), rgba(15,15,15,0.6))",
                cardBgColor:
                    "linear-gradient(180deg, #002A3A 0%, #0F0F0F 14.42%, #0F0F0F 82.69%, #001A2E 100%)",
                headBgColor: "#002A3A",
                activeTextColor: "#000000",
                watermarkEmoji: "👑",
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
                mainBackground: "",
                fixedMainBackground: false,
                mainBackgroundMobile: false,
                girlGif: "",
                loginModalBg: "/designs/misc/modal-login-bg.webp",
                defaultThumbnail: "/designs/misc/default.webp",
                ratio: "/designs/misc/ratio.webp",
            },
            navIcons: {
                background: "",
                arrowRight: "/designs/navigation/arrow-right.webp",
                depositIcon: "/designs/template-3/nav-icons/deposit.png",
                withdrawIcon: "/designs/template-3/nav-icons/withdraw.png",
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
                    slot: {},
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
            // Ordered profile-menu config. `image: ''` everywhere — the bundled
            // icons resolve at runtime from PROFILE_MENU_ICON_DEFAULTS (page 1)
            // (page 2), so there is a single source of
            // truth for icon paths. The CMS theme doc replaces this whole array.
            profileMenu: [
                { key: 'referral', is_active: true, page: 1, sort: 1, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/referral.webp' },
                { key: 'bonusHistory', is_active: true, page: 1, sort: 2, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/bonus-history.webp' },
                { key: 'bettingReport', is_active: true, page: 1, sort: 3, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/betting-report.webp' },
                { key: 'levelSystem', is_active: true, page: 1, sort: 4, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/level.webp' },
                { key: 'loginHistory', is_active: true, page: 1, sort: 5, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/login.webp' },
                { key: 'changePassword', is_active: true, page: 1, sort: 6, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/change-pass.webp' },
                { key: 'promotion', is_active: true, page: 1, sort: 7, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/promotion.webp' },
                { key: 'faq', is_active: true, page: 1, sort: 8, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/faq.webp' },
                { key: 'apk', is_active: true, page: 1, sort: 9, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/apk.webp' },
                { key: 'telegram', is_active: true, page: 1, sort: 10, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/telegram.webp' },
                { key: 'inquiry', is_active: true, page: 1, sort: 11, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/inquiry.webp' },
                { key: 'contact', is_active: true, page: 1, sort: 12, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/contact.webp' },
                { key: 'transaksi', is_active: true, page: 2, sort: 3, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/transaction.webp' },
                { key: 'activity', is_active: true, page: 2, sort: 7, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/activity.webp' },
                { key: 'livechat', is_active: true, page: 2, sort: 8, image: 'https://banana.sg-sin-1.linodeobjects.com/designs/menu/livechat.webp' },
            ],
            icons: {
                pwa: { ...PWA_ICONS },
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
        // seo — general / social / robot / meta / canonical / pageTitles
        // ───────────────────────────────────────────────────────────────────
        seo: {
            general: {
                siteUrl: "",
                siteName,
                authorName: "",
                organizationName: "",
                organizationType: "Company",
                favicon: "/designs/logo/ocean.webp",
            },
            customSeo: {
                // Default footer left empty — the copyright now lives in
                // AppFooter. Per-page admin SEO footers (from the API) still
                // render via the layout's customSeoFooter block when present.
                footer: "",
            },
            // Populated by the admin CMS (via lib/siteConfig.ts) — empty by default.
            customSeoRows: [] as Record<string, unknown>[],
            social: {
                defaultOgTitle: `${siteName} – Play Online Slots, Live Casino & Win Big Today`,
                twitterCardType: "summary_large_image",
                defaultTwitterTitle: `${siteName} – Play Online Slots, Live Casino & Win Big Today`,
                defaultOgImage: "/designs/screenshots/ocean.webp",
                defaultOgDescription: `Play top online casino games like slots and live dealers. Enjoy big jackpots, fast payouts, and secure gaming at ${siteName}.`,
                defaultTwitterDescription: `Play top online casino games like slots and live dealers. Enjoy big jackpots, fast payouts, and secure gaming at ${siteName}.`,
                defaultTwitterImage: "/designs/screenshots/ocean.webp",
                defaultOgImageWidth: 1099,
                defaultOgImageHeight: 535,
                defaultOgImageType: "WEBP",
                defaultTwitterImageWidth: 1099,
                defaultTwitterImageHeight: 535,
                defaultTwitterImageType: "WEBP",
            },
            robot: {
                defaultIndex: true,
                defaultFollow: true,
                noimageindex: false,
                nosnippet: false,
                maxSnippet: "",
            },
            meta: {
                defaultMetaKeywords:
                    "online casino, ocean casino, online slots, live casino, casino jackpots, real money casino",
                defaultMetaTitle: `Play Online Casino Games, Slots & Live Dealer | ${siteName}`,
                defaultMetaDescription: `Play top online casino games like slots and live dealers. Enjoy big jackpots, fast payouts, and secure gaming at ${siteName}.`,
            },
            canonicalMeta: {
                SEO_CANONICAL_META: {
                    author: "jaeisol",
                    google: "notranslate",
                    rating: "general",
                    robots: "index, follow",
                    "og:type": "website",
                    language: "id-ID",
                    googlebot: "index, follow",
                    "og:locale": "id_ID",
                    publisher: "jaeisol",
                    "geo.region": "ID-JK",
                    "geo.country": "ID",
                    distribution: "global",
                    "geo.placename": "Jakarta",
                    "og:locale:alternate": "en_US",
                },
            },
        },
    };
};
