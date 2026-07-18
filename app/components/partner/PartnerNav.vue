<template>
  <nav class="w-full px-4 pt-5 pb-1"
    :style="{ '--pn-accent': accent, '--pn-active-grad': activeGradient, '--pn-active-text': activeText }">
    <!-- ===== Desktop (lg+): horizontal tab bar with hover submenus ===== -->
    <!-- No overflow-x here: an overflow container would clip the absolutely
         positioned hover submenus (and show a scrollbar). Items wrap instead. -->
    <div
      class="partner-nav-bar hidden lg:flex flex-wrap items-stretch gap-1 rounded-2xl p-1.5 border"
      :style="{ borderColor: 'rgba(255,255,255,0.08)' }">
      <div v-for="item in PARTNER_MENU" :key="item.labelKey" class="relative group flex-1 min-w-max">
        <NuxtLink :to="item.to"
          class="relative flex items-center justify-center gap-2 h-11 md:h-[52px] px-3 md:px-4 rounded-xl text-[12px] md:text-[13px] font-bold uppercase tracking-wide transition-all duration-200 whitespace-nowrap"
          :class="isActive(item)
            ? 'pn-active'
            : 'text-white/60 hover:text-white hover:bg-white/[0.06]'">
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 md:w-[18px] md:h-[18px] shrink-0" fill="none"
            viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            :style="isActive(item) ? { color: accent } : {}">
            <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
          </svg>
          <span>{{ t(item.labelKey) }}</span>
          <svg v-if="item.children" class="w-3 h-3 shrink-0 opacity-70 transition-transform group-hover:rotate-180"
            fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
          </svg>
        </NuxtLink>

        <!-- Hover sub-menu -->
        <div v-if="item.children" class="absolute left-0 top-full pt-2 z-50 hidden group-hover:block min-w-full">
          <div
            class="pn-submenu min-w-[210px] rounded-xl overflow-hidden border shadow-[0_20px_50px_-16px_rgba(0,0,0,0.85)]"
            :style="{ borderColor: panelBorder, '--pn-accent': accent }">
            <NuxtLink v-for="child in item.children" :key="child.labelKey" :to="child.to"
              class="partner-sub-link flex items-center gap-2.5 px-4 py-3 text-[13px] font-semibold text-white/80 transition-colors whitespace-nowrap">
              <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: accent }" />
              {{ t(child.labelKey) }}
            </NuxtLink>
          </div>
        </div>
      </div>
    </div>

    <!-- ===== Mobile (< lg): compact trigger bar → slide-in sidebar ===== -->
    <button type="button"
      class="partner-nav-bar lg:hidden w-full flex items-center gap-3 h-12 px-4 rounded-2xl border cursor-pointer"
      :style="{ borderColor: 'rgba(255,255,255,0.08)' }" @click="sidebarOpen = true">
      <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24"
        stroke="currentColor" stroke-width="2" :style="{ color: accent }">
        <path stroke-linecap="round" stroke-linejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
      </svg>
      <span class="text-white text-[13px] font-bold uppercase tracking-wide">{{ t(activeLabelKey) }}</span>
      <svg class="w-4 h-4 ml-auto text-white/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M9 5l7 7-7 7" />
      </svg>
    </button>

    <!-- Sidebar drawer — teleported so no ancestor overflow/transform clips it. -->
    <Teleport to="body">
      <Transition name="pn-fade">
        <div v-if="sidebarOpen" class="fixed inset-0 z-[999] bg-black/60 backdrop-blur-[2px] lg:hidden"
          @click="sidebarOpen = false" />
      </Transition>
      <Transition name="pn-slide">
        <aside v-if="sidebarOpen"
          class="pn-drawer fixed top-0 left-0 bottom-0 z-[1000] w-[280px] max-w-[82vw] flex flex-col border-r lg:hidden"
          :style="{ borderColor: panelBorder, '--pn-accent': accent }">
          <!-- Drawer header -->
          <div class="flex items-center gap-2.5 px-4 h-14 border-b shrink-0" :style="{ borderColor: panelBorder }">
            <span class="w-1 h-5 rounded-full" :style="{ background: accent, boxShadow: `0 0 10px ${accent}` }" />
            <span class="text-white text-sm font-extrabold uppercase tracking-wide">{{ t('header.partner') }}</span>
            <button type="button" class="ml-auto p-2 -mr-2 text-white/60 hover:text-white cursor-pointer"
              :aria-label="t('common.close')" @click="sidebarOpen = false">
              <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <!-- Menu list -->
          <div class="flex-1 overflow-y-auto py-2">
            <div v-for="item in PARTNER_MENU" :key="item.labelKey">
              <!-- Parent with children: accordion toggle -->
              <button v-if="item.children" type="button"
                class="w-full flex items-center gap-3 px-4 py-3.5 text-[13px] font-bold uppercase tracking-wide cursor-pointer transition-colors"
                :class="isActive(item) ? 'text-white' : 'text-white/65 hover:text-white'"
                @click="toggleExpand(item.labelKey)">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px] shrink-0" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                  :style="isActive(item) ? { color: accent } : {}">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                </svg>
                <span>{{ t(item.labelKey) }}</span>
                <svg class="w-3.5 h-3.5 ml-auto opacity-70 transition-transform"
                  :class="expanded === item.labelKey ? 'rotate-180' : ''" fill="none" stroke="currentColor"
                  viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              <!-- Children (expanded) -->
              <div v-if="item.children && expanded === item.labelKey" class="pb-1">
                <NuxtLink v-for="child in item.children" :key="child.labelKey" :to="child.to"
                  class="partner-sub-link flex items-center gap-2.5 pl-11 pr-4 py-3 text-[13px] font-semibold text-white/70 transition-colors"
                  @click="sidebarOpen = false">
                  <span class="w-1.5 h-1.5 rounded-full shrink-0" :style="{ background: accent }" />
                  {{ t(child.labelKey) }}
                </NuxtLink>
              </div>

              <!-- Leaf item: direct link -->
              <NuxtLink v-if="!item.children" :to="item.to"
                class="flex items-center gap-3 px-4 py-3.5 text-[13px] font-bold uppercase tracking-wide transition-colors"
                :class="isActive(item) ? 'pn-drawer-active text-white' : 'text-white/65 hover:text-white'"
                @click="sidebarOpen = false">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-[18px] h-[18px] shrink-0" fill="none"
                  viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
                  :style="isActive(item) ? { color: accent } : {}">
                  <path stroke-linecap="round" stroke-linejoin="round" :d="item.icon" />
                </svg>
                <span>{{ t(item.labelKey) }}</span>
              </NuxtLink>
            </div>
          </div>
        </aside>
      </Transition>
    </Teleport>
  </nav>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from "vue";
