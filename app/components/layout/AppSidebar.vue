<template>
  <!-- Rail shell. Colours come from theme.sidebar (border #B04C00 / 60% black /
       #434343 rule) so the CMS can retheme it like every other surface. -->
  <aside
    class="font-inter w-full rounded-[8px] overflow-hidden"
    :style="{ border: sidebar.border, background: sidebar.bg }"
    :aria-label="$t('sidebar.label')">
    <!-- Deposit / withdraw. Deliberately the SAME background token the top
         nav's transaction panel uses (theme.nav.depositSectionGradient) rather
         than a second gradient, so the two surfaces can never drift apart. -->
    <div v-if="features.payments" class="px-3 pt-[10px]">
      <div
        class="h-[67px] rounded-[8px] overflow-hidden flex items-stretch"
        :style="{ background: siteConfig.theme.nav.depositSectionGradient }">
        <button
          type="button"
          class="flex-1 flex flex-col items-center justify-center gap-1 text-white cursor-pointer hover:bg-white/5 transition-colors duration-200"
          @click="onDeposit">
          <img
            :src="siteConfig.assets.navIcons.depositIcon"
            :alt="$t('navbar.deposit')"
            width="36"
            height="32"
            class="h-[32px] w-auto object-contain"
            loading="eager"
            decoding="async">
          <span class="text-[12px] font-bold leading-none tracking-tight">{{ $t('navbar.deposit') }}</span>
        </button>
        <div class="w-px bg-white/70 my-[9px]" />
        <button
          type="button"
          class="flex-1 flex flex-col items-center justify-center gap-1 text-white cursor-pointer hover:bg-white/5 transition-colors duration-200"
          @click="onWithdraw">
          <img
            :src="siteConfig.assets.navIcons.withdrawIcon"
            :alt="$t('navbar.withdraw')"
            width="36"
            height="32"
            class="h-[32px] w-auto object-contain"
            loading="eager"
            decoding="async">
          <span class="text-[12px] font-bold leading-none tracking-tight">{{ $t('navbar.withdraw') }}</span>
        </button>
      </div>
    </div>

    <!-- Game categories. Rows butt against each other (the 31px pitch IS the row
         height), so the hover pill never leaves a seam between neighbours. -->
    <ul class="px-2 flex flex-col" :class="features.payments ? 'pt-[18px]' : 'pt-[10px]'">
      <li v-for="item in gameItems" :key="item.id">
        <button type="button" :class="ROW_CLASS" :style="rowStyle(isActive(item.path))" @click="goTo(item.path)">
          <img
            :src="item.icon"
            :alt="''"
            aria-hidden="true"
            width="28"
            height="28"
            class="w-7 h-7 object-contain flex-shrink-0"
            :class="{ 'sidebar-icon-active': isActive(item.path) }"
            loading="lazy"
            decoding="async">
          <span>{{ $t(item.labelKey) }}</span>
        </button>
      </li>
    </ul>

    <!-- Group rule -->
    <div class="mx-4 mt-[18px] h-px" :style="{ backgroundColor: sidebar.divider }" />

    <!-- Account / support — every item the profile modal shows, in CMS order.
         Telegram is an external link, so it stays an <a> as it is in the modal. -->
    <ul class="px-2 pt-[14px] pb-[14px] flex flex-col">
      <li v-for="item in menu.allMenuItems.value" :key="item.id">
        <a v-if="item.id === 'telegram'" :href="menu.telegramHref.value" target="_blank" rel="noopener noreferrer"
          :class="ROW_CLASS" :style="rowStyle(false)">
          <img
            :src="iconFor(item)"
            alt=""
            aria-hidden="true"
            width="28"
            height="28"
            class="w-7 h-7 object-contain flex-shrink-0"
            loading="lazy"
            decoding="async">
          <span class="truncate">{{ menu.tLabel(item.labelKey) }}</span>
        </a>
        <button v-else type="button" :class="ROW_CLASS"
          :style="rowStyle(accountSection.section.value === item.id)" @click="onItemClick(item)">
          <img
            :src="iconFor(item)"
            alt=""
            aria-hidden="true"
            width="28"
            height="28"
            class="w-7 h-7 object-contain flex-shrink-0"
            :class="{ 'sidebar-icon-active': accountSection.section.value === item.id }"
            loading="lazy"
            decoding="async">
          <span class="truncate">{{ menu.tLabel(item.labelKey) }}</span>
        </button>
      </li>
    </ul>
  </aside>

  <!-- Open account section, shown beside the rail. Same panel the mobile modal
       renders, so the content and its data come from one place. -->
  <Transition name="rail-panel">
    <div v-if="accountSection.section.value"
      class="tm-modal modal-body-fill modal-gradient-border fixed top-[92px] z-50 w-[620px] h-[620px] rounded-lg shadow-2xl overflow-hidden"
      :style="[panelStyle, modalTheme]">
      <div class="flex items-center justify-between px-4 py-3 border-b tm-line">
        <h2 class="tm-accent-text text-lg font-medium" style="font-family: var(--font-line-seed)">
          {{ menu.labelForId(accountSection.section.value) }}
        </h2>
        <button class="tm-muted hover:text-white transition-colors cursor-pointer"
          :aria-label="$t('common.close')" @click="accountSection.close()">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 27 27" fill="none">
            <line x1="1.41421" y1="1" x2="25.627" y2="25.2127" stroke="currentColor" stroke-width="2"
              stroke-linecap="round" />
            <line x1="1" y1="-1" x2="35.242" y2="-1"
              transform="matrix(-0.707107 0.707107 0.707107 0.707107 26.6732 1)" stroke="currentColor"
              stroke-width="2" stroke-linecap="round" />
          </svg>
        </button>
      </div>
      <div class="tm-scroll p-4 h-[calc(100%-58px)] overflow-y-auto">
        <AccountSectionPanel :section="accountSection.section.value" />
      </div>
    </div>
  </Transition>

  <!-- Promotion + Activity open as feature modals, exactly as they do in the
       profile modal; the shared navigation decides which items do that. -->
  <ProfileFeatureModals v-model:show-promotion="showPromotion" v-model:show-activity="showActivity"
    :site-config="siteConfig" />
</template>

<script setup lang="ts">
/**
 * Desktop left rail (lg+ two-column layout): deposit/withdraw, the game
 * categories, and the profile menu — which on desktop replaces NewProfileModal.
 *
 * The categories mirror Navbar's list, since the rail replaces that bar on
 * desktop while Navbar keeps serving mobile, so `isActive` follows the same
 * rules (including /slots owning the /lobbies sub-pages).
 *
 * The account entries are NOT a second list: they are the CMS menu, read from
 * `useProfileMenuItems`, clicked through `useProfileNavigation`, and rendered by
 * the same `AccountSectionPanel` the mobile modal uses. Adding an item in the
 * CMS surfaces it here and in the modal with no code change.
 */
import { computed } from "vue";
import AccountSectionPanel from "~/components/profile/AccountSectionPanel.vue";
import ProfileFeatureModals from "~/components/profile/ProfileFeatureModals.vue";
import type { MenuItem } from "@/composables/useProfileMenuItems";
import type { AssetsSidebarIconsConfig } from "@/composables/useDefaultThemeConfig";

const siteConfig = useSiteConfig();
const authStore = useAuthStore();
const uiStore = useUiStore();
const route = useRoute();
const localePath = useLocalePath();
const features = useFeatures();
const { onDeposit, onWithdraw } = useNavTransactionActions();

const menu = useProfileMenuItems();
const accountSection = useAccountSection();

/** Deposit/withdraw palette for the account panel and everything it renders. */
const modalTheme = useModalTheme();

/** Feature modals the shared navigation opens for the promotion/activity items. */
const showPromotion = ref(false);
const showActivity = ref(false);

const { handleItemClick } = useProfileNavigation({
  onPromotion: () => {
    showPromotion.value = true;
  },
  onActivity: () => {
    showActivity.value = true;
  },
});

/**
 * Runs a menu item, prompting login first for anything account-bound so a guest
 * never lands on an empty panel.
 *
 * @param item - The chosen menu item.
 * @returns {void}
 */
function onItemClick(item: MenuItem): void {
  if (!authStore.isAuthenticated && isAccountSection(item.id)) {
    uiStore.setShowLoginModal(true);
    return;
  }
  handleItemClick(item);
}

/**
 * The rail's icon for a menu item: the design's rail art where it exists for
 * that id, otherwise the CMS item's own image, so unknown ids still render.
 *
 * @param item - Menu item to resolve an icon for.
 * @returns {string} Icon URL.
 */
function iconFor(item: MenuItem): string {
  const key = RAIL_ICON_IDS[item.id];
  return (key ? icons.value[key] : "") || item.image;
}

/**
 * Menu id → key in `assets.sidebarIcons`, for the ids the design ships rail art
 * for. Everything else falls back to the item's CMS image.
 */
const RAIL_ICON_IDS: Record<string, keyof AssetsSidebarIconsConfig> = {
  promotion: "promotion",
  inquiry: "inquiry",
  transaction: "transaction",
  transaksi: "transaction",
  bettingReport: "betting",
  changePassword: "password",
  faq: "notice",
  referral: "referral",
  loginHistory: "loginHistory",
  activity: "activity",
  apk: "apk",
  telegram: "telegram",
  contact: "contact",
  livechat: "livechat",
  // The CMS ships RTP with no bundled image, so the rail art is the only icon
  // it has; both spellings the CMS has used map to it.
  rtp: "rtp",
  slotRtp: "rtp",
};

/**
 * Panel geometry: pinned to the content column's left edge, i.e. flush beside
 * the rail with the layout's own gutter (rail column 210px + `lg:px-2` 8px
 * + `lg:gap-7` 28px = 246px past the centred 1456px shell's left edge). Derived
 * from the rail width and gap in layouts/default.vue — change either and this
 * moves by the same amount, or the panel detaches from the content column.
 *
 * Every viewport unit here is divided by `--site-zoom`. The panel is `fixed`
 * INSIDE the zoomed wrapper (layouts/default.vue `.site-zoom`), so its offsets
 * are resolved in zoomed pixels while `vw`/`vh` are not scaled by `zoom` — the
 * correction main.css documents. Without it the shell-centring term was ~10% of
 * the viewport too large and the panel sat detached from the rail, floating over
 * the content column.
 */
const panelStyle = {
  left: "calc(max(0px, (100vw / var(--site-zoom, 1) - 1456px) / 2) + 246px)",
  maxWidth: "calc(100vw / var(--site-zoom, 1) - 271px)",
  maxHeight: "calc(100vh / var(--site-zoom, 1) - 120px)",
};

const sidebar = computed(() => siteConfig.theme.sidebar);
const icons = computed(() => siteConfig.assets.sidebarIcons);

/** One shared row shape, so the two groups cannot drift apart. */
// Measured off the reference render: a 31px row pitch, a 28px icon box inset
// 14px from the panel edge (8px list padding + 6px row padding), and a 19px gap
// to a 15px label. The icon art sits ~4px inside its box (the 83x82 source
// canvas), which is why the gap reads wider than it is declared. The 15px was
// originally pinned off LINE Seed KR's hangul advance (0.883em); the rail now
// renders in Inter (`font-inter` on the <aside>), which ships no hangul, so
// Korean labels fall through to the system hangul face and their widths no
// longer follow that derivation — re-measure before trusting it again.
const ROW_CLASS =
  "group w-full flex items-center gap-[19px] px-1.5 h-[31px] rounded-[6px] text-[15px] font-medium cursor-pointer transition-colors duration-150 hover:bg-[var(--sb-hover)]";

/**
 * Per-row colour: the active route takes the accent, everything else is white.
 * `--sb-hover` is passed as a custom property so the hover background stays a
 * theme token instead of a hardcoded rgba in the class string.
 *
 * @param active - Whether this row is the current route.
 * @returns {Record<string, string>} Inline style for the row.
 */
function rowStyle(active: boolean): Record<string, string> {
  return {
    color: active ? sidebar.value.activeItemColor : "#ffffff",
    "--sb-hover": sidebar.value.hoverBg,
  };
}

const gameItems = computed(() => [
  { id: "hot", path: "/hot", labelKey: "sidebar.hot", icon: icons.value.hot },
  { id: "slot", path: "/slots", labelKey: "sidebar.slot", icon: icons.value.slot },
  { id: "mini", path: "/mini", labelKey: "sidebar.mini", icon: icons.value.mini },
  { id: "sport", path: "/sports", labelKey: "sidebar.sport", icon: icons.value.sport },
  { id: "casino", path: "/casino", labelKey: "sidebar.casino", icon: icons.value.casino },
  // Fishing before virtual, matching the order the mobile Navbar renders them in.
  { id: "fishing", path: "/fishing", labelKey: "sidebar.fishing", icon: icons.value.fishing },
  { id: "virtual", path: "/virtual", labelKey: "sidebar.virtual", icon: icons.value.virtual },
]);

/**
 * Whether a rail route is the current one. Mirrors Navbar's rule so the rail and
 * the mobile bar agree: /slots also owns its lobby sub-pages.
 *
 * @param path - Unlocalised route path.
 * @returns {boolean} True when the route is active.
 */
function isActive(path: string): boolean {
  const current = route.path;
  if (path === "/slots") {
    return (
      current === localePath("/slots") ||
      current.startsWith(`${localePath("/slots")}/`) ||
      current.startsWith("/lobbies")
    );
  }
  return current === localePath(path) || current.startsWith(`${localePath(path)}/`);
}

/**
 * Navigates to a rail route, skipping the push when already there.
 *
 * @param path - Unlocalised route path.
 * @returns {void}
 */
function goTo(path: string): void {
  const resolved = localePath(path);
  if (route.path !== resolved) navigateTo(resolved);
}
</script>

<style scoped>
.rail-panel-enter-active,
.rail-panel-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.rail-panel-enter-from,
.rail-panel-leave-to {
  opacity: 0;
  transform: translateX(8px);
}

/* The rail icons ship white; the active row tints its icon to match the active
   label colour. A filter is used because the assets are flat PNGs, not SVGs. */
.sidebar-icon-active {
  filter: brightness(0) saturate(100%) invert(62%) sepia(72%) saturate(1355%) hue-rotate(345deg) brightness(101%) contrast(101%);
}
</style>
