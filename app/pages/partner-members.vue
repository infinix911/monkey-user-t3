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
            <PartnerFilterBar v-model:search-type="searchType" v-model:keyword="searchValue"
              v-model:start="memberStart" v-model:end="memberEnd" :types="searchTypes" date @search="loadMembers(1)">
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
                <PartnerTable :columns="memberColumns" :rows="memberRows">
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
                  <!-- Point transfer -->
                  <template #cell-pointTransfer="{ row }">
                    <button type="button" class="chip-btn" :style="{ borderColor: accent, color: accent }"
                      @click="openPoint(row)">{{ t('partnerPages.modals.pointTransfer') }}</button>
                  </template>
                </PartnerTable>
                <PartnerPagination v-model:page="memberPage" :total-pages="memberMeta.totalPages" @update:page="loadMembers" />
              </div>
            </div>
          </template>

          <!-- ===== Online Members tab ===== -->
          <template v-else-if="activeTab === 'online'">
            <PartnerTable :columns="onlineColumns" :rows="onlineRows" />
            <PartnerPagination v-model:page="onlinePage" :total-pages="onlineMeta.totalPages" @update:page="loadOnline" />
          </template>

          <!-- ===== Shop Transactions tab ===== -->
          <template v-else>
            <PartnerFilterBar searchable :placeholder="t('partnerPages.col.storeMember')"
              v-model:keyword="shopReceiver" v-model:start="shopStart" v-model:end="shopEnd" date @search="loadShopTransfers(1)">
              <template #prepend>
                <select v-model="shopTypeFilter"
                  class="h-[38px] rounded-lg bg-white/[0.04] border border-white/10 text-white text-[13px] px-3 focus:outline-none [color-scheme:dark]">
                  <option value="">{{ t('partnerPages.filters.allTypes') }}</option>
                  <option value="add">{{ t('partnerPages.modals.add') }}</option>
                  <option value="deduct">{{ t('partnerPages.modals.subtract') }}</option>
                </select>
              </template>
            </PartnerFilterBar>
            <PartnerTable :columns="shopColumns" :rows="shopRows" />
            <PartnerPagination v-model:page="shopPage" :total-pages="shopMeta.totalPages" @update:page="loadShopTransfers" />
          </template>
        </div>
      </div>
    </div>

    <!-- Modals (auto-imported by filename — components.pathPrefix is false) -->
    <ShopMoneyModal v-model="showShop" :receiver="receiver" :type="shopType" @submit="createShopTransfer" />
    <PointTransferModal v-model="showPoint" :receiver="receiver" type="ADD" @submit="createPointTransfer" />
    <AddSubMemberModal v-model="showAddSub" @submit="createMember" />
    <MemberDetailModal v-model="showDetail" :member="selectedMember" />
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useApi } from "@/composables/useApi";
import { useCurrency } from "@/composables/useCurrency";
import { useToast } from "@/composables/useToast";
import type { PartnerColumn } from "@/utils/partnerMenu";
import type { PartnerMemberRow } from "@/interfaces/partner.interface";

definePageMeta({ layout: "default" });
const { t } = useI18n();
const { accent, activeGradient, activeText } = usePartnerTheme();
const { error, success } = useToast();
const currency = useCurrency();
const fmt = (v: number) => currency.formatNumber(Number(v) || 0);
const api = useApi();
const LIMIT = 10;
const meta = () => ({ total: 0, page: 1, limit: LIMIT, totalPages: 0 });
const date = (value: Date) => `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`;
const today = new Date();
const monthStart = date(new Date(today.getFullYear(), today.getMonth(), 1));

