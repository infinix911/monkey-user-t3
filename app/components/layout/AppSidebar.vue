<template>
  <!-- Rail shell. Colours come from theme.sidebar (border #B04C00 / 60% black /
       #434343 rule) so the CMS can retheme it like every other surface. -->
  <aside
    class="w-full rounded-[10px] overflow-hidden"
    :style="{ border: sidebar.border, background: sidebar.bg }"
    :aria-label="$t('sidebar.label')">
    <!-- Deposit / withdraw. Deliberately the SAME background token the top
         nav's transaction panel uses (theme.nav.depositSectionGradient) rather
         than a second gradient, so the two surfaces can never drift apart. -->
    <div v-if="features.payments" class="p-2.5">
      <div
        class="h-[74px] rounded-[8px] overflow-hidden flex items-stretch"
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
        <div class="w-px bg-white/70 my-4" />
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

    <!-- Game categories -->
    <ul class="px-2.5 pb-2.5 pt-0.5 flex flex-col gap-0.5">
      <li v-for="item in gameItems" :key="item.id">
        <button type="button" :class="ROW_CLASS" :style="rowStyle(isActive(item.path))" @click="goTo(item.path)">
          <img
            :src="item.icon"
            :alt="''"
            aria-hidden="true"
            width="22"
            height="22"
            class="w-[22px] h-[22px] object-contain flex-shrink-0"
            :class="{ 'sidebar-icon-active': isActive(item.path) }"
            loading="lazy"
            decoding="async">
          <span>{{ $t(item.labelKey) }}</span>
        </button>
      </li>
    </ul>

    <!-- Group rule -->
    <div class="mx-2.5 h-px" :style="{ backgroundColor: sidebar.divider }" />

    <!-- Account / support -->
    <ul class="px-2.5 py-2.5 flex flex-col gap-0.5">
      <li v-for="item in accountItems" :key="item.id">
        <button type="button" :class="ROW_CLASS" :style="rowStyle(false)" @click="item.onSelect()">
          <img
            :src="item.icon"
            :alt="''"
            aria-hidden="true"
            width="22"
            height="22"
            class="w-[22px] h-[22px] object-contain flex-shrink-0"
            loading="lazy"
            decoding="async">
          <span>{{ $t(item.labelKey) }}</span>
        </button>
      </li>
    </ul>
  </aside>
</template>

<script setup lang="ts">
/**
 * Desktop left rail (lg+ two-column layout): deposit/withdraw, the game
 * categories, and the account/support entries.
 *
 * The categories mirror Navbar's list — the rail replaces that bar on desktop
 * while Navbar keeps serving mobile, so `isActive` follows the same rules
 * (including /slots owning the /lobbies sub-pages).
 *
 * The account entries have no routes of their own: three are layout-level
 * modals and three are panels inside the profile modal, reached by asking the
 * ui store to open that section (see `setShowProfileModal`). Anything
 * account-bound prompts login first rather than opening an empty panel.
 */
import { computed } from "vue";

const siteConfig = useSiteConfig();
const authStore = useAuthStore();
const uiStore = useUiStore();
const route = useRoute();
const localePath = useLocalePath();
const features = useFeatures();
const { onDeposit, onWithdraw } = useNavTransactionActions();

const sidebar = computed(() => siteConfig.theme.sidebar);
const icons = computed(() => siteConfig.assets.sidebarIcons);

/** One shared row shape, so the two groups cannot drift apart. */
const ROW_CLASS =
  "group w-full flex items-center gap-2.5 px-2 h-[34px] rounded-[6px] text-[14px] font-medium cursor-pointer transition-colors duration-150 hover:bg-[var(--sb-hover)]";

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
]);

/**
 * Opens a profile-modal panel, prompting login first when the user is a guest.
 *
 * @param section - Account section id, as keyed in NewProfileModal's map.
 * @returns {void}
 */
function openAccountSection(section: string): void {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  uiStore.setShowProfileModal(true, section);
}

/**
 * Opens the inquiry modal, prompting login first when the user is a guest.
 *
 * @returns {void}
 */
function openInquiry(): void {
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }
  uiStore.setShowInquiryModal(true);
}

const accountItems = computed(() => [
  {
    id: "notice",
    labelKey: "sidebar.notice",
    icon: icons.value.notice,
    onSelect: () => uiStore.setShowNoticeModal(true),
  },
  {
    id: "promotion",
    labelKey: "sidebar.promotion",
    icon: icons.value.promotion,
    onSelect: () => uiStore.setShowPromotionModal(true),
  },
  {
    id: "inquiry",
    labelKey: "sidebar.inquiry",
    icon: icons.value.inquiry,
    onSelect: openInquiry,
  },
  {
    id: "transaction",
    labelKey: "sidebar.transaction",
    icon: icons.value.transaction,
    onSelect: () => openAccountSection("transaction"),
  },
  {
    id: "betting",
    labelKey: "sidebar.betting",
    icon: icons.value.betting,
    onSelect: () => openAccountSection("bettingReport"),
  },
  {
    id: "password",
    labelKey: "sidebar.password",
    icon: icons.value.password,
    onSelect: () => openAccountSection("changePassword"),
  },
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
/* The rail icons ship white; the active row tints its icon to match the active
   label colour. A filter is used because the assets are flat PNGs, not SVGs. */
.sidebar-icon-active {
  filter: brightness(0) saturate(100%) invert(62%) sepia(72%) saturate(1355%) hue-rotate(345deg) brightness(101%) contrast(101%);
}
</style>
