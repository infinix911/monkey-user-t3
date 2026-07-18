<template>
  <div>
    <!-- Total records indicator -->
    <div v-if="totalRows > 0" class="flex justify-end mb-3">
      <span class="text-white/45 text-[13px]">{{ t("partner.history.totalRecords", { count: totalRows }) }}</span>
    </div>

    <PartnerTable :columns="columns" :rows="rows"
      :empty-text="loading ? t('partner.history.loading') : t('partner.history.noData')">
      <template #cell-type="{ row }">
        <span class="font-semibold" :style="{ color: row.transaction_type === 'deposit' ? '#4ade80' : '#f87171' }">
          {{ row.transaction_type === "deposit" ? t("partner.history.typeDeposit") : t("partner.history.typeWithdrawal") }}
        </span>
      </template>
      <template #cell-amount="{ row }">
        <span class="text-white/90 font-semibold tabular-nums">{{ formatNumber(parseFloat(String(row.amount))) }}</span>
      </template>
      <template #cell-status="{ row }">
        <span class="status-pill" :style="pillStyle(Number(row.status))">
          {{ t(`partner.history.${getStatusKey(Number(row.status))}`) }}
        </span>
      </template>
    </PartnerTable>

    <PartnerPagination v-model:page="page" :total-pages="totalPages" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatPartnerAmount as formatNumber } from "@/utils/currency";
import { useApi } from "@/composables/useApi";
import type { PartnerColumn } from "@/utils/partnerMenu";

interface IPartnerTransaction {
  id: number;
  member: string;
  member_id: string;
  transaction_type: string;
  amount: string;
  status: number;
  upper_wallet_before: string;
  upper_wallet_after: string;
  member_wallet_before: string;
  member_wallet_after: string;
  created_at: string;
}

const { t } = useI18n();

const limit = 10;

const transactions = ref<IPartnerTransaction[]>([]);
const page = ref(1);
const totalPages = ref(1);
const totalRows = ref(0);
const loading = ref(true);

const columns = computed<PartnerColumn[]>(() => [
  { key: "member", label: t("partner.history.member") },
  { key: "type", label: t("partner.history.type"), align: "center", sortable: false },
  { key: "amount", label: t("partner.history.amount"), align: "right" },
  { key: "status", label: t("partner.history.status"), align: "center", sortable: false },
  { key: "created_at", label: t("partner.history.date"), align: "center" },
]);
const rows = computed(() => transactions.value as unknown as Record<string, unknown>[]);

function getStatusColor(status: number): string {
  switch (status) {
    case 0: return "#fbbf24";
    case 1: return "#3b82f6";
    case 2: return "#7298FF";
    case 9: return "#BEBEBE";
    default: return "#999999";
  }
}

/** Themed status pill (colored text + matching tint/border). */
function pillStyle(status: number) {
  const c = getStatusColor(status);
  return { color: c, borderColor: `${c}55`, background: `${c}1a` };
}

function getStatusKey(status: number): string {
  switch (status) {
    case 0: return "statusPending";
    case 1: return "statusProcessing";
    case 2: return "statusCompleted";
    case 9: return "statusRejected";
    default: return "statusPending";
  }
}


async function fetchTransactions() {
  loading.value = true;
  try {
    const api = useApi();
    const data = await api<{ pages: number; rows: number; data: IPartnerTransaction[] }>(
      `/partner/transactions?page=${page.value}&limit=${limit}`
    );
    transactions.value = data.data;
    totalPages.value = data.pages;
    totalRows.value = data.rows;
  } catch {
    transactions.value = [];
  } finally {
    loading.value = false;
  }
}

watch(page, fetchTransactions);
onMounted(fetchTransactions);
</script>

<style scoped>
.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 4px 10px;
  border-radius: 9999px;
  border: 1px solid;
  font-size: 11px;
  font-weight: 700;
  white-space: nowrap;
}
</style>
