<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-none flex-col px-4">
        <div class="w-full pt-5 pb-14">
          <PartnerPageHeader />

          <PartnerFilterBar date />

          <!-- Settleable per game -->
          <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <div v-for="g in settleable" :key="g.label"
              class="partner-tile rounded-2xl border px-4 py-4 flex flex-col gap-1.5"
              :style="{ background: cardBg, borderColor: panelBorder }">
              <span class="text-white/45 text-[11px] uppercase tracking-wider font-bold">{{ g.label }}</span>
              <span class="text-white font-extrabold text-lg tabular-nums">{{ fmt(g.value) }}</span>
            </div>
          </div>

          <!-- Total + request -->
          <div class="rounded-2xl border p-5 md:p-6 mb-6 flex flex-col md:flex-row md:items-center gap-4"
            :style="{ background: heroBg, borderColor: panelBorder }">
            <div class="flex flex-col">
              <span class="text-white/50 text-xs uppercase tracking-wider font-bold">{{
                $t('partnerPages.settleable') }}</span>
              <span class="font-extrabold text-2xl md:text-3xl tabular-nums" :style="{ color: accent }">{{ fmt(total)
              }}</span>
            </div>
            <button type="button"
              class="md:ml-auto h-12 px-8 rounded-xl font-extrabold text-base uppercase tracking-wide transition-transform hover:brightness-110 active:scale-[0.99]"
              :style="{ background: activeGradient, color: activeText }" @click="request">
              {{ $t('partnerPages.requestSettlement') }}
            </button>
          </div>

          <!-- Pending requests -->
          <div class="flex items-center gap-2.5 mb-3">
            <span class="w-1 h-5 rounded-full" :style="{ background: accent, boxShadow: `0 0 10px ${accent}` }" />
            <h2 class="text-white text-sm md:text-base font-bold">{{ $t('partnerPages.pendingRequests') }}</h2>
          </div>
          <PartnerTable :columns="columns" :rows="pending" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useCurrency } from "@/composables/useCurrency";
import { showSuccessAlert } from "~~/utils/swal-alert";
import type { PartnerColumn } from "@/utils/partnerMenu";

definePageMeta({ layout: "default" });

const { t } = useI18n();
const currency = useCurrency();

// Deposit-modal palette mapped to partner roles (usePartnerTheme).
const { accent, border: panelBorder, cardBg, panelBg: heroBg, activeGradient, activeText } = usePartnerTheme();
const fmt = (v: number) => currency.formatNumber(v);

const settleable = computed(() => [
  { label: t("partnerPages.filters.casino"), value: 260_000 },
  { label: t("partnerPages.filters.slot"), value: 180_000 },
  { label: t("partnerPages.filters.sport"), value: 360_000 },
  { label: t("partnerPages.filters.hotel"), value: 50_000 },
]);
const total = computed(() => settleable.value.reduce((s, g) => s + g.value, 0));

// Columns mirror stargazer-high settlement/SettlementRequestReport.vue
// (a daily bet / win / lose / rolling-fee / profit breakdown).
const columns = computed<PartnerColumn[]>(() => [
  { key: "date", label: t("partnerPages.col.date") },
  { key: "betAmount", label: t("partnerPages.col.betAmount"), align: "right", type: "currency" },
  { key: "winningAmount", label: t("partnerPages.col.winningAmount"), align: "right", type: "currency" },
  { key: "losingAmount", label: t("partnerPages.col.losingAmount"), align: "right", type: "currency" },
  { key: "rollFee", label: t("partnerPages.col.rollFee"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.profit"), align: "right", type: "profit" },
]);

const pending = [
  { date: "2026-07-16", betAmount: 5_240_000, winningAmount: 4_980_000, losingAmount: 260_000, rollFee: 52_400, profit: 295_000 },
  { date: "2026-07-15", betAmount: 3_120_000, winningAmount: 3_350_000, losingAmount: -230_000, rollFee: 31_200, profit: -198_800 },
  { date: "2026-07-14", betAmount: 1_980_000, winningAmount: 1_620_000, losingAmount: 360_000, rollFee: 19_800, profit: 379_800 },
];

async function request() {
  // UI only — no backend yet.
  await showSuccessAlert(
    t("partnerMenu.settlementRequest"),
    t("partnerPages.requestSuccess"),
  );
}

useSeoHead();
</script>

<style scoped>
.partner-tile {
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  box-shadow: 0 14px 34px -22px rgba(0, 0, 0, 0.8);
}
</style>
