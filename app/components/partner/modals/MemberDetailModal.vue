<template>
  <PartnerModal :model-value="modelValue" :title="t('partnerPages.modals.memberDetail')" width="lg"
    @update:model-value="$emit('update:modelValue', $event)">
    <div v-if="member" class="flex flex-col gap-5">
      <!-- ===== Summary header (mirrors stargazer-high SummaryProfile) ===== -->
      <div class="rounded-xl p-4"
        :style="{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-11 h-11 rounded-full flex items-center justify-center text-black font-extrabold text-lg shrink-0"
            :style="{ background: activeGradient }">
            {{ member.member.charAt(0).toUpperCase() }}
          </div>
          <div class="flex flex-col min-w-0">
            <span class="text-white font-bold text-[15px] truncate">
              [{{ member.level }}] {{ member.member }}
              <span class="text-white/45 font-medium">/ {{ detail.nickname }}</span>
            </span>
            <span class="text-white/45 text-xs">{{ statusLabel }}</span>
          </div>
        </div>

        <!-- Stat grid -->
        <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-x-4 gap-y-3">
          <Stat :label="t('partnerPages.modals.state')" :value="statusLabel" />
          <Stat :label="t('partnerPages.modals.rate')" :value="member.level" />
          <Stat :label="t('partnerPages.modals.difference')" :value="member.lowerCount ?? 0" />
          <Stat :label="t('partnerPages.modals.money')" :value="fmt(member.wallet)" />
          <Stat :label="t('partnerPages.col.walletPoint')" :value="fmt(member.walletPoint)" />
          <Stat :label="t('partnerPages.modals.totalDeposit')" :value="fmt(member.depAmount)" />
          <Stat :label="t('partnerPages.modals.totalWithdraw')" :value="fmt(member.widAmount)" />
          <Stat :label="t('partnerPages.modals.totalDepWid')" :value="fmt(member.depWidProfit)" />
          <Stat :label="t('partnerPages.modals.name')" :value="detail.nickname" />
          <Stat :label="t('partnerPages.modals.telNo')" :value="detail.telno" />
        </div>
      </div>

      <!-- ===== Tabs ===== -->
      <div class="flex flex-wrap gap-1.5">
        <button v-for="tab in tabs" :key="tab.key" type="button" class="detail-tab"
          :class="tab.key === activeTab ? 'is-active' : ''"
          :style="tab.key === activeTab ? { background: activeGradient, color: activeText } : {}"
          @click="activeTab = tab.key">
          {{ t(tab.label) }}
        </button>
      </div>

      <!-- ===== Details: dep/wid summary + game bet total ===== -->
      <div v-if="activeTab === 'details'" class="flex flex-col gap-5">
        <div class="flex justify-end">
          <PartnerDateRange v-model:start="rangeStart" v-model:end="rangeEnd" />
        </div>
        <section>
          <h4 class="section-title">{{ t('partnerPages.modals.depWidSummary') }}</h4>
          <PartnerTable :columns="summaryColumns" :rows="summaryRows" />
        </section>
        <section>
          <h4 class="section-title">{{ t('partnerPages.gameBetTotal') }}</h4>
          <PartnerTable :columns="gameColumns" :rows="gameRows" expandable>
            <template #cell-game="{ row }">
              <span class="text-white font-medium">{{ row.game }}</span>
            </template>
            <template #expanded="{ row }">
              <PartnerTable :columns="gameColumns" :rows="asRows(row.games)" />
            </template>
          </PartnerTable>
        </section>
      </div>

      <!-- ===== Bet History: game sub-tabs ===== -->
      <div v-else-if="activeTab === 'bet'" class="flex flex-col gap-4">
        <div class="flex flex-wrap items-center gap-2">
          <div class="flex flex-wrap gap-1.5">
            <button v-for="g in betGames" :key="g.key" type="button" class="sub-tab"
              :class="g.key === betGame ? 'is-active' : ''"
              :style="g.key === betGame ? { borderColor: accent, color: accent } : {}"
              @click="betGame = g.key">
              {{ t(g.label) }}
            </button>
          </div>
          <div class="ml-auto">
            <PartnerDateRange v-model:start="rangeStart" v-model:end="rangeEnd" />
          </div>
        </div>
        <PartnerTable :columns="betColumns" :rows="betRowsFor(betGame)"
          :empty-text="t('partnerPages.modals.noData')" />
      </div>

      <!-- ===== Rate settings table ===== -->
      <div v-else-if="activeTab === 'rate'" class="flex flex-col gap-4">
        <PartnerTable :columns="rateColumns" :rows="rateRows">
          <template #cell-points="{ row }">
            <span>{{ Number(row.pointType) === 1 ? t('partnerPages.modals.single') : t('partnerPages.modals.multi') }}</span>
          </template>
          <template #cell-typeRolling="{ row }">
            <span>{{ row.typeRolling }}</span>
          </template>
          <template #cell-rolling="{ row }">
            <input v-model.number="row.rolling" type="number" min="0" max="100" step="0.1"
              class="rate-input" @click.stop>
          </template>
        </PartnerTable>
        <button type="button" class="pm-submit self-end" :style="{ background: activeGradient, color: activeText }">
          {{ t('partnerPages.modals.changeRate') }}
        </button>
      </div>

      <!-- ===== Coupons table ===== -->
      <PartnerTable v-else-if="activeTab === 'coupon'" :columns="couponColumns" :rows="couponRows"
        :empty-text="t('partnerPages.modals.noData')" />

      <!-- ===== Transactions (dep/wid history) ===== -->
      <PartnerTable v-else :columns="tranColumns" :rows="tranRows"
        :empty-text="t('partnerPages.modals.noData')" />
    </div>
  </PartnerModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import { useCurrency } from "@/composables/useCurrency";
