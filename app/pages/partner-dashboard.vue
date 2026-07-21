<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-none flex-col px-4">
        <div class="w-full pt-5 pb-14">
          <PartnerPageHeader />

          <!-- Summary tiles — dark cards with a per-metric colored icon + a
               matching sparkline (calm cards, color lives only in the icon and
               the mini-chart). Muted label, semibold value, semantic delta. -->
          <div class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-3 mb-8">
            <div v-for="tile in tiles" :key="tile.key" class="kpi-card rounded-2xl p-4 flex items-center gap-3">
              <svg class="w-7 h-7 shrink-0" :style="{ color: tile.color }" fill="none" stroke="currentColor"
                stroke-width="1.6" viewBox="0 0 24 24" aria-hidden="true">
                <path stroke-linecap="round" stroke-linejoin="round" :d="tile.icon" />
              </svg>

              <div class="flex flex-col gap-0.5 min-w-0 flex-1">
                <span class="text-white/45 text-[10px] font-semibold uppercase tracking-[0.07em] truncate">
                  {{ tile.label }}
                </span>
                <span class="text-white text-lg md:text-xl font-semibold leading-tight tabular-nums">
                  {{ fmt(tile.value) }}
                </span>
              </div>
            </div>
          </div>

          <!-- Game bet total -->
          <div class="flex items-center justify-between gap-3 mb-4">
            <div class="flex items-center gap-2.5">
              <span class="w-1 h-5 rounded-full" :style="{ background: accent, boxShadow: `0 0 10px ${accent}` }" />
              <h2 class="text-white text-sm md:text-base font-bold">{{ $t('partnerPages.gameBetTotal') }}</h2>
            </div>
            <div class="relative">
              <button type="button" class="range-pill" aria-haspopup="listbox" :aria-expanded="rangeOpen"
                @click="rangeOpen = !rangeOpen">
                <svg class="w-4 h-4 shrink-0" :style="{ color: accent }" fill="none" stroke="currentColor"
                  stroke-width="1.7" viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round"
                    d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0V11.25A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
                <span>{{ selectedRange.label }}</span>
                <svg class="w-3.5 h-3.5 shrink-0 text-white/50 transition-transform duration-200"
                  :class="rangeOpen ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.4"
                  viewBox="0 0 24 24" aria-hidden="true">
                  <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </button>

              <!-- Dropdown -->
              <template v-if="rangeOpen">
                <div class="fixed inset-0 z-40" @click="rangeOpen = false" />
                <div class="range-menu absolute right-0 top-full mt-2 z-50" role="listbox">
                  <button v-for="r in ranges" :key="r.key" type="button" class="range-item"
                    :class="r.key === selectedRangeKey ? 'is-active' : ''" role="option"
                    :aria-selected="r.key === selectedRangeKey" @click="selectRange(r.key)">
                    <span>{{ r.label }}</span>
                    <svg v-if="r.key === selectedRangeKey" class="w-4 h-4 shrink-0" :style="{ color: accent }"
                      fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24" aria-hidden="true">
                      <path stroke-linecap="round" stroke-linejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                    </svg>
                  </button>
                </div>
              </template>
            </div>
          </div>
          <PartnerTable :columns="gameColumns" :rows="gameRows" expandable>
            <template #cell-game="{ row }">
              <span class="inline-flex items-center gap-2.5">
                <span class="game-ic shrink-0">
                  <svg class="w-4 h-4" :style="{ color: accent }" fill="none" stroke="currentColor" stroke-width="1.7"
                    viewBox="0 0 24 24" aria-hidden="true">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="String(row.icon)" />
                  </svg>
                </span>
                <span class="text-white font-medium">{{ row.game }}</span>
              </span>
            </template>
            <!-- Click a game-type row to expand its per-game breakdown. -->
            <template #expanded="{ row }">
              <PartnerTable :columns="subColumns" :rows="asRows(row.games)"
                :empty-text="$t('partnerPages.gameBetTotal')" />
            </template>
          </PartnerTable>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useCurrency } from "@/composables/useCurrency";
import {
  partnerDashboardSchema,
  partnerGameSummarySchema,
  type PartnerDashboard,
  type PartnerGameSummary,
} from "@/interfaces/partner.interface";
import type { PartnerColumn } from "@/utils/partnerMenu";

