<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-none flex-col px-4">
        <div class="w-full pt-5 pb-14">
          <PartnerPageHeader />

          <!-- Member select + date-range toolbar -->
          <PartnerFilterBar date>
            <template #prepend>
              <select v-model="memberFilter"
                class="h-[38px] rounded-lg bg-white/[0.04] border border-white/10 text-white text-[13px] px-3 focus:outline-none [color-scheme:dark]">
                <option value="">{{ t('partnerPages.filters.allMembers') }}</option>
                <option v-for="m in members" :key="m" :value="m">{{ m }}</option>
              </select>
            </template>
          </PartnerFilterBar>

          <PartnerTable :columns="columns" :rows="rows" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { PartnerColumn } from "@/utils/partnerMenu";

definePageMeta({ layout: "default" });
const { t } = useI18n();

// Member filter (dummy list) + date range live in the toolbar.
const memberFilter = ref("");
const members = ["player_win7", "lucky_jin", "hoyaVIP", "seoul_ace", "star_777"];

// Columns mirror stargazer-high game-statistics/Statistics.vue tableHeaders
// (a daily statistics table).
const columns = computed<PartnerColumn[]>(() => [
  { key: "date", label: t("partnerPages.col.date"), type: "accent" },
  { key: "depAmount", label: t("partnerPages.col.depAmount"), align: "right", type: "currency" },
  { key: "widAmount", label: t("partnerPages.col.widAmount"), align: "right", type: "currency" },
  { key: "depWidProfit", label: t("partnerPages.col.depWidProfit"), align: "right", type: "profit" },
  { key: "betAmount", label: t("partnerPages.col.betAmount"), align: "right", type: "currency" },
  { key: "winAmount", label: t("partnerPages.col.winAmount"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.profit"), align: "right", type: "profit" },
  { key: "subRolling", label: t("partnerPages.col.subRolling"), align: "right", type: "currency" },
  { key: "rolling", label: t("partnerPages.col.rolling"), align: "right", type: "currency" },
]);

const rows = [
  { date: "2026-07-16", depAmount: 3_200_000, widAmount: 2_100_000, depWidProfit: 1_100_000, betAmount: 5_240_000, winAmount: 4_980_000, profit: 260_000, subRolling: 52_400, rolling: 26_200 },
  { date: "2026-07-15", depAmount: 2_800_000, widAmount: 2_950_000, depWidProfit: -150_000, betAmount: 3_120_000, winAmount: 3_350_000, profit: -230_000, subRolling: 31_200, rolling: 15_600 },
  { date: "2026-07-14", depAmount: 1_900_000, widAmount: 1_540_000, depWidProfit: 360_000, betAmount: 1_980_000, winAmount: 1_620_000, profit: 360_000, subRolling: 19_800, rolling: 9_900 },
  { date: "2026-07-13", depAmount: 640_000, widAmount: 590_000, depWidProfit: 50_000, betAmount: 640_000, winAmount: 590_000, profit: 50_000, subRolling: 6_400, rolling: 3_200 },
  { date: "2026-07-12", depAmount: 2_450_000, widAmount: 1_820_000, depWidProfit: 630_000, betAmount: 4_100_000, winAmount: 3_760_000, profit: 340_000, subRolling: 41_000, rolling: 20_500 },
];

useSeoHead();
</script>
