<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-none flex-col px-4">
        <div class="w-full pt-5 pb-14">
          <PartnerPageHeader />
          <PartnerFilterBar v-model:search-type="searchType" v-model:keyword="keyword"
            v-model:start="startDate" v-model:end="endDate" :types="searchTypes" date @search="load(1)" />
          <div class="seg-tabs grid grid-cols-4 mb-5">
            <button v-for="filter in filters" :key="filter.key" type="button" class="seg-tab"
              :class="active === filter.key ? 'is-active' : ''" @click="selectType(filter.key)">
              {{ filter.label }}
            </button>
          </div>
          <PartnerTable :columns="columns" :rows="rows" />
          <PartnerPagination v-model:page="page" :total-pages="meta.totalPages" @update:page="load" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { partnerBetHistorySchema } from "@/interfaces/partner.interface";
import type { PartnerColumn } from "@/utils/partnerMenu";

definePageMeta({ layout: "default" });
const { t } = useI18n();
const api = useApi();
const LIMIT = 10;
const today = new Date();
const date = (value: Date) =>
  `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;

const active = ref<"casino" | "slot" | "sport" | "mini">("casino");
const page = ref(1);
const meta = ref({ total: 0, page: 1, limit: LIMIT, totalPages: 0 });
const rows = ref<Record<string, unknown>[]>([]);
const keyword = ref("");
const searchType = ref("username");
const startDate = ref(date(new Date(today.getFullYear(), today.getMonth(), 1)));
const endDate = ref(date(today));

const filters = computed(() => [
  { key: "casino" as const, label: t("partnerPages.filters.casino") },
  { key: "slot" as const, label: t("partnerPages.filters.slot") },
  { key: "sport" as const, label: t("partnerPages.filters.sport") },
  { key: "mini" as const, label: "Mini" },
]);
const searchTypes = computed(() => [
  { value: "username", label: t("partnerPages.members.searchById") },
  { value: "name", label: t("partnerPages.members.searchByNickname") },
]);
const columns = computed<PartnerColumn[]>(() => [
  { key: "member", label: t("partnerPages.col.member"), type: "accent" },
  { key: "game", label: t("partnerPages.col.game") },
  { key: "round", label: t("partnerPages.col.round"), align: "center" },
  { key: "status", label: t("partnerPages.col.status"), align: "center", type: "status" },
  { key: "betAmount", label: t("partnerPages.col.betAmount"), align: "right", type: "currency" },
  { key: "winAmount", label: t("partnerPages.col.winAmount"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.profit"), align: "right", type: "profit" },
  { key: "amountBefore", label: t("partnerPages.col.amountBefore"), align: "right", type: "currency" },
  { key: "amountAfter", label: t("partnerPages.col.amountAfter"), align: "right", type: "currency" },
  { key: "betDate", label: t("partnerPages.col.betDate") },
  { key: "resultDate", label: t("partnerPages.col.resultDate") },
]);

const load = async (nextPage = page.value) => {
  try {
    const response = await api.validated(partnerBetHistorySchema, "/partners/bet-histories", {
      query: {
        page: nextPage,
        limit: LIMIT,
        startDate: startDate.value,
        endDate: endDate.value,
        gameType: active.value,
        ...(keyword.value.trim() ? { username: keyword.value.trim() } : {}),
      },
    });
    rows.value = response.data.map((row) => ({
      member: row.username,
      game: `${row.provider} / ${row.game}`,
      round: row.roomOrder,
      status: row.betResult,
      betAmount: Number(row.betAmount),
      winAmount: Number(row.winAmount),
      profit: Number(row.netAmount),
      amountBefore: Number(row.walletBeforeAmount),
      amountAfter: Number(row.walletAfterAmount),
      betDate: row.createdAt,
      resultDate: row.updatedAt,
    }));
    meta.value = response.meta;
    page.value = response.meta.page;
  } catch {
    rows.value = [];
    meta.value = { total: 0, page: 1, limit: LIMIT, totalPages: 0 };
  }
};
const selectType = (type: "casino" | "slot" | "sport" | "mini") => {
  active.value = type;
  void load(1);
};

onMounted(() => void load(1));
useSeoHead();
</script>

<style scoped>
.seg-tabs { border-bottom: 1px solid rgba(255, 255, 255, 0.08); }
.seg-tab { height: 46px; color: rgba(255, 255, 255, 0.5); cursor: pointer; font-size: 13px; font-weight: 700; }
.seg-tab.is-active { color: var(--pb-accent, #ff7a00); border-bottom: 2px solid var(--pb-accent, #ff7a00); }
</style>