definePageMeta({ layout: "default" });

const { t } = useI18n();
const currency = useCurrency();

// Deposit-modal palette mapped to partner roles (usePartnerTheme).
const { accent } = usePartnerTheme();
const fmt = (v: number) => currency.formatNumber(v);

const rangeOpen = ref(false);
const ranges = computed(() => [
  { key: "today", label: t("partnerPages.filters.today") },
  { key: "week", label: t("partnerPages.thisWeek") },
  { key: "lastWeek", label: t("partnerPages.filters.lastWeek") },
  { key: "fifteen", label: t("partnerPages.filters.fifteenDays") },
  { key: "month", label: t("partnerPages.filters.thisMonth") },
]);
const selectedRangeKey = ref("week");
const selectedRange = computed(
  () =>
    ranges.value.find((r) => r.key === selectedRangeKey.value) ??
    ranges.value[1] ?? { key: "week", label: t("partnerPages.thisWeek") },
);
const selectRange = async (key: string) => {
  selectedRangeKey.value = key;
  rangeOpen.value = false;
  await loadDashboard();
};

const formatDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;

const rangeDates = (range: string) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const start = new Date(today);

  switch (range) {
    case "today":
      break;
    case "week":
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7));
      break;
    case "lastWeek": {
      start.setDate(start.getDate() - ((start.getDay() + 6) % 7) - 7);
      const end = new Date(start);
      end.setDate(end.getDate() + 6);
      return { startDate: formatDate(start), endDate: formatDate(end) };
    }
    case "fifteen":
      start.setDate(start.getDate() - 14);
      break;
    case "month":
      start.setDate(1);
      break;
  }

  return { startDate: formatDate(start), endDate: formatDate(today) };
};

const dashboard = ref<PartnerDashboard | null>(null);
const gameSummary = ref<PartnerGameSummary>([]);

// Dark KPI tiles — a per-metric colored icon + a muted label and value (color
// lives only in the icon; the card stays dark).
const asNumber = (value: string | undefined) => Number(value ?? 0) || 0;