import { PARTNER_MENU, type PartnerMenuItem } from "@/utils/partnerMenu";

const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();

// Deposit-modal palette mapped to partner roles (usePartnerTheme).
const { accent, border: panelBorder, activeGradient, activeText } = usePartnerTheme();

const isActive = (item: PartnerMenuItem) => {
  if (route.path === localePath(item.to)) return true;
  return (item.children ?? []).some((c) => route.path === localePath(c.to));
};

/** Label shown on the mobile trigger bar — the currently active menu item. */
const activeLabelKey = computed(
  () => PARTNER_MENU.find((m) => isActive(m))?.labelKey ?? "header.partner",
);

// --- Mobile sidebar state ---
const sidebarOpen = ref(false);
// Single-open accordion for parents with children; the active parent starts open.
const expanded = ref<string | null>(
  PARTNER_MENU.find((m) => m.children && isActive(m))?.labelKey ?? null,
);

const toggleExpand = (key: string) => {
  expanded.value = expanded.value === key ? null : key;
};

// Close the drawer on navigation and lock body scroll while it's open.
watch(() => route.path, () => {
  sidebarOpen.value = false;
});

watch(sidebarOpen, (open) => {
  if (typeof document === "undefined") return;
  document.body.style.overflow = open ? "hidden" : "";
});

onUnmounted(() => {
  if (typeof document !== "undefined") document.body.style.overflow = "";
});
</script>

<style scoped>
/* Dark glassmorphism — a darker, mostly-opaque fill over a strong blur so it
   reads as a solid dark panel while keeping the frosted glass edge. */
.partner-nav-bar {
  background: rgba(10, 10, 13, 0.82);
  backdrop-filter: blur(18px) saturate(1.4);
  -webkit-backdrop-filter: blur(18px) saturate(1.4);
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.4),
    0 16px 40px -18px rgba(0, 0, 0, 0.85),
    inset 0 1px 0 0 rgba(255, 255, 255, 0.06);
}

/* Accessible keyboard focus (the nav lives outside .partner-body). */
.partner-nav-bar a:focus-visible,
.partner-nav-bar button:focus-visible,
.partner-sub-link:focus-visible {
  outline: 2px solid var(--pn-accent, #FF7A00);
  outline-offset: 2px;
  border-radius: 10px;
}

/* Active tab — no fill, just a glowing orange bottom border. The icon is orange
   (set inline); the label stays white. */
.pn-active {
  color: #fff;
}

.pn-active::after {
  content: "";
  position: absolute;
  left: 14px;
  right: 14px;
  bottom: 0;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--pn-accent);
  box-shadow:
    0 0 10px 1px var(--pn-accent),
    0 4px 16px 0 color-mix(in srgb, var(--pn-accent) 75%, transparent);
}

/* Desktop hover submenu — solid, opaque dark surface (page must not bleed
   through), with a faint accent tint at the top to match the drawer. */
.pn-submenu {
  background:
    radial-gradient(120% 80% at 0% 0%, color-mix(in srgb, var(--pn-accent, #ff7a00) 10%, transparent) 0%, transparent 60%),
    linear-gradient(180deg, #131418 0%, #0c0c0e 100%);
}

/* Mobile drawer — solid, opaque dark surface so the page never bleeds through,
   with a faint accent tint at the very top for identity. */
.pn-drawer {
  background:
    radial-gradient(120% 60% at 0% 0%, color-mix(in srgb, var(--pn-accent, #ff7a00) 10%, transparent) 0%, transparent 55%),
    linear-gradient(180deg, #121317 0%, #0b0b0d 50%, #08080a 100%);
  box-shadow: 0 0 60px -12px rgba(0, 0, 0, 0.9);
}

/* Active leaf row in the mobile drawer — subtle accent tint. */
.pn-drawer-active {
  background: color-mix(in srgb, var(--pn-accent) 14%, transparent);
}

.partner-sub-link:hover {
  background: color-mix(in srgb, var(--pn-accent, #fff) 12%, transparent);
  color: #fff;
}

/* Drawer transitions */
.pn-fade-enter-active,
.pn-fade-leave-active {
  transition: opacity 0.2s ease;
}

.pn-fade-enter-from,
.pn-fade-leave-to {
  opacity: 0;
}

.pn-slide-enter-active,
.pn-slide-leave-active {
  transition: transform 0.25s ease;
}

.pn-slide-enter-from,
.pn-slide-leave-to {
  transform: translateX(-100%);
}
</style>
