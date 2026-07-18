<template>
  <div class="flex min-h-[55vh] flex-col font-sans" :style="{ '--pp-accent': accent }">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-[1150px] flex-col px-4">
        <div class="w-full pt-6 pb-14">
          <div class="partner-placeholder relative rounded-2xl border px-6 py-16 md:py-24 flex flex-col items-center text-center overflow-hidden"
            :style="{ background: cardBg, borderColor: panelBorder }">
            <span class="pp-icon relative z-10 mb-6 w-[72px] h-[72px] rounded-[20px] flex items-center justify-center"
              :style="{ background: accent }">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 text-black" fill="none" viewBox="0 0 24 24"
                stroke="currentColor" stroke-width="1.8">
                <path stroke-linecap="round" stroke-linejoin="round" :d="icon" />
              </svg>
            </span>
            <h1 class="relative z-10 text-white text-2xl md:text-[32px] font-extrabold mb-2.5 tracking-tight"
              style="font-family: var(--font-line-seed)">
              {{ t(titleKey) }}
            </h1>
            <p class="relative z-10 text-white/45 text-sm md:text-base max-w-md">{{ t('partnerMenu.comingSoon') }}</p>
            <span class="relative z-10 mt-6 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border"
              :style="{ color: accent, borderColor: `color-mix(in srgb, ${accent} 45%, transparent)`, background: `color-mix(in srgb, ${accent} 10%, transparent)` }">
              <span class="w-1.5 h-1.5 rounded-full animate-pulse" :style="{ background: accent }" />
              {{ t('partnerMenu.inDevelopment') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { PARTNER_MENU } from "@/utils/partnerMenu";

const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();

// Deposit-modal palette mapped to partner roles (usePartnerTheme).
const { accent, border: panelBorder, cardBg } = usePartnerTheme();

// Resolve the page title + icon from the shared partner menu using the route.
const match = computed(() => {
  const path = route.path;
  const parent = PARTNER_MENU.find((m) => localePath(m.to) === path);
  if (parent) return { titleKey: parent.labelKey, icon: parent.icon };
  for (const m of PARTNER_MENU) {
    const child = (m.children ?? []).find((c) => localePath(c.to) === path);
    if (child) return { titleKey: child.labelKey, icon: m.icon };
  }
  return { titleKey: "header.partner", icon: PARTNER_MENU[0]!.icon };
});

const titleKey = computed(() => match.value.titleKey);
const icon = computed(() => match.value.icon);
</script>

<style scoped>
.partner-placeholder {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 20px 50px -24px rgba(0, 0, 0, 0.85);
}

/* Soft accent halo behind the icon. */
.partner-placeholder::before {
  content: "";
  position: absolute;
  top: 30%;
  left: 50%;
  width: 340px;
  height: 340px;
  transform: translate(-50%, -50%);
  background: radial-gradient(circle, color-mix(in srgb, var(--pp-accent) 26%, transparent) 0%, transparent 66%);
  pointer-events: none;
}

.pp-icon {
  box-shadow: 0 10px 30px -6px color-mix(in srgb, var(--pp-accent) 70%, transparent);
}
</style>