const tiles = computed(() => [
  { key: "dep", label: t("partnerPages.tiles.totalDeposit"), value: asNumber(dashboard.value?.deposits), color: "#34D399", icon: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" },
  { key: "wid", label: t("partnerPages.tiles.totalWithdrawal"), value: asNumber(dashboard.value?.withdrawals), color: "#F87171", icon: "M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M7.5 7.5 12 3m0 0 4.5 4.5M12 3v13.5" },
  { key: "profit", label: t("partnerPages.tiles.netProfit"), value: asNumber(dashboard.value?.netCashflow), color: "#FB923C", icon: "M2.25 18 9 11.25l4.306 4.307a11.95 11.95 0 0 1 5.814-5.519l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" },
  { key: "wallet", label: t("partnerPages.tiles.currentWallet"), value: asNumber(dashboard.value?.walletAmount), color: "#60A5FA", icon: "M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0 2.25-2.25V6.75A2.25 2.25 0 0 0 4.5 19.5Z" },
  { key: "point", label: t("partnerPages.tiles.currentPoint"), value: asNumber(dashboard.value?.pointAmount), color: "#A78BFA", icon: "M11.48 3.499a.562.562 0 0 1 1.04 0l2.125 5.111a.563.563 0 0 0 .475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 0 0-.182.557l1.285 5.385a.562.562 0 0 1-.84.61l-4.725-2.885a.562.562 0 0 0-.586 0L6.982 20.54a.562.562 0 0 1-.84-.61l1.285-5.386a.562.562 0 0 0-.182-.557l-4.204-3.602a.562.562 0 0 1 .321-.988l5.518-.442a.563.563 0 0 0 .475-.345L11.48 3.5Z" },
]);

// Columns mirror stargazer-high Dashboard.vue gameTableHeaders.
const gameColumns = computed<PartnerColumn[]>(() => [
  { key: "game", label: t("partnerPages.col.game"), type: "accent" },
  { key: "bet", label: t("partnerPages.col.totalBet"), align: "right", type: "currency" },
  { key: "win", label: t("partnerPages.col.totalWin"), align: "right", type: "currency" },
  { key: "subRolling", label: t("partnerPages.col.subRolling"), align: "right", type: "currency" },
  { key: "myRolling", label: t("partnerPages.col.myRolling"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.totalProfit"), align: "right", type: "profit" },
]);

// Sub-table columns for the per-game breakdown (same metrics; plain game name).
const subColumns = computed<PartnerColumn[]>(() => [
  { key: "game", label: t("partnerPages.col.game") },
  { key: "bet", label: t("partnerPages.col.totalBet"), align: "right", type: "currency" },
  { key: "win", label: t("partnerPages.col.totalWin"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.totalProfit"), align: "right", type: "profit" },
]);

/** Narrow a row's `games` field (unknown) to a rows array for the sub-table. */
const asRows = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v : []) as Record<string, unknown>[];

const gameIcons: Record<string, string> = {
  casino: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13.5a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Z",
  slot: "M6.75 4.5h10.5a2.25 2.25 0 0 1 2.25 2.25v10.5a2.25 2.25 0 0 1-2.25 2.25H6.75a2.25 2.25 0 0 1-2.25-2.25V6.75A2.25 2.25 0 0 1 6.75 4.5Zm2.25 4.5v6m6-6v6",
  sport: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm5.66-14.66-11.32 11.32m0-11.32 11.32 11.32",
  mini: "M3 21h18M6 21V5.25A1.25 1.25 0 0 1 7.25 4h9.5A1.25 1.25 0 0 1 18 5.25V21M9.75 8.25h.008m4.492 0h.008M9.75 12h.008m4.492 0h.008",
};

const gameRows = computed<Record<string, unknown>[]>(() =>
  gameSummary.value.map((summary) => ({
    game: summary.gameType[0].toUpperCase() + summary.gameType.slice(1),
    icon: gameIcons[summary.gameType],
    bet: asNumber(summary.betAmount),
    win: asNumber(summary.winAmount),
    subRolling: asNumber(summary.downlineCommissionAmount),
    myRolling: asNumber(summary.ownCommissionAmount),
    profit: asNumber(summary.totalProfitAmount),
    games: summary.games.map((game) => ({
      game: game.lobby ? `${game.lobby} / ${game.game}` : game.game,
      bet: asNumber(game.betAmount),
      win: asNumber(game.winAmount),
      profit: asNumber(game.netAmount),
    })),
  })),
);

const loadDashboard = async () => {
  const api = useApi();
  const query = rangeDates(selectedRangeKey.value);
  try {
    const [nextDashboard, nextSummary] = await Promise.all([
      api.validated(partnerDashboardSchema, "/partners/dashboard", { query }),
      api.validated(partnerGameSummarySchema, "/partners/dashboard/summary", { query }),
    ]);
    dashboard.value = nextDashboard;
    gameSummary.value = nextSummary;
  } catch {
    dashboard.value = null;
    gameSummary.value = [];
  }
};

onMounted(loadDashboard);

useSeoHead();
</script>

<style scoped>
/* Dark KPI card — barely-there fill, hairline border, layered soft shadow,
   gentle hover lift. The only color is the icon + sparkline (set inline). */
.kpi-card {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.25),
    0 16px 36px -26px rgba(0, 0, 0, 0.8);
  transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.25s ease, box-shadow 0.25s ease;
  will-change: transform;
}

.kpi-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.1);
  box-shadow:
    0 2px 4px 0 rgba(0, 0, 0, 0.3),
    0 24px 48px -24px rgba(0, 0, 0, 0.9);
}

/* "This Week" date-range pill on the section header. */
.range-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  height: 38px;
  padding: 0 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  cursor: pointer;
  transition: background-color 0.2s ease, border-color 0.2s ease;
}

.range-pill:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.14);
}

/* Date-range dropdown menu. */
.range-menu {
  min-width: 190px;
  padding: 6px;
  border-radius: 12px;
  background: #101013;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 50px -16px rgba(0, 0, 0, 0.85);
}

.range-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.72);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.range-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.range-item.is-active {
  color: #fff;
  background: rgba(255, 255, 255, 0.04);
}

/* Orange circular game icon in the Game column. */
.game-ic {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--pb-accent, #FF7A00) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--pb-accent, #FF7A00) 22%, transparent);
}

@media (prefers-reduced-motion: reduce) {
  .kpi-card {
    transition: none;
  }

  .kpi-card:hover {
    transform: none;
  }
}
</style>
