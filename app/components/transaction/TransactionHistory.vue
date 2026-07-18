<template>
  <div class="mt-10">
    <!-- Divider -->
    <div class="w-full mb-4" style="height: 1px; background: #666" />

    <!-- Title Bar -->
    <div
      class="py-2 flex items-center gap-2 font-bold text-[14px] text-white"
      style="font-family: var(--font-line-seed)"
    >
      <!-- History (clock + counter-clockwise arrow) icon -->
      <svg
        viewBox="0 0 24 24"
        class="w-5 h-5 shrink-0"
        :style="{ color: accentColor }"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <path d="M3 3v5h5" />
        <path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" />
        <path d="M12 7v5l4 2" />
      </svg>
      {{ t(`${type}.history.title`) }}
    </div>

    <!-- Table -->
    <div class="overflow-x-auto">
      <table class="w-full" style="border-collapse: collapse">
        <!-- Table Header -->
        <thead>
          <tr style="background-color: #000000">
            <th class="px-3 py-2" :style="headerStyle">
              {{ t(`${type}.history.type`) }}
            </th>
            <th class="px-3 py-2" :style="headerStyle">
              {{ t(`${type}.history.date`) }}
            </th>
            <th class="px-3 py-2" :style="headerStyle">
              {{ t(`${type}.history.amount`) }}
            </th>
            <th class="px-3 py-2" :style="headerStyle">
              {{ t(`${type}.history.status`) }}
            </th>
          </tr>
        </thead>
        <!-- Table Body -->
        <tbody>
          <tr v-if="transactions.length === 0">
            <td
              colspan="4"
              class="px-3 py-8 text-center text-[16px] md:text-[18px]"
              :style="{ ...cellStyle, color: '#999999' }"
            >
              {{ t(`${type}.history.noData`) }}
            </td>
          </tr>
          <tr v-for="transaction in transactions" v-else :key="transaction.id">
            <td class="px-3 py-2 text-[16px] md:text-[18px]" :style="cellStyle">
              {{ transaction.method }}
            </td>
            <td class="px-3 py-2 text-[16px] md:text-[18px]" :style="cellStyle">
              {{ formatDate(transaction.updated_at) }}
            </td>
            <td class="px-3 py-2 text-[16px] md:text-[18px]" :style="cellStyle">
              {{ formatNumber(parseFloat(transaction.amount)) }}
            </td>
            <td
              class="px-3 py-2 text-[16px] md:text-[18px]"
              :style="{
                ...cellStyle,
                color: getStatusColor(transaction.status),
              }"
            >
              {{ t(`${type}.history.${getStatusKey(transaction.status)}`) }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useApi } from "@/composables/useApi";
import { formatNumberID as formatNumber } from "~/lib/formatter";

interface ITransactionHistory {
  id: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  method: string;
  amount: string;
  status: number;
  created_at: string;
  updated_at: string;
}

const props = defineProps<{
  type: "deposit" | "withdrawal";
  method?: string;
}>();

const { t } = useI18n();

const siteConfig = useSiteConfig();
const accentColor = computed(() => siteConfig.theme.transactionmodal.accentColor);

const transactions = ref<ITransactionHistory[]>([]);

const headerStyle = {
  fontFamily: "var(--font-line-seed)",
  backgroundColor: "#000000",
  color: "#B0B0B0",
  textAlign: "center" as const,
  fontSize: "14px",
  fontStyle: "normal" as const,
  fontWeight: 700,
  lineHeight: "28px",
  border: "1px solid #3A3A3A",
};

const cellStyle = {
  fontFamily: "var(--font-line-seed)",
  color: "#BEBEBE",
  textAlign: "center" as const,
  fontStyle: "normal" as const,
  fontWeight: 400,
  lineHeight: "39.951px",
  background: "#000000",
  border: "1px solid #3A3A3A",
};

function getStatusColor(status: number): string {
  switch (status) {
    case 0:
      return "#fbbf24";
    case 1:
      return "#3b82f6";
    case 2:
      return "#7298FF";
    case 9:
      return "#BEBEBE";
    default:
      return "#999999";
  }
}

function getStatusKey(status: number): string {
  switch (status) {
    case 0:
      return "statusPending";
    case 1:
      return "statusProcessing";
    case 2:
      return "statusCompleted";
    case 9:
      return "statusRejected";
    default:
      return "status";
  }
}

function calculateDateRange(): { start_date: string; end_date: string } {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const formatDateStr = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  return {
    start_date: formatDateStr(sevenDaysAgo),
    end_date: formatDateStr(today),
  };
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const options: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  };
  return date.toLocaleDateString("en-US", options).replace(",", "");
}

async function fetchTransactions() {
  const { start_date, end_date } = calculateDateRange();

  try {
    const params = new URLSearchParams({ start_date, end_date });
    if (props.method) {
      params.append("method", props.method);
    }

    const api = useApi();
    transactions.value = await api<ITransactionHistory[]>(
      `/transactions/wallet/${props.type}?${params.toString()}`,
    );
  } catch (error) {
    console.error(`Failed to fetch ${props.type} history:`, error);
    transactions.value = [];
  }
}

onMounted(() => {
  fetchTransactions();
});

watch(
  () => [props.type, props.method],
  () => {
    fetchTransactions();
  },
);
</script>
