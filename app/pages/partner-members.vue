<template>
  <div class="flex min-h-[70vh] flex-col font-sans">
    <div class="relative flex w-full justify-center">
      <div class="relative z-10 flex w-full max-w-none flex-col px-4">
        <div class="w-full pt-5 pb-14">
          <PartnerPageHeader />

          <!-- Tabs: Member List · Online Members · Shop Transactions
               (ports stargazer-high MemberManagement.vue) -->
          <div class="flex flex-wrap gap-1.5 mb-5">
            <button v-for="tab in tabs" :key="tab.key" type="button" class="partner-tab" :class="tab.key === activeTab ? 'is-active' : ''"
              :style="tab.key === activeTab ? { background: activeGradient, color: activeText } : {}"
              @click="activeTab = tab.key">
              {{ t(tab.label) }}
            </button>
          </div>

          <!-- ===== Member List tab ===== -->
          <template v-if="activeTab === 'member'">
            <!-- Search / date-range toolbar (shared PartnerFilterBar) -->
            <PartnerFilterBar v-model:search-type="searchType" v-model:keyword="searchValue" :types="searchTypes" date>
              <template #prepend>
                <button type="button" class="add-sub-btn mr-auto" :style="{ borderColor: accent, color: accent }"
                  @click="showAddSub = true">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M19 7.5v3m0 0v3m0-3h3m-3 0h-3m-2.25-4.125a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0ZM4 19.235v-.11a6.375 6.375 0 0 1 12.75 0v.109A12.318 12.318 0 0 1 10.374 21c-2.331 0-4.512-.645-6.374-1.766Z" />
                  </svg>
                  {{ t('partnerPages.members.addSubMember') }}
                </button>
              </template>
            </PartnerFilterBar>

            <!-- Tree (left) + members list (right) -->
            <div class="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div class="xl:col-span-1">
                <MemberTree />
              </div>
              <div class="xl:col-span-2 min-w-0">
                <PartnerTable :columns="memberColumns" :rows="filteredMembers">
                  <!-- Member name → opens the detail popup -->
                  <template #cell-member="{ row }">
                    <button type="button" class="font-semibold hover:underline" :style="{ color: accent }"
                      @click="openDetail(row)">{{ row.member }}</button>
                  </template>
                  <!-- Wallet cell with refresh -->
                  <template #cell-wallet="{ row }">
                    <span class="inline-flex items-center gap-1.5 justify-end">
                      <span class="text-white/90 font-semibold tabular-nums">{{ fmt(Number(row.wallet)) }}</span>
                      <button type="button" class="icon-btn" :class="{ 'is-refreshing': refreshingWallet.has(String(row.member)) }"
                        :style="{ color: accent }" :title="t('partnerPages.members.refresh')"
                        :disabled="refreshingWallet.has(String(row.member))" @click="onRefreshWallet(row)">
                        <svg class="w-4 h-4 refresh-ic" fill="none" stroke="currentColor" stroke-width="2"
                          stroke-linecap="round" stroke-linejoin="round" viewBox="0 0 24 24">
                          <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
                          <path d="M21 3v5h-5" />
                          <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
                          <path d="M3 21v-5h5" />
                        </svg>
                      </button>
                    </span>
                  </template>
                  <!-- Settle: shop add / deduct -->
                  <template #cell-settle="{ row }">
                    <div class="flex items-center justify-center gap-1.5">
                      <button type="button" class="action-btn text-emerald-400 border-emerald-500/40" :title="t('partnerPages.modals.shopAdd')"
                        @click="openShop(row, 'ADD')">+</button>
                      <button type="button" class="action-btn text-rose-400 border-rose-500/40" :title="t('partnerPages.modals.shopDeduct')"
                        @click="openShop(row, 'DEDUCT')">−</button>
                    </div>
                  </template>
                  <!-- Slot money -->
                  <template #cell-slotMoney="{ row }">
                    <button type="button" class="chip-btn" :style="{ borderColor: accent, color: accent }"
                      @click="onSlotMoney(row)">{{ t('partnerPages.col.slotMoney') }}</button>
                  </template>
                  <!-- Point transfer -->
                  <template #cell-pointTransfer="{ row }">
                    <button type="button" class="chip-btn" :style="{ borderColor: accent, color: accent }"
                      @click="openPoint(row)">{{ t('partnerPages.modals.pointTransfer') }}</button>
                  </template>
                </PartnerTable>
              </div>
            </div>
          </template>

          <!-- ===== Online Members tab ===== -->
          <PartnerTable v-else-if="activeTab === 'online'" :columns="onlineColumns" :rows="onlineRows" />

          <!-- ===== Shop Transactions tab ===== -->
          <template v-else>
            <PartnerFilterBar searchable :placeholder="t('partnerPages.col.storeMember')"
              v-model:keyword="shopReceiver" date>
              <template #prepend>
                <select v-model="shopTypeFilter"
                  class="h-[38px] rounded-lg bg-white/[0.04] border border-white/10 text-white text-[13px] px-3 focus:outline-none [color-scheme:dark]">
                  <option value="">{{ t('partnerPages.filters.allTypes') }}</option>
                  <option value="ADD">{{ t('partnerPages.modals.add') }}</option>
                  <option value="DEDUCT">{{ t('partnerPages.modals.subtract') }}</option>
                </select>
              </template>
            </PartnerFilterBar>
            <PartnerTable :columns="shopColumns" :rows="filteredShopRows" />
          </template>
        </div>
      </div>
    </div>

    <!-- Modals (auto-imported by filename — components.pathPrefix is false) -->
    <ShopMoneyModal v-model="showShop" :receiver="receiver" :type="shopType" />
    <PointTransferModal v-model="showPoint" :receiver="receiver" type="ADD" />
    <AddSubMemberModal v-model="showAddSub" />
    <MemberDetailModal v-model="showDetail" :member="selectedMember" />
    <SlotMoneyModal v-model="showSlot" :member="slotMember" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useCurrency } from "@/composables/useCurrency";
