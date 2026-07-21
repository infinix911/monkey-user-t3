<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center"><div class="relative z-10 flex w-full max-w-none flex-col px-4">
      <div class="w-full pt-5 pb-14">
        <PartnerPageHeader />
        <PartnerFilterBar v-model:start="startDate" v-model:end="endDate" date @search="loadStats">
          <template #prepend>
            <select v-model="memberId" class="h-[38px] rounded-lg bg-white/[0.04] border border-white/10 text-white text-[13px] px-3">
              <option value="">{{ t("partnerPages.filters.allMembers") }}</option>
              <option v-for="member in members" :key="member.memberId" :value="member.memberId">{{ member.username }}</option>
            </select>
          </template>
        </PartnerFilterBar>
        <PartnerTable :columns="columns" :rows="rows" />
      </div>
    </div></div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { partnerGameStatSchema, partnerMemberSelectSchema } from "@/interfaces/partner.interface";
import type { PartnerColumn } from "@/utils/partnerMenu";

definePageMeta({ layout: "default" });
const { t } = useI18n();
const api = useApi();
const today = new Date();
const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const startDate = ref(date(new Date(today.getFullYear(), today.getMonth(), 1)));
const endDate = ref(date(today));
const memberId = ref("");
const members = ref<Array<{ memberId: string; username: string }>>([]);
const rows = ref<Record<string, unknown>[]>([]);
const columns = computed<PartnerColumn[]>(() => [
  { key: "date", label: t("partnerPages.col.date"), type: "accent" },
  { key: "depAmount", label: t("partnerPages.col.depAmount"), align: "right", type: "currency" },
  { key: "widAmount", label: t("partnerPages.col.widAmount"), align: "right", type: "currency" },
  { key: "depWidProfit", label: t("partnerPages.col.depWidProfit"), align: "right", type: "profit" },
  { key: "betAmount", label: t("partnerPages.col.betAmount"), align: "right", type: "currency" },
  { key: "winAmount", label: t("partnerPages.col.winAmount"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.profit"), align: "right", type: "profit" },
  { key: "rolling", label: t("partnerPages.col.rolling"), align: "right", type: "currency" },
]);
const loadStats = async () => {
  try {
    const response = await api.validated(partnerGameStatSchema, "/partners/game-stats", {
      query: { startDate: startDate.value, endDate: endDate.value, ...(memberId.value ? { memberId: memberId.value } : {}) },
    });
    rows.value = response.map((row) => ({
      date: row.settleDate,
      depAmount: Number(row.deposits), widAmount: Number(row.withdrawals),
      depWidProfit: Number(row.netCashflow), betAmount: Number(row.betAmount),
      winAmount: Number(row.winAmount), profit: Number(row.totalProfitAmount),
      rolling: Number(row.commissionAmount),
    }));
  } catch { rows.value = []; }
};
onMounted(async () => {
  try { members.value = await api.validated(partnerMemberSelectSchema, "/partners/members/select"); } catch { members.value = []; }
  await loadStats();
});
useSeoHead();
</script>
