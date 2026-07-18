<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-none flex-col px-4">
        <div class="w-full pt-5 pb-14">
          <PartnerPageHeader />

          <!-- Search / date-range toolbar -->
          <PartnerFilterBar v-model:search-type="searchType" v-model:keyword="keyword" :types="searchTypes" date />

          <!-- Game-type filters — full-width underline tabs (equal widths). -->
          <div class="seg-tabs grid grid-cols-5 mb-5">
            <button v-for="f in filters" :key="f.key" type="button" class="seg-tab"
              :class="active === f.key ? 'is-active' : ''" @click="active = f.key">
              <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" stroke-width="1.7" viewBox="0 0 24 24"
                aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" :d="f.icon" />
              </svg>
              <span class="truncate">{{ f.label }}</span>
            </button>
          </div>

          <PartnerTable :columns="columns" :rows="filteredRows" />
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

const active = ref("all");
const filters = computed(() => [
  { key: "all", label: t("partnerPages.filters.all"), icon: "M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25a2.25 2.25 0 0 1-2.25-2.25v-2.25Z" },
  { key: "Casino", label: t("partnerPages.filters.casino"), icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z" },
  { key: "Slot", label: t("partnerPages.filters.slot"), icon: "M6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 6.75 4.5Zm2.25 4.5v6m6-6v6" },
  { key: "Sport", label: t("partnerPages.filters.sport"), icon: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm5.66-14.66-11.32 11.32m0-11.32 11.32 11.32" },
  { key: "Hotel", label: t("partnerPages.filters.hotel"), icon: "M3 21h18M6 21V5.25A1.25 1.25 0 0 1 7.25 4h9.5A1.25 1.25 0 0 1 18 5.25V21M9.75 8.25h.008m4.492 0h.008M9.75 12h.008m4.492 0h.008" },
]);

// Search toolbar (ID / Nickname + keyword) — filters the rows by member.
const searchType = ref<string>("ID");
const keyword = ref("");
const searchTypes = computed(() => [
  { value: "ID", label: t("partnerPages.members.searchById") },
  { value: "NICKNAME", label: t("partnerPages.members.searchByNickname") },
]);

// Columns mirror stargazer-high GameBetHistory.vue tableHeaders.
// `type` stays in the row data only (drives the filter above), not a column.
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

const rows = [
  { member: "player_win7", type: "Casino", game: "Baccarat", round: "R-10482", status: "WIN", betAmount: 250_000, winAmount: 480_000, profit: 230_000, amountBefore: 1_010_000, amountAfter: 1_240_000, betDate: "2026-07-16 18:20", resultDate: "2026-07-16 18:21" },
  { member: "lucky_jin", type: "Slot", game: "Sweet Bonanza", round: "R-10481", status: "LOSE", betAmount: 120_000, winAmount: 40_000, profit: -80_000, amountBefore: 760_000, amountAfter: 680_000, betDate: "2026-07-16 17:55", resultDate: "2026-07-16 17:55" },
  { member: "hoyaVIP", type: "Sport", game: "Football / Live", round: "R-10480", status: "WIN", betAmount: 500_000, winAmount: 950_000, profit: 450_000, amountBefore: 4_870_000, amountAfter: 5_320_000, betDate: "2026-07-16 16:40", resultDate: "2026-07-16 22:10" },
  { member: "seoul_ace", type: "Casino", game: "Roulette", round: "R-10479", status: "LOSE", betAmount: 180_000, winAmount: 120_000, profit: -60_000, amountBefore: 2_820_000, amountAfter: 2_760_000, betDate: "2026-07-16 15:12", resultDate: "2026-07-16 15:13" },
  { member: "star_777", type: "Slot", game: "Gates of Olympus", round: "R-10478", status: "WIN", betAmount: 90_000, winAmount: 310_000, profit: 220_000, amountBefore: 770_000, amountAfter: 990_000, betDate: "2026-07-16 14:03", resultDate: "2026-07-16 14:03" },
  { member: "moon_bet", type: "Hotel", game: "Hold'em", round: "R-10477", status: "LOSE", betAmount: 60_000, winAmount: 45_000, profit: -15_000, amountBefore: 445_000, amountAfter: 430_000, betDate: "2026-07-16 12:47", resultDate: "2026-07-16 12:52" },
  { member: "daebak_lee", type: "Sport", game: "Basketball", round: "R-10476", status: "WIN", betAmount: 140_000, winAmount: 260_000, profit: 120_000, amountBefore: 90_000, amountAfter: 210_000, betDate: "2026-07-16 11:20", resultDate: "2026-07-16 13:40" },
  { member: "newbie_kang", type: "Casino", game: "Dragon Tiger", round: "R-10475", status: "LOSE", betAmount: 30_000, winAmount: 0, profit: -30_000, amountBefore: 150_000, amountAfter: 120_000, betDate: "2026-07-16 09:05", resultDate: "2026-07-16 09:05" },
];

const filteredRows = computed(() => {
  const q = keyword.value.trim().toLowerCase();
  return rows.filter(
    (r) =>
      (active.value === "all" || r.type === active.value) &&
      (!q || String(r.member).toLowerCase().includes(q)),
  );
});

useSeoHead();
</script>

<style scoped>
/* Full-width underline tabs — equal widths sharing a baseline hairline. */
.seg-tabs {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.seg-tab {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 46px;
  padding: 0 8px;
  font-size: 13px;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition: color 0.2s ease;
}

.seg-tab:not(.is-active):hover {
  color: rgba(255, 255, 255, 0.85);
}

/* Active — orange icon/label + a glowing orange bottom border on the baseline. */
.seg-tab.is-active {
  color: var(--pb-accent, #ff7a00);
}

.seg-tab.is-active::after {
  content: "";
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: -1px;
  height: 2px;
  border-radius: 2px 2px 0 0;
  background: var(--pb-accent, #ff7a00);
  box-shadow: 0 0 10px 0 var(--pb-accent, #ff7a00);
}

@media (max-width: 640px) {
  .seg-tab {
    font-size: 11px;
    gap: 5px;
    padding: 0 4px;
  }
}
</style>