import type { PartnerColumn } from "@/utils/partnerMenu";
import type { PartnerMemberRow } from "@/interfaces/partner.interface";

const props = defineProps<{ modelValue: boolean; member: PartnerMemberRow | null }>();
defineEmits<{ "update:modelValue": [boolean] }>();

const { t } = useI18n();
const { accent, activeGradient, activeText } = usePartnerTheme();
const currency = useCurrency();
const fmt = (v: number) => currency.formatNumber(Number(v) || 0);

/** Narrow an unknown `games` field to a rows array for the sub-table. */
const asRows = (v: unknown): Record<string, unknown>[] =>
  (Array.isArray(v) ? v : []) as Record<string, unknown>[];

// Tabs mirror stargazer-high SpecificMemberPopup order.
const tabs = [
  { key: "details", label: "partnerPages.modals.details" },
  { key: "bet", label: "partnerPages.modals.betHistory" },
  { key: "rate", label: "partnerPages.modals.rateSettings" },
  { key: "coupon", label: "partnerPages.modals.coupons" },
  { key: "tran", label: "partnerPages.modals.transactions" },
] as const;
const activeTab = ref<(typeof tabs)[number]["key"]>("details");

// Reset to the first tab whenever a different member is opened.
watch(() => props.modelValue, (open) => { if (open) { activeTab.value = "details"; betGame.value = "casino"; } });

const statusLabel = computed(() => t("partnerPages.status.normal"));

// Date range for the Details / Bet History tabs (dummy — default this month).
const now = new Date();
const isoLocal = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const rangeStart = ref(isoLocal(new Date(now.getFullYear(), now.getMonth(), 1)));
const rangeEnd = ref(isoLocal(now));

// Dummy detail fields synthesized from the row (replace with member/info API).
const detail = reactive({
  nickname: "—",
  telno: "010-****-****",
});