import type { PartnerColumn } from "@/utils/partnerMenu";

definePageMeta({ layout: "default" });
const { t } = useI18n();
const currency = useCurrency();
const fmt = (v: number) => currency.formatNumber(Number(v) || 0);

// Partner palette (usePartnerTheme) for tabs + toolbar accents.
const { accent, activeGradient, activeText } = usePartnerTheme();

const tabs = [
  { key: "member", label: "partnerMenu.members" },
  { key: "online", label: "partnerMenu.onlineMembers" },
  { key: "shop", label: "partnerMenu.shopTranHistory" },
] as const;
const activeTab = ref<(typeof tabs)[number]["key"]>("member");

// --- Search toolbar (client-side filter over the mock rows) ---
const searchType = ref<string>("ID");
const searchValue = ref("");
const searchTypes = computed(() => [
  { value: "ID", label: t("partnerPages.members.searchById") },
  { value: "NICKNAME", label: t("partnerPages.members.searchByNickname") },
]);

// --- Modal state ---
type MemberRow = typeof memberRows[number];
const showShop = ref(false);
const showPoint = ref(false);
const showAddSub = ref(false);
const showDetail = ref(false);
const showSlot = ref(false);
const shopType = ref<"ADD" | "DEDUCT">("ADD");
const receiver = ref<{ id: string; username: string; wallet: number }>({ id: "", username: "", wallet: 0 });
const selectedMember = ref<MemberRow | null>(null);
const slotMember = ref<Record<string, unknown> | null>(null);

const openShop = (row: Record<string, unknown>, type: "ADD" | "DEDUCT") => {
  receiver.value = { id: String(row.member), username: String(row.member), wallet: Number(row.wallet) };
  shopType.value = type;
  showShop.value = true;
};
const openPoint = (row: Record<string, unknown>) => {
  receiver.value = { id: String(row.member), username: String(row.member), wallet: Number(row.wallet) };
  showPoint.value = true;
};
const openDetail = (row: Record<string, unknown>) => {
  selectedMember.value = row as unknown as MemberRow;
  showDetail.value = true;
};
// Wallet-refresh spinner state — keyed by member. The icon spins while the
// (dummy) refresh is in flight; replace the timeout with the real API call.
const refreshingWallet = ref<Set<string>>(new Set());
const onRefreshWallet = (row: Record<string, unknown>): void => {
  const id = String(row.member);
  if (refreshingWallet.value.has(id)) return;
  refreshingWallet.value = new Set(refreshingWallet.value).add(id);
  window.setTimeout(() => {
    const next = new Set(refreshingWallet.value);
    next.delete(id);
    refreshingWallet.value = next;
  }, 900);
};
/** Open the slot-money withdrawal modal (dummy game balance = 15% of wallet). */
const onSlotMoney = (row: Record<string, unknown>) => {
  slotMember.value = { ...row, slotBalance: Math.round((Number(row.wallet) || 0) * 0.15) };
  showSlot.value = true;
};

