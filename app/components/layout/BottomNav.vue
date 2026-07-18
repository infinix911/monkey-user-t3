<template>
  <nav class="lg:hidden fixed bottom-[-8px] left-0 right-0 z-[61]">
    <!-- @container + cqw units size the bar off ITS OWN width, not the
         viewport, and a max-width keeps it phone-proportioned on tablets/iPad
         (where a viewport-relative bar would balloon and the centre circle
         would no longer match the notch). On phones the bar ≈ viewport, so the
         proportions are unchanged from the previous vw-based sizing. -->
    <div class="relative @container w-[calc(100%_+_4px)] max-w-[520px] mx-auto">
      <!-- Bar background — inline SVG from the provided Figma export
           (viewBox 758x119: a 750x105 rounded bar + centred FAB notch, plus
           bottom space for the drop-shadow filter). Rendered at natural aspect
           ratio (w-full h-auto) so the notch keeps its shape and the elevated
           Promosi circle lines up. The gloss gradient's geometry is from the
           artwork; its colours come from the API
           (siteConfig.theme.bottomNav.barGradientStops). The soft bottom shadow
           is the SVG drop-shadow filter below. -->
      <svg viewBox="0 0 758 119" fill="none" class="block w-full h-auto select-none pointer-events-none"
        aria-hidden="true">
        <defs>
          <!-- Drop shadow baked into the source art: offset (5.2, 10.4),
               blur 1.3, black at 50%. -->
          <filter id="bnBarShadow" x="0" y="0" width="757.808" height="118.015" filterUnits="userSpaceOnUse"
            color-interpolation-filters="sRGB">
            <feFlood flood-opacity="0" result="BackgroundImageFix" />
            <feColorMatrix in="SourceAlpha" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
              result="hardAlpha" />
            <feOffset dx="5.20548" dy="10.411" />
            <feGaussianBlur stdDeviation="1.30137" />
            <feComposite in2="hardAlpha" operator="out" />
            <feColorMatrix type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.5 0" />
            <feBlend mode="normal" in2="BackgroundImageFix" result="effect1_dropShadow" />
            <feBlend mode="normal" in="SourceGraphic" in2="effect1_dropShadow" result="shape" />
          </filter>
          <!-- Diagonal gloss — axis/offsets from the artwork; colours from the
               API site config. The hard edge at ≈0.4327 is the gloss boundary. -->
          <linearGradient id="bnBarBase" gradientUnits="userSpaceOnUse" x1="685" y1="-84.8096" x2="531.264"
            y2="-278.874">
            <stop offset="0" :stop-color="siteConfig.theme.bottomNav.barGradientStops.light" />
            <stop offset="0.432692" :stop-color="siteConfig.theme.bottomNav.barGradientStops.midDark" />
            <stop offset="0.432792" :stop-color="siteConfig.theme.bottomNav.barGradientStops.postEdge" />
            <stop offset="1" :stop-color="siteConfig.theme.bottomNav.barGradientStops.dark" />
          </linearGradient>
        </defs>
        <!-- Bar silhouette: 750x105 rounded rect (corner r=14) with the centred
             FAB notch (centre x=375, dips to y≈66) that seats the Promosi disc. -->
        <g filter="url(#bnBarShadow)">
          <path :d="barPath" fill="url(#bnBarBase)" />
        </g>
      </svg>

      <!-- Elevated Promosi circle — centred on the NOTCH, not the bar: the
           750-wide bar is left-aligned in the 758-wide viewBox (the extra 8px is
           the drop-shadow's right margin), so the notch centre sits at
           375/758 ≈ 49.472%, not 50%. Positioning the disc there keeps it
           concentric with the notch. The disc is a CSS gradient (was a 130KB
           PNG) with a soft drop shadow. No border: the dark ring seen in the
           design is just the page background showing through the notch behind
           the slightly-smaller disc. -->
      <button type="button"
        class="absolute left-[49.472%] -translate-x-1/2 -top-[7.36cqw] w-[14.5cqw] aspect-square z-20 flex items-center justify-center transition-transform active:scale-95"
        @click="handleCenterClick">
        <span aria-hidden="true" class="absolute inset-0 rounded-full shadow-[0_3px_6px_rgba(0,0,0,0.35)]"
          :style="circleStyle" />
        <BottomNavIcon :name="centerItem.icon" :class="centerIconClass"
          class="relative block h-auto text-white drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.4)]" />
      </button>

      <!-- Item overlay: HOME · DEPOSIT · [PROMOSI] · WITHDRAW · MENU. The
           overlay covers the bar only (top-0 → bar bottom; bottom-[1.85cqw]
           excludes the SVG's shadow space below), and each column centres its
           icon+label group vertically so there's equal padding above and below. -->
      <div class="absolute left-0 right-0 top-0 bottom-[1.85cqw] z-10 flex items-stretch mb-[-3px]">
        <!-- Left items -->
        <button v-for="item in leftItems" :key="item.id" type="button"
          class="flex-1 flex flex-col items-center justify-center gap-[1cqw] transition-transform active:scale-95"
          @click="handleNavClick(item)">
          <span class="flex items-end justify-center h-[6cqw]">
            <BottomNavIcon :name="item.icon" :class="iconSizeClass(item.id)"
              class="block w-auto text-white [filter:drop-shadow(0_2px_2px_rgba(0,0,0,0.55))_drop-shadow(0_3px_4px_rgba(0,0,0,0.45))]" />
          </span>
          <span class="text-white font-bold uppercase leading-none tracking-wide" :style="labelStyle">
            {{ $t(item.labelKey) }}
          </span>
        </button>

        <!-- Center column: holds only the Promosi label (the circle is the
             absolutely-centred button above). A spacer matching the side icon
             box keeps this label centred to the same baseline as the others and
             sitting below the elevated disc. -->
        <button type="button"
          class="flex-1 flex flex-col items-center justify-center gap-[1cqw] transition-transform active:scale-95"
          @click="handleCenterClick">
          <span class="block h-[6cqw]" aria-hidden="true" />
          <span class="text-white font-bold uppercase leading-none tracking-wide" :style="labelStyle">
            {{ $t(centerItem.labelKey) }}
          </span>
        </button>

        <!-- Right items. The MENU button toggles the profile modal
             sidebar. Those panels close on an outside `mousedown` at the
             document level, so without intervention the menu's own mousedown
             would close the open panel and its click would immediately re-open
             it — it could never toggle shut. We stop the menu button's
             mousedown from reaching the document handler (and keep
             data-hamburger-menu as a secondary guard for the profile modal). -->
        <button v-for="item in rightItems" :key="item.id" type="button"
          :data-hamburger-menu="item.id === 'menu' ? 'true' : undefined"
          class="flex-1 flex flex-col items-center justify-center gap-[1cqw] transition-transform active:scale-95"
          @mousedown="item.id === 'menu' && $event.stopPropagation()" @click="handleNavClick(item)">
          <span class="flex items-end justify-center h-[6cqw]">
            <BottomNavIcon :name="item.icon" :class="iconSizeClass(item.id)"
              class="block w-auto text-white [filter:drop-shadow(0_2px_2px_rgba(0,0,0,0.55))_drop-shadow(0_3px_4px_rgba(0,0,0,0.45))]" />
          </span>
          <span class="text-white font-bold uppercase leading-none tracking-wide" :style="labelStyle">
            {{ $t(item.labelKey) }}
          </span>
        </button>
      </div>
    </div>
  </nav>
  <!-- The Promotions modal (opened by the centre Promosi button) is hosted
       once at the layout level (default.vue) and shared via the ui store. -->
</template>

<script setup lang="ts">

const authStore = useAuthStore();
const uiStore = useUiStore();


const features = useFeatures();
const route = useRoute();
const localePath = useLocalePath();

// Bar silhouette path in the 750x105 design space (provided Figma export): a
// rounded rectangle (corner r=14) whose top edge is interrupted by a centred
// FAB notch — eased in with cubic shoulders (notch centre x=375, deepest point
// y≈66) — that seats the elevated Promosi circle. A constant: pure geometry.
const barPath =
  "M736 0C743.732 7.27986e-06 750 6.26899 750 14.001V105.001H0V14C0.000263444 " +
  "6.26824 6.26818 0 14 0H296.147C302.719 0 307.955 5.33305 309.184 11.7893C315.078 " +
  "42.7701 342.303 66.1914 375 66.1914C407.697 66.1914 434.922 42.7701 440.816 " +
  "11.7893C442.045 5.33305 447.281 0 453.853 0H736Z";

const siteConfig = useSiteConfig();

const circleStyle = computed(() => ({
  background: siteConfig.theme.bottomNav.promoCircleGradient,
}));

// Labels are typed text in the LINE Seed font (clamped so they scale with the
// bar without getting too large on wide phones).
const labelStyle = {
  fontFamily: "var(--font-line-seed)",
  fontSize: "clamp(8px, 2.4cqw, 11px)",
  textShadow: "0 2px 3px rgba(0,0,0,0.85), 0 1px 1px rgba(0,0,0,0.7)",
};

// The menu icon is a wide/short glyph (59×41); sized to the same height as the
// squarer icons it looks oversized, so give it a smaller height to match.
const iconSizeClass = (id: string) =>
  id === "menu" ? "h-[4.4cqw]" : id === "rtp" ? "h-[7cqw]" : "h-[5.8cqw]";

interface NavItem {
  id: string;
  labelKey: string;
  icon: string; // BottomNavIcon glyph name
  requiresAuth: boolean;
}

const isAuth = computed(() => authStore.isAuthenticated);

// The bar has two faces. Authenticated: HOME · DEPOSIT · [PROMOSI] · WITHDRAW ·
// MENU (deposit/withdraw payments-gated, Promosi the centre FAB). Guests get a
// public set instead: BERANDA · RTP · [MASUK] · PROMOSI · MENU — the centre FAB
// becomes the login button and the side slots expose RTP + Promosi (no auth).
const leftItems = computed<NavItem[]>(() =>
  isAuth.value
    ? [
        { id: "home", labelKey: "navbar.home", icon: "home", requiresAuth: false },
        ...(features.payments
          ? [{ id: "deposit", labelKey: "navbar.deposit", icon: "deposit", requiresAuth: true }]
          : []),
      ]
    : [
        { id: "home", labelKey: "navbar.home", icon: "home", requiresAuth: false },
        { id: "rtp", labelKey: "navbar.rtp", icon: "rtp", requiresAuth: false },
      ],
);

const rightItems = computed<NavItem[]>(() =>
  isAuth.value
    ? [
        ...(features.payments
          ? [{ id: "withdraw", labelKey: "navbar.withdraw", icon: "withdraw", requiresAuth: true }]
          : []),
        { id: "menu", labelKey: "navbar.menu", icon: "menu", requiresAuth: true },
      ]
    : [
        { id: "promotion", labelKey: "navbar.promotion", icon: "promotion", requiresAuth: false },
        { id: "menu", labelKey: "navbar.menu", icon: "menu", requiresAuth: false },
      ],
);

// Centre FAB: Promosi when signed in, the MASUK (login) button for guests.
const centerItem = computed(() =>
  isAuth.value
    ? { icon: "promotion", labelKey: "navbar.promotion" }
    : { icon: "login", labelKey: "navbar.login" },
);

// Centre FAB icon size. The guest `login` glyph is a full person-in-a-disc, so
// it should nearly fill the red circle (leaving only a thin ring); the
// authenticated `promotion` gift glyph needs breathing room, so it stays small.
const centerIconClass = computed(() =>
  isAuth.value ? "w-[46%]" : "w-[60%]",
);

const handleCenterClick = () => {
  if (isAuth.value) uiStore.setShowPromotionModal(true);
  else uiStore.setShowLoginModal(true);
};

const handleNavClick = (item: NavItem) => {
  if (item.id === "home") {
    // Home → the landing page. The Hot category now has its own /hot page and
    // is no longer auto-selected on home (the Navbar only highlights Hot when
    // on /hot). If already on home, scroll past the banner to the games grid.
    const home = localePath("/");
    if (route.path === home) {
      const banner = document.getElementById("banner-container");
      if (banner) {
        window.scrollTo({
          top: banner.offsetTop + banner.offsetHeight,
          behavior: "smooth",
        });
      }
    } else {
      navigateTo(home);
    }
    return;
  }

  // Public guest items — no auth gate.
  if (item.id === "rtp") {
    navigateTo(localePath("/slot-rtp"));
    return;
  }
  if (item.id === "promotion") {
    uiStore.setShowPromotionModal(true);
    return;
  }

  // Everything else (deposit / withdraw / menu) requires a session; guests are
  // sent straight to login — this also covers the guest MENU button.
  if (!authStore.isAuthenticated) {
    uiStore.setShowLoginModal(true);
    return;
  }

  if (item.id === "deposit") uiStore.setShowDepositModal(true);
  else if (item.id === "withdraw") uiStore.setShowWithdrawalModal(true);
  else if (item.id === "menu") {
    // Toggle the profile modal — tapping the menu icon again closes it.
    uiStore.setShowProfileModal(!uiStore.showProfileModal);
  }
};
</script>