// --- Details: dep/wid summary (single row, mirrors Details.vue top table) ---
const summaryColumns = computed<PartnerColumn[]>(() => [
  { key: "depAmount", label: t("partnerPages.col.depAmount"), align: "right", type: "currency" },
  { key: "widAmount", label: t("partnerPages.col.widAmount"), align: "right", type: "currency" },
  { key: "depWidProfit", label: t("partnerPages.col.depWidProfit"), align: "right", type: "profit" },
  { key: "currentWallet", label: t("partnerPages.col.currentWallet"), align: "right", type: "currency" },
  { key: "currentPoint", label: t("partnerPages.col.currentPoint"), align: "right", type: "currency" },
]);
const summaryRows = computed(() => [{
  depAmount: props.member?.depAmount ?? 0,
  widAmount: props.member?.widAmount ?? 0,
  depWidProfit: props.member?.depWidProfit ?? 0,
  currentWallet: props.member?.wallet ?? 0,
  currentPoint: props.member?.walletPoint ?? 0,
}]);

// --- Details: game bet total (expandable, mirrors Details.vue game table) ---
const gameColumns = computed<PartnerColumn[]>(() => [
  { key: "game", label: t("partnerPages.col.game"), type: "accent" },
  { key: "bet", label: t("partnerPages.col.totalBet"), align: "right", type: "currency" },
  { key: "win", label: t("partnerPages.col.totalWin"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.totalProfit"), align: "right", type: "profit" },
  { key: "subRolling", label: t("partnerPages.col.subRolling"), align: "right", type: "currency" },
  { key: "myRolling", label: t("partnerPages.col.myRolling"), align: "right", type: "currency" },
]);
const gameRows = [
  {
    game: "Casino", bet: 5_240_000, win: 4_980_000, profit: 260_000, subRolling: 52_400, myRolling: 26_200,
    games: [
      { game: "Baccarat", bet: 2_800_000, win: 2_650_000, profit: 150_000, subRolling: 28_000, myRolling: 14_000 },
      { game: "Roulette", bet: 1_500_000, win: 1_480_000, profit: 60_000, subRolling: 15_000, myRolling: 7_500 },
    ],
  },
  {
    game: "Slot", bet: 3_120_000, win: 3_350_000, profit: -230_000, subRolling: 31_200, myRolling: 15_600,
    games: [
      { game: "Sweet Bonanza", bet: 1_400_000, win: 1_520_000, profit: -120_000, subRolling: 14_000, myRolling: 7_000 },
      { game: "Gates of Olympus", bet: 1_120_000, win: 1_180_000, profit: -60_000, subRolling: 11_200, myRolling: 5_600 },
    ],
  },
];

// --- Bet history: per-game sub-tabs (mirrors BetHistory.vue) ---
const betGames = [
  { key: "casino", label: "partnerPages.filters.casino" },
  { key: "slot", label: "partnerPages.filters.slot" },
  { key: "hotel", label: "partnerPages.filters.hotel" },
  { key: "sport", label: "partnerPages.filters.sport" },
] as const;
const betGame = ref<(typeof betGames)[number]["key"]>("casino");

const betColumns = computed<PartnerColumn[]>(() => [
  { key: "date", label: t("partnerPages.col.date") },
  { key: "game", label: t("partnerPages.col.game"), type: "accent" },
  { key: "bet", label: t("partnerPages.col.betAmount"), align: "right", type: "currency" },
  { key: "win", label: t("partnerPages.col.winAmount"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.profit"), align: "right", type: "profit" },
]);
const betData: Record<string, Record<string, unknown>[]> = {
  casino: [
    { date: "2026-07-16", game: "Baccarat", bet: 400_000, win: 380_000, profit: -20_000 },
    { date: "2026-07-15", game: "Roulette", bet: 250_000, win: 310_000, profit: 60_000 },
  ],
  slot: [
    { date: "2026-07-16", game: "Sweet Bonanza", bet: 180_000, win: 220_000, profit: 40_000 },
    { date: "2026-07-14", game: "Gates of Olympus", bet: 120_000, win: 96_000, profit: -24_000 },
  ],
  hotel: [
    { date: "2026-07-13", game: "Hold'em", bet: 90_000, win: 84_000, profit: -6_000 },
  ],
  sport: [
    { date: "2026-07-12", game: "Football", bet: 150_000, win: 210_000, profit: 60_000 },
  ],
};
const betRowsFor = (key: string) => betData[key] ?? [];

// --- Rate settings (mirrors RateSettings.vue: Casino/Slot/Hotel rows) ---
const rateColumns = computed<PartnerColumn[]>(() => [
  { key: "game", label: t("partnerPages.col.game"), sortable: false },
  { key: "points", label: t("partnerPages.modals.points"), align: "center", sortable: false },
  { key: "typeRolling", label: t("partnerPages.modals.typeRolling"), align: "center", sortable: false },
  { key: "rolling", label: t("partnerPages.col.rolling"), align: "center", sortable: false },
]);
const rateRows = reactive([
  { game: "Casino", pointType: 1, typeRolling: "0.8%", rolling: 0.8 },
  { game: "Slot", pointType: 2, typeRolling: "1.2%", rolling: 1.2 },
  { game: "Hotel", pointType: 3, typeRolling: "0.5%", rolling: 0.5 },
]);

// --- Coupons (mirrors Coupons.vue) ---
const couponColumns = computed<PartnerColumn[]>(() => [
  { key: "couponName", label: t("partnerPages.modals.couponName") },
  { key: "amount", label: t("partnerPages.amount"), align: "right", type: "currency" },
  { key: "expiration", label: t("partnerPages.modals.expiration") },
  { key: "usedDate", label: t("partnerPages.modals.usedDate") },
  { key: "howToUse", label: t("partnerPages.modals.howToUse") },
  { key: "status", label: t("partnerPages.col.status"), align: "center", type: "status" },
]);
const couponRows = [
  { couponName: "Welcome Bonus", amount: 50_000, expiration: "2026-08-01", usedDate: "—", howToUse: "Auto", status: "AVAILABLE" },
  { couponName: "Weekend Cashback", amount: 30_000, expiration: "2026-07-20", usedDate: "2026-07-14", howToUse: "Manual", status: "USED" },
];

// --- Transactions: dep/wid history (mirrors DepWidHistory.vue) ---
const tranColumns = computed<PartnerColumn[]>(() => [
  { key: "member", label: t("partnerPages.col.member") },
  { key: "type", label: t("partnerPages.col.depWid"), align: "center", type: "status" },
  { key: "amount", label: t("partnerPages.amount"), align: "right", type: "currency" },
  { key: "reqDate", label: t("partnerPages.col.reqDate") },
  { key: "processDate", label: t("partnerPages.col.processDate") },
]);
const tranRows = computed(() => [
  { member: props.member?.member ?? "—", type: "DEPOSIT", amount: 500_000, reqDate: "2026-07-16 12:04", processDate: "2026-07-16 12:06" },
  { member: props.member?.member ?? "—", type: "WITHDRAWAL", amount: 300_000, reqDate: "2026-07-14 19:22", processDate: "2026-07-14 19:40" },
]);
</script>

<style scoped>
.detail-tab {
  font-size: 12px;
  font-weight: 700;
  padding: 7px 14px;
  border-radius: 10px;
  color: rgba(255, 255, 255, 0.6);
  transition: background-color 0.15s ease, color 0.15s ease;
  cursor: pointer;
}

.detail-tab:not(.is-active):hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.section-title {
  color: rgba(255, 255, 255, 0.9);
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 10px;
}

.sub-tab {
  font-size: 12px;
  font-weight: 700;
  padding: 5px 14px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: rgba(255, 255, 255, 0.6);
  transition: border-color 0.15s ease, color 0.15s ease;
  cursor: pointer;
}

.sub-tab:not(.is-active):hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.25);
}

.rate-input {
  width: 6.5em;
  height: 34px;
  text-align: center;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
}

.rate-input:focus {
  outline: none;
  border-color: var(--pb-accent, #ff7a00);
}
</style>
