<template>
  <div>
    <PartnerTable :columns="columns" :rows="rows"
      :empty-text="loading ? t('partner.withdrawals.loading') : t('partner.withdrawals.noData')">
      <template #cell-amount="{ row }">
        <span class="text-white/90 font-semibold tabular-nums">{{ formatNumber(parseFloat(String(row.amount))) }}</span>
      </template>
      <template #cell-status="{ row }">
        <span class="status-pill" :style="pillStyle(Number(row.status))">
          {{ t(`partner.withdrawals.${getStatusKey(Number(row.status))}`) }}
        </span>
      </template>
      <template #cell-actions="{ row }">
        <div v-if="Number(row.status) === PENDING" class="flex justify-center gap-1.5">
          <button type="button" class="act-btn act-approve" :disabled="processingId === row.id"
            @click="handleProcess(Number(row.id), 2)">
            {{ processingId === row.id ? "…" : t("partner.withdrawals.approve") }}
          </button>
          <button type="button" class="act-btn act-deny" :disabled="processingId === row.id"
            @click="handleProcess(Number(row.id), 9)">
            {{ processingId === row.id ? "…" : t("partner.withdrawals.deny") }}
          </button>
        </div>
        <span v-else class="text-white/30">–</span>
      </template>
    </PartnerTable>

    <PartnerPagination v-model:page="page" :total-pages="totalPages" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { formatPartnerAmount as formatNumber } from "@/utils/currency";
import { useApi } from "@/composables/useApi";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";
import type { PartnerColumn } from "@/utils/partnerMenu";

interface IPartnerWithdrawal {
  id: number;
  upper: string;
  upper_id: string;
  member: string;
  member_id: string;
  amount: string;
  status: number;
  created_at: string;
}

const { t } = useI18n();
const apiMessage = useApiMessage();

const PENDING = 0;
const limit = 10;

const withdrawals = ref<IPartnerWithdrawal[]>([]);
const page = ref(1);
const totalPages = ref(1);
const loading = ref(true);
const processingId = ref<number | null>(null);

const columns = computed<PartnerColumn[]>(() => [
  { key: "member", label: t("partner.withdrawals.member") },
  { key: "amount", label: t("partner.withdrawals.amount"), align: "right" },
  { key: "created_at", label: t("partner.withdrawals.date"), align: "center" },
  { key: "status", label: t("partner.withdrawals.status"), align: "center", sortable: false },
  { key: "actions", label: t("partner.withdrawals.actions"), align: "center", sortable: false },
]);
const rows = computed(() => withdrawals.value as unknown as Record<string, unknown>[]);

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


async function fetchWithdrawals() {
  loading.value = true;
  try {
    const api = useApi();
    const data = await api<{ pages: number; rows: number; data: IPartnerWithdrawal[] }>(
      `/partner/withdrawals?page=${page.value}&limit=${limit}`
    );
    withdrawals.value = data.data;
    totalPages.value = data.pages;
  } catch {
    withdrawals.value = [];
  } finally {
    loading.value = false;
  }
}

async function handleProcess(withdrawalId: number, status: number) {
  processingId.value = withdrawalId;
  try {
    const api = useApi();
    const body = await api<{ message?: string }>(`/partner/withdrawal/${withdrawalId}`, {
      method: "PATCH",
      body: { status },
    });
    const message = body?.message || (status === 2 ? "PARTNER_WITHDRAWAL_APPROVED" : "PARTNER_WITHDRAWAL_REJECTED");
    await fetchWithdrawals();
    await showSuccessAlert(apiMessage(message, "partner"));
  } catch (error: unknown) {
    await showErrorAlert(apiMessage(error, "partner"));
  } finally {
    processingId.value = null;
  }
}

watch(page, fetchWithdrawals);
onMounted(fetchWithdrawals);
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

.act-btn {
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  color: #fff;
  cursor: pointer;
  transition: filter 0.15s ease, opacity 0.15s ease;
}

.act-btn:hover:not(:disabled) {
  filter: brightness(1.08);
}

.act-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.act-approve {
  background: #16a34a;
}

.act-deny {
  background: #dc2626;
}
</style>