type PageResult<T> = { data: T[]; meta: { total: number; page: number; limit: number; totalPages: number } };
const tabs = [{ key: "member", label: "partnerMenu.members" }, { key: "online", label: "partnerMenu.onlineMembers" }, { key: "shop", label: "partnerMenu.shopTranHistory" }] as const;
const activeTab = ref<(typeof tabs)[number]["key"]>("member");
const searchType = ref("username");
const searchValue = ref("");
const memberStart = ref(monthStart);
const memberEnd = ref(date(today));
const searchTypes = computed(() => [{ value: "username", label: t("partnerPages.members.searchById") }, { value: "name", label: t("partnerPages.members.searchByNickname") }]);
const memberRows = ref<PartnerMemberRow[]>([]);
const memberMeta = ref(meta());
const memberPage = ref(1);
const onlineRows = ref<Record<string, unknown>[]>([]);
const onlineMeta = ref(meta());
const onlinePage = ref(1);
const shopRows = ref<Record<string, unknown>[]>([]);
const shopMeta = ref(meta());
const shopPage = ref(1);
const shopReceiver = ref("");
const shopTypeFilter = ref<"" | "add" | "deduct">("");
const shopStart = ref(monthStart);
const shopEnd = ref(date(today));

const memberColumns = computed<PartnerColumn[]>(() => [
  { key: "lowerCount", label: t("partnerPages.col.lowerCount"), align: "center", type: "number" }, { key: "level", label: t("partnerPages.col.level"), type: "accent" }, { key: "member", label: t("partnerPages.col.member") }, { key: "regDate", label: t("partnerPages.col.regDate") }, { key: "lastLogin", label: t("partnerPages.col.lastLogin") }, { key: "wallet", label: t("partnerPages.col.wallet"), align: "right", type: "currency" }, { key: "walletPoint", label: t("partnerPages.col.walletPoint"), align: "right", type: "currency" }, { key: "settle", label: t("partnerPages.col.settle"), align: "center", sortable: false }, { key: "pointTransfer", label: t("partnerPages.col.pointTransfer"), align: "center", sortable: false }, { key: "depAmount", label: t("partnerPages.col.depAmount"), align: "right", type: "currency" }, { key: "widAmount", label: t("partnerPages.col.widAmount"), align: "right", type: "currency" }, { key: "depWidProfit", label: t("partnerPages.col.depWidProfit"), align: "right", type: "profit" }, { key: "winAmount", label: t("partnerPages.col.winAmount"), align: "right", type: "currency" }, { key: "profit", label: t("partnerPages.col.profit"), align: "right", type: "profit" },
]);
const onlineColumns = computed<PartnerColumn[]>(() => [{ key: "member", label: t("partnerPages.col.member"), type: "accent" }, { key: "nickname", label: t("partnerPages.col.nickname") }, { key: "level", label: t("partnerPages.col.level") }, { key: "lastLogin", label: t("partnerPages.col.lastLogin") }, { key: "wallet", label: t("partnerPages.col.wallet"), align: "right", type: "currency" }, { key: "walletPoint", label: t("partnerPages.col.walletPoint"), align: "right", type: "currency" }, { key: "ip", label: t("partnerPages.members.ip") }]);
const shopColumns = computed<PartnerColumn[]>(() => [{ key: "receiver", label: t("partnerPages.col.storeMember"), type: "accent" }, { key: "type", label: t("partnerPages.col.tranType"), align: "center", type: "status" }, { key: "amount", label: t("partnerPages.col.betAmount"), align: "right", type: "currency" }, { key: "date", label: t("partnerPages.col.date") }]);