// Columns mirror stargazer-high MembersList.vue tableHeaders (lower count →
// level → member → dates → wallets → action columns → dep/bonus/wid → profits).
const memberColumns = computed<PartnerColumn[]>(() => [
  { key: "lowerCount", label: t("partnerPages.col.lowerCount"), align: "center", type: "number" },
  { key: "level", label: t("partnerPages.col.level"), type: "accent" },
  { key: "member", label: t("partnerPages.col.member") },
  { key: "regDate", label: t("partnerPages.col.regDate") },
  { key: "lastLogin", label: t("partnerPages.col.lastLogin") },
  { key: "wallet", label: t("partnerPages.col.wallet"), align: "right", type: "currency" },
  { key: "walletPoint", label: t("partnerPages.col.walletPoint"), align: "right", type: "currency" },
  { key: "settle", label: t("partnerPages.col.settle"), align: "center", sortable: false },
  { key: "slotMoney", label: t("partnerPages.col.slotMoney"), align: "center", sortable: false },
  { key: "pointTransfer", label: t("partnerPages.col.pointTransfer"), align: "center", sortable: false },
  { key: "depAmount", label: t("partnerPages.col.depAmount"), align: "right", type: "currency" },
  { key: "depBonus", label: t("partnerPages.col.depBonus"), align: "right", type: "currency" },
  { key: "widAmount", label: t("partnerPages.col.widAmount"), align: "right", type: "currency" },
  { key: "depWidProfit", label: t("partnerPages.col.depWidProfit"), align: "right", type: "profit" },
  { key: "winAmount", label: t("partnerPages.col.winAmount"), align: "right", type: "currency" },
  { key: "profit", label: t("partnerPages.col.profit"), align: "right", type: "profit" },
]);

const memberRows = [
  { lowerCount: 3, level: "LV.3", member: "player_win7", regDate: "2026-05-12", lastLogin: "2026-07-16 18:22", wallet: 1_240_000, walletPoint: 42_000, depAmount: 3_500_000, depBonus: 120_000, widAmount: 2_100_000, depWidProfit: 1_400_000, winAmount: 4_980_000, profit: 260_000 },
  { lowerCount: 0, level: "LV.2", member: "lucky_jin", regDate: "2026-05-20", lastLogin: "2026-07-16 14:05", wallet: 680_000, walletPoint: 12_500, depAmount: 1_800_000, depBonus: 60_000, widAmount: 1_950_000, depWidProfit: -150_000, winAmount: 3_350_000, profit: -230_000 },
  { lowerCount: 9, level: "LV.5", member: "hoyaVIP", regDate: "2026-04-02", lastLogin: "2026-07-15 23:41", wallet: 5_320_000, walletPoint: 210_000, depAmount: 9_200_000, depBonus: 320_000, widAmount: 6_400_000, depWidProfit: 2_800_000, winAmount: 8_100_000, profit: 2_800_000 },
  { lowerCount: 0, level: "LV.1", member: "newbie_kang", regDate: "2026-07-10", lastLogin: "2026-07-16 09:12", wallet: 120_000, walletPoint: 3_000, depAmount: 300_000, depBonus: 10_000, widAmount: 150_000, depWidProfit: 150_000, winAmount: 96_000, profit: 150_000 },
  { lowerCount: 2, level: "LV.4", member: "seoul_ace", regDate: "2026-03-18", lastLogin: "2026-07-14 20:33", wallet: 2_760_000, walletPoint: 88_000, depAmount: 6_100_000, depBonus: 210_000, widAmount: 5_800_000, depWidProfit: 300_000, winAmount: 5_600_000, profit: 300_000 },
  { lowerCount: 0, level: "LV.2", member: "moon_bet", regDate: "2026-06-01", lastLogin: "2026-07-16 11:58", wallet: 430_000, walletPoint: 9_400, depAmount: 1_200_000, depBonus: 40_000, widAmount: 1_300_000, depWidProfit: -100_000, winAmount: 1_100_000, profit: -100_000 },
  { lowerCount: 0, level: "LV.3", member: "star_777", regDate: "2026-05-28", lastLogin: "2026-07-13 16:02", wallet: 990_000, walletPoint: 31_500, depAmount: 2_700_000, depBonus: 90_000, widAmount: 1_600_000, depWidProfit: 1_100_000, winAmount: 2_400_000, profit: 1_100_000 },
  { lowerCount: 0, level: "LV.1", member: "daebak_lee", regDate: "2026-07-05", lastLogin: "2026-07-16 08:47", wallet: 210_000, walletPoint: 5_600, depAmount: 500_000, depBonus: 20_000, widAmount: 300_000, depWidProfit: 200_000, winAmount: 380_000, profit: 200_000 },
];

