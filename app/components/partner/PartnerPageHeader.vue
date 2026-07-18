<template>
  <!-- Title row — a plain orange icon (no container) + title + description.
       The partner body container (default layout) provides the panel bg. -->
  <div class="flex items-center gap-3.5 mb-7">
    <svg xmlns="http://www.w3.org/2000/svg" class="w-9 h-9 md:w-10 md:h-10 shrink-0" fill="none" viewBox="0 0 24 24"
      stroke="currentColor" stroke-width="1.7" :style="{ color: accent }">
      <path stroke-linecap="round" stroke-linejoin="round" :d="icon" />
    </svg>
    <div class="flex flex-col">
      <h1 class="text-white text-xl md:text-2xl font-extrabold leading-tight tracking-tight"
        style="font-family: var(--font-line-seed)">
        {{ t(titleKey) }}
      </h1>
      <span v-if="description" class="text-white/45 text-xs md:text-sm mt-1">{{ description }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { PARTNER_MENU } from "@/utils/partnerMenu";

const props = defineProps<{ subtitle?: string }>();

const { t } = useI18n();
const route = useRoute();
const localePath = useLocalePath();

// Partner palette (usePartnerTheme) for the accent icon.
const { accent } = usePartnerTheme();

const match = computed(() => {
  const path = route.path;
  const parent = PARTNER_MENU.find((m) => localePath(m.to) === path);
  if (parent) return { titleKey: parent.labelKey, icon: parent.icon, descKey: parent.descKey };
  for (const m of PARTNER_MENU) {
    const child = (m.children ?? []).find((c) => localePath(c.to) === path);
    if (child) return { titleKey: child.labelKey, icon: m.icon, descKey: child.descKey ?? m.descKey };
  }
  return { titleKey: "header.partner", icon: PARTNER_MENU[0]!.icon, descKey: PARTNER_MENU[0]!.descKey };
});

const titleKey = computed(() => match.value.titleKey);
const icon = computed(() => match.value.icon);

/** Description under the title — an explicit `subtitle` prop wins, else the
 *  per-page description resolved from the partner menu. */
const description = computed(() =>
  props.subtitle ?? (match.value.descKey ? t(match.value.descKey) : undefined),
);
</script>
