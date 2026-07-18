<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-none flex-col px-4">
        <div class="w-full pt-5 pb-14">
          <PartnerPageHeader />
          <PartnerFilterBar date />
          <PartnerTable :columns="columns" :rows="rows" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { PartnerColumn } from "@/utils/partnerMenu";

definePageMeta({ layout: "default" });
const { t } = useI18n();

// Columns mirror stargazer-high settlement/SettlementReport.vue tableHeaders.
const columns = computed<PartnerColumn[]>(() => [
  { key: "settleStart", label: t("partnerPages.col.settleStart") },
  { key: "settleEnd", label: t("partnerPages.col.settleEnd") },
  { key: "reqDate", label: t("partnerPages.col.reqDate") },
  { key: "processDate", label: t("partnerPages.col.processDate") },
  { key: "amount", label: t("partnerPages.col.settlementAmount"), align: "right", type: "currency" },
  { key: "status", label: t("partnerPages.col.status"), align: "center", type: "status" },
]);

const rows = [
  { settleStart: "2026-07-08", settleEnd: "2026-07-14", reqDate: "2026-07-15 09:20", processDate: "2026-07-15 11:02", amount: 440_000, status: "Completed" },
  { settleStart: "2026-07-01", settleEnd: "2026-07-07", reqDate: "2026-07-08 10:12", processDate: "2026-07-08 12:40", amount: 250_000, status: "Completed" },
  { settleStart: "2026-06-24", settleEnd: "2026-06-30", reqDate: "2026-07-01 08:45", processDate: "2026-07-01 10:30", amount: 730_000, status: "Completed" },
  { settleStart: "2026-06-17", settleEnd: "2026-06-23", reqDate: "2026-06-24 09:05", processDate: "2026-06-24 13:15", amount: 100_000, status: "Completed" },
  { settleStart: "2026-07-15", settleEnd: "2026-07-16", reqDate: "2026-07-16 18:22", processDate: "—", amount: 295_000, status: "Pending" },
];

useSeoHead();
</script>