const message = (e: unknown) => (e as { data?: { message?: string } })?.data?.message || t("common.error");
const loadMembers = async (page = memberPage.value) => { try { const result = await api<PageResult<{ memberId: string; username: string; level: number | null; childCount: number; createdAt: string; lastLogin: string | null; walletAmount: string; pointAmount: string; deposits: string; withdrawals: string; netCashflow: string; winAmount: string; netBetAmount: string }>>("/partners/members", { params: { page, limit: LIMIT, startDate: memberStart.value, endDate: memberEnd.value, ...(searchValue.value.trim() ? { searchBy: searchType.value, search: searchValue.value.trim() } : {}) } }); memberRows.value = result.data.map((row) => ({ memberId: row.memberId, lowerCount: row.childCount, level: `LV.${row.level ?? 0}`, member: row.username, regDate: row.createdAt, lastLogin: row.lastLogin ?? "—", wallet: Number(row.walletAmount), walletPoint: Number(row.pointAmount), depAmount: Number(row.deposits), widAmount: Number(row.withdrawals), depWidProfit: Number(row.netCashflow), winAmount: Number(row.winAmount), profit: Number(row.netBetAmount) })); memberMeta.value = result.meta; memberPage.value = result.meta.page; } catch (e) { memberRows.value = []; memberMeta.value = meta(); error(message(e)); } };
const loadOnline = async (page = onlinePage.value) => { try { const result = await api<PageResult<{ memberId: string; username: string; name: string; level: number | null; lastLogin: string; walletAmount: string; pointAmount: string; lastIp: string | null }>>("/partners/members/online", { params: { page, limit: LIMIT } }); onlineRows.value = result.data.map((row) => ({ memberId: row.memberId, member: row.username, nickname: row.name, level: `LV.${row.level ?? 0}`, lastLogin: row.lastLogin, wallet: Number(row.walletAmount), walletPoint: Number(row.pointAmount), ip: row.lastIp ?? "—" })); onlineMeta.value = result.meta; onlinePage.value = result.meta.page; } catch (e) { onlineRows.value = []; onlineMeta.value = meta(); error(message(e)); } };
const loadShopTransfers = async (page = shopPage.value) => { try { const result = await api<PageResult<{ receiver: string; type: "add" | "deduct"; amount: string; updatedAt: string }>>("/partners/shop-transfers/sent", { params: { page, limit: LIMIT, startDate: shopStart.value, endDate: shopEnd.value, ...(shopReceiver.value.trim() ? { username: shopReceiver.value.trim() } : {}), ...(shopTypeFilter.value ? { type: shopTypeFilter.value } : {}) } }); shopRows.value = result.data.map((row) => ({ receiver: row.receiver, type: row.type, amount: Number(row.amount), date: row.updatedAt })); shopMeta.value = result.meta; shopPage.value = result.meta.page; } catch (e) { shopRows.value = []; shopMeta.value = meta(); error(message(e)); } };

const showShop = ref(false); const showPoint = ref(false); const showAddSub = ref(false); const showDetail = ref(false); const shopType = ref<"ADD" | "DEDUCT">("ADD"); const receiver = ref({ id: "", username: "", wallet: 0 }); const selectedMember = ref<PartnerMemberRow | null>(null);
const openShop = (row: Record<string, unknown>, type: "ADD" | "DEDUCT") => { receiver.value = { id: String(row.memberId), username: String(row.member), wallet: Number(row.wallet) }; shopType.value = type; showShop.value = true; };
const openPoint = (row: Record<string, unknown>) => { receiver.value = { id: String(row.memberId), username: String(row.member), wallet: Number(row.wallet) }; showPoint.value = true; };
const openDetail = (row: Record<string, unknown>) => {
  const member = memberRows.value.find((candidate) => candidate.memberId === String(row.memberId));
  if (!member) return;
  selectedMember.value = member;
  showDetail.value = true;
};
const refreshingWallet = ref<Set<string>>(new Set());
const onRefreshWallet = async (row: Record<string, unknown>) => {
  const id = String(row.memberId);
  if (refreshingWallet.value.has(id)) return;
  refreshingWallet.value = new Set(refreshingWallet.value).add(id);
  try { await loadMembers(); } finally { const next = new Set(refreshingWallet.value); next.delete(id); refreshingWallet.value = next; }
};
const createShopTransfer = async (body: { amount: number; type: string; receiverId: string }) => { try { await api("/partners/shop-transfers", { method: "POST", body: { ...body, type: body.type.toLowerCase() } }); showShop.value = false; success(t("common.success")); await Promise.all([loadMembers(), loadShopTransfers(1)]); } catch (e) { error(message(e)); } };
const createPointTransfer = async (body: { amount: number; type: string; receiverId: string }) => { try { await api("/partners/point-transfers", { method: "POST", body: { ...body, type: body.type.toLowerCase() } }); showPoint.value = false; success(t("common.success")); await loadMembers(); } catch (e) { error(message(e)); } };
const createMember = async (body: Record<string, unknown>) => { try { await api("/partners/members", { method: "POST", body }); showAddSub.value = false; success(t("common.success")); await loadMembers(1); } catch (e) { error(message(e)); } };
watch(activeTab, (tab) => { if (tab === "online") void loadOnline(1); if (tab === "shop") void loadShopTransfers(1); });
onMounted(() => { void loadMembers(1); });
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
