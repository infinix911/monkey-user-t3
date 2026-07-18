<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-none flex-col px-4">
        <div class="w-full pt-5 pb-14">
          <!-- Page header — plain title row; the partner body container
               (default layout) already provides the panel background. -->
          <div class="flex items-center gap-3 mb-6">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 md:w-8 md:h-8 shrink-0" fill="none"
              viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.9" :style="{ color: accent }">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M18 18.72a9.094 9.094 0 0 0 3.741-.479 3 3 0 0 0-4.682-2.72m.94 3.198.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0 1 12 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 0 1 6 18.719m12 0a5.971 5.971 0 0 0-.941-3.197m0 0A5.995 5.995 0 0 0 12 12.75a5.995 5.995 0 0 0-5.058 2.772m0 0a3 3 0 0 0-4.681 2.72 8.986 8.986 0 0 0 3.74.477m.94-3.197a5.971 5.971 0 0 0-.94 3.197M15 6.75a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm6 3a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Zm-13.5 0a2.25 2.25 0 1 1-4.5 0 2.25 2.25 0 0 1 4.5 0Z" />
            </svg>
            <div class="flex flex-col">
              <h1 class="text-white text-xl md:text-2xl font-extrabold leading-tight tracking-tight"
                style="font-family: var(--font-line-seed)">
                {{ $t("partner.title") }}
              </h1>
              <span class="text-white/45 text-xs md:text-sm mt-0.5">{{ $t(activeTab.label) }}</span>
            </div>
          </div>

          <!-- Sub-menu tabs — Deposit · Withdrawal · History (one at a time,
               so the page no longer stacks three bordered cards). -->
          <div class="flex flex-wrap gap-1.5 mb-5">
            <button v-for="tab in tabs" :key="tab.key" type="button" class="partner-tab"
              :class="tab.key === active ? 'is-active' : ''"
              :style="tab.key === active ? { background: activeGradient, color: activeText } : {}"
              @click="active = tab.key">
              {{ $t(tab.label) }}
            </button>
          </div>

          <!-- Active section -->
          <component :is="activeTab.component" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import PartnerDepositList from "@/components/partner/PartnerDepositList.vue";
import PartnerWithdrawalList from "@/components/partner/PartnerWithdrawalList.vue";
import PartnerTransactionHistoryList from "@/components/partner/PartnerTransactionHistoryList.vue";

definePageMeta({
  layout: "default",
});

// Partner palette (usePartnerTheme) for the active tab.
const { accent, activeGradient, activeText } = usePartnerTheme();

const tabs = [
  { key: "deposit", label: "partner.deposits.title", component: PartnerDepositList },
  { key: "withdraw", label: "partner.withdrawals.title", component: PartnerWithdrawalList },
  { key: "history", label: "partner.history.title", component: PartnerTransactionHistoryList },
] as const;

// Deep-linkable via ?tab=deposit|withdraw|history (from the partner nav submenu).
const route = useRoute();
const initial = tabs.find((tb) => tb.key === route.query.tab)?.key ?? "deposit";
const active = ref<(typeof tabs)[number]["key"]>(initial);

// Keep the tab in sync when the nav submenu changes ?tab while already here.
watch(
  () => route.query.tab,
  (tab) => {
    const match = tabs.find((tb) => tb.key === tab);
    if (match) active.value = match.key;
  },
);

const activeTab = computed(() => tabs.find((tb) => tb.key === active.value) ?? tabs[0]);

useSeoHead();
useBreadcrumbSchema([
  { name: "Home", path: "/" },
  { name: "Partner", path: "/partner" },
]);
</script>

<style scoped>
.partner-tab {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  padding: 9px 16px;
  border-radius: 12px;
  color: rgba(255, 255, 255, 0.6);
  transition: background-color 0.15s ease, color 0.15s ease;
  cursor: pointer;
}

.partner-tab:not(.is-active):hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}
</style>
