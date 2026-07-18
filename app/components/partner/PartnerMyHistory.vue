<template>
  <div class="mt-10">
    <!-- Divider -->
    <div class="w-full mb-4" style="height: 1px; background: #666" />

    <!-- Title Bar -->
    <div
      class="py-2 text-white font-bold text-[18px]"
      style="font-family: var(--font-line-seed)"
    >
      {{ type === "deposit" ? t("partner.depositHistory") : t("partner.withdrawHistory") }}
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full" style="border-collapse: collapse">
        <thead>
          <tr style="background-color: #161616">
            <th class="px-3 py-2" :style="headerStyle">{{ t("deposit.history.date") }}</th>
            <th class="px-3 py-2" :style="headerStyle">{{ t("deposit.history.amount") }}</th>
            <th class="px-3 py-2" :style="headerStyle">{{ t("deposit.history.status") }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td
              colspan="3"
              class="px-3 py-8 text-center text-[16px] md:text-[18px]"
              :style="{ ...cellStyle, color: '#999999' }"
            >
              {{ t("partner.deposits.loading") }}
            </td>
          </tr>
          <tr v-else-if="transactions.length === 0">
            <td
              colspan="3"
              class="px-3 py-8 text-center text-[16px] md:text-[18px]"
              :style="{ ...cellStyle, color: '#999999' }"
            >
              {{ t("deposit.history.noData") }}
            </td>
          </tr>
          <tr v-for="tx in transactions" v-else :key="tx.id">
            <td class="px-3 py-2 text-[16px] md:text-[18px]" :style="cellStyle">
              {{ formatDate(tx.created_at) }}
            </td>
            <td class="px-3 py-2 text-[16px] md:text-[18px]" :style="cellStyle">
              {{ formatNumber(parseFloat(tx.amount)) }}
            </td>
            <td
              class="px-3 py-2 text-[16px] md:text-[18px]"
              :style="{ ...cellStyle, color: getStatusColor(tx.status) }"
            >
              {{ t(`deposit.history.${getStatusKey(tx.status)}`) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { formatPartnerAmount as formatNumber } from "@/utils/currency";
import { useApi } from "@/composables/useApi";

interface IMyPartnerTransaction {
  id: number;
  amount: string;
  status: number;
  created_at: string;
}

const props = defineProps<{
  type: "deposit" | "withdrawal";
}>();

const { t } = useI18n();

const transactions = ref<IMyPartnerTransaction[]>([]);
const loading = ref(true);

const headerStyle = {
  fontFamily: "var(--font-line-seed)",
  backgroundColor: "#161616",
  color: "#B0B0B0",
  textAlign: "center" as const,
  fontSize: "18px",
  fontWeight: 700,
  lineHeight: "35.956px",
};

const cellStyle = {
  fontFamily: "var(--font-line-seed)",
  color: "#BEBEBE",
  textAlign: "center" as const,
  fontWeight: 400,
  lineHeight: "39.951px",
  background: "#505050",
};

function getStatusColor(status: number): string {
  switch (status) {
    case 0: return "#fbbf24";
    case 1: return "#3b82f6";
    case 2: return "#7298FF";
    case 9: return "#BEBEBE";
    default: return "#999999";
  }
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


function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("th-TH", {
    month: "short",
    day: "numeric",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

async function fetchTransactions() {
  loading.value = true;
  const endpoint = props.type === "deposit" ? "/partner/my-deposits" : "/partner/my-withdrawals";
  try {
    const api = useApi();
    const data = await api<{ pages: number; rows: number; data: IMyPartnerTransaction[] }>(
      endpoint,
      { query: { page: 1, limit: 10 } }
    );
    transactions.value = data.data;
  } catch {
    transactions.value = [];
  } finally {
    loading.value = false;
  }
}

onMounted(fetchTransactions);

// Expose refresh function for parent to call after form submit
defineExpose({ refresh: fetchTransactions });
</script>