const filteredMembers = computed(() => {
  const q = searchValue.value.trim().toLowerCase();
  if (!q) return memberRows;
  return memberRows.filter((r) => String(r.member).toLowerCase().includes(q));
});

// --- Online Members tab (stargazer OnlineMembers.vue) ---
const onlineColumns = computed<PartnerColumn[]>(() => [
  { key: "member", label: t("partnerPages.col.member"), type: "accent" },
  { key: "nickname", label: t("partnerPages.col.nickname") },
  { key: "level", label: t("partnerPages.col.level") },
  { key: "regDate", label: t("partnerPages.col.regDate") },
  { key: "wallet", label: t("partnerPages.col.wallet"), align: "right", type: "currency" },
  { key: "walletPoint", label: t("partnerPages.col.walletPoint"), align: "right", type: "currency" },
  { key: "ip", label: t("partnerPages.members.ip") },
]);
const onlineRows = [
  { member: "player_win7", nickname: "위너세븐", level: "LV.3", regDate: "2026-05-12", wallet: 1_240_000, walletPoint: 42_000, ip: "175.223.10.42" },
  { member: "hoyaVIP", nickname: "호야", level: "LV.5", regDate: "2026-04-02", wallet: 5_320_000, walletPoint: 210_000, ip: "121.190.4.11" },
  { member: "star_777", nickname: "스타", level: "LV.3", regDate: "2026-05-28", wallet: 990_000, walletPoint: 31_500, ip: "58.140.22.87" },
];

// --- Shop Transactions tab (stargazer ShopTransactions.vue) ---
const shopColumns = computed<PartnerColumn[]>(() => [
  { key: "receiver", label: t("partnerPages.col.storeMember"), type: "accent" },
  { key: "type", label: t("partnerPages.col.tranType"), align: "center", type: "status" },
  { key: "amount", label: t("partnerPages.col.betAmount"), align: "right", type: "currency" },
  { key: "date", label: t("partnerPages.col.date") },
]);
const shopRows = [
  { receiver: "seoul_ace", type: "ADD", amount: 500_000, date: "2026-07-17 15:20" },
  { receiver: "lucky_jin", type: "DEDUCT", amount: 200_000, date: "2026-07-16 22:41" },
  { receiver: "player_win7", type: "ADD", amount: 1_000_000, date: "2026-07-16 10:05" },
];

// Shop tab toolbar (type + receiver keyword) — filters the rows client-side.
const shopReceiver = ref("");
const shopTypeFilter = ref("");
const filteredShopRows = computed(() => {
  const q = shopReceiver.value.trim().toLowerCase();
  return shopRows.filter(
    (r) =>
      (!shopTypeFilter.value || r.type === shopTypeFilter.value) &&
      (!q || String(r.receiver).toLowerCase().includes(q)),
  );
});

useSeoHead();
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

.toolbar-btn,
.add-sub-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 40px;
  padding: 0 16px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 0.2s ease, filter 0.2s ease, transform 0.2s ease;
}

/* Primary — soft branded shadow + brighten on hover. */
.toolbar-btn {
  box-shadow: 0 8px 20px -12px rgba(0, 0, 0, 0.7);
}

.toolbar-btn:hover {
  filter: brightness(1.05);
}

/* Secondary/outline — clean border + subtle wash on hover. */
.add-sub-btn {
  background: transparent;
  border: 1px solid;
}

.add-sub-btn:hover {
  background: rgba(255, 255, 255, 0.05);
}

.toolbar-btn:active,
.add-sub-btn:active {
  transform: translateY(1px);
}

.action-btn {
  width: 26px;
  height: 26px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  border: 1px solid;
  font-size: 13px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.chip-btn {
  height: 26px;
  padding: 0 10px;
  border-radius: 7px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.chip-btn:hover {
  background: rgba(255, 255, 255, 0.06);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0.75;
  transition: opacity 0.15s ease;
}

.icon-btn:hover {
  opacity: 1;
}

.icon-btn.is-refreshing {
  opacity: 1;
  cursor: default;
}

/* Spin the refresh glyph while a wallet refresh is in flight. */
.icon-btn.is-refreshing .refresh-ic {
  animation: icon-spin 0.9s linear infinite;
}

@keyframes icon-spin {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: reduce) {
  .icon-btn.is-refreshing .refresh-ic {
    animation-duration: 1.8s;
  }
}
</style>
