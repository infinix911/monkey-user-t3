<template>
  <!-- Transaction ledger, rendered inside the NewProfileModal account-section
       panel (desktop sliding panel + mobile full-screen modal). Mirrors the
       layout contract of the other my-account sections (e.g. BettingReport):
       `h-full flex flex-col min-h-0` so the table is the only scroll region. -->
  <div class="pt-2 h-full flex flex-col min-h-0">
    <!-- Table Section: flex-1 + min-h-0 makes this the single scroll region. -->
    <div class="bg-gray-700 overflow-hidden mb-4 min-w-0 flex-1 min-h-0">
      <div class="overflow-auto h-full">
        <table class="w-full lg:min-w-max">
          <thead>
            <tr style="background-color: #161616">
              <th v-for="col in columns" :key="col"
                class="px-1 py-1.5 text-center text-white font-semibold text-[11px] lg:text-sm leading-tight whitespace-normal lg:whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ col }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="columns.length" class="px-2 py-8 text-center" style="background-color: #505050">
                <span class="text-white" style="font-family: var(--font-line-seed)">
                  {{ $t('common.loadingTransactions') }}
                </span>
              </td>
            </tr>
            <tr v-else-if="ledgerData.length === 0">
              <td :colspan="columns.length" class="px-2 py-8 text-center" style="background-color: #505050">
                <span class="text-gray-400" style="font-family: var(--font-line-seed)">
                  {{ $t('common.noTransactionsFound') }}
                </span>
              </td>
            </tr>
            <tr v-for="(item, index) in ledgerData" v-else :key="index"
              class="border-b last:border-b-0" style="background-color: #505050; border-color: #7a7a7a">
              <!-- Tanggal -->
              <td class="px-1 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                <div>{{ formatDate(item.created_at) }}</div>
                <div class="text-[10px] text-gray-400">{{ formatTime(item.created_at) }}</div>
              </td>
              <!-- Keterangan -->
              <td class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm"
                style="font-family: var(--font-line-seed)">
                {{ item.transaction }}
              </td>
              <!-- Status -->
              <td class="px-1 py-1.5 text-center" style="font-family: var(--font-line-seed)">
                <span
                  class="inline-flex items-center px-2 py-0.5 rounded-full font-medium capitalize text-[10px] lg:text-xs"
                  :class="statusBadgeClass(item.status)">
                  {{ item.status }}
                </span>
              </td>
              <!-- Saldo -->
              <td class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ formatAmount(item.amount) }}
              </td>
              <!-- Last Balance -->
              <td class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ formatAmount(item.wallet_after) }}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination — compact prev / current / next (the ledger can have many
         pages, so we avoid rendering every page button). -->
    <div v-if="!loading && totalPages > 1" class="flex items-center justify-center gap-3">
      <button type="button" :disabled="currentPage <= 1"
        class="px-3 py-1 rounded bg-[#505050] text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        @click="goToPage(currentPage - 1)">&lt;</button>
      <span class="text-white text-sm" style="font-family: var(--font-line-seed)">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <button type="button" :disabled="currentPage >= totalPages"
        class="px-3 py-1 rounded bg-[#505050] text-white text-sm disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        @click="goToPage(currentPage + 1)">&gt;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useApi } from "@/composables/useApi";
import { validateResponse } from "@/lib/validateResponse";
import {
  logsResponseWireSchema,
  mapLogsResponse,
  type ILedgerItem,
  type LedgerStatus,
} from "@/interfaces/ledger";

// Column headers for the account transaction ledger.
const columns = ["Tanggal", "Keterangan", "Status", "Saldo", "Last Balance"];

const PAGE_SIZE = 50;
const loading = ref(false);
const currentPage = ref(1);
const totalPages = ref(0);
const ledgerData = ref<ILedgerItem[]>([]);

function statusBadgeClass(status: LedgerStatus): string {
  if (status === "completed") return "bg-green-500/20 text-green-400";
  if (status === "failed") return "bg-red-500/20 text-red-400";
  return "bg-yellow-500/20 text-yellow-300"; // "new"
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return String(value);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
}

function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const d = new Date(value);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function formatAmount(value: string | null | undefined): string {
  if (value == null) return "0";
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

async function fetchLedger(page: number) {
  loading.value = true;
  try {
    const api = useApi();
    // useApi prepends the base (`/api` on the client) → /api/transactions/logs.
    // Backend returns { data, meta } (camelCase); normalize to { pages, rows, data }.
    const raw = await api("/transactions/logs", {
      query: { page, limit: PAGE_SIZE },
    });
    const result = mapLogsResponse(
      validateResponse(logsResponseWireSchema, raw, "/transactions/logs"),
    );
    ledgerData.value = result.data;
    totalPages.value = result.pages;
    currentPage.value = page;
  } catch (err) {
    console.error("Failed to fetch ledger:", err);
    ledgerData.value = [];
  } finally {
    loading.value = false;
  }
}

function goToPage(page: number) {
  if (page < 1 || page > totalPages.value) return;
  fetchLedger(page);
}

onMounted(() => fetchLedger(1));
</script>

<style scoped>
/* Keep the header row visible while the body scrolls vertically. */
thead th {
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: #161616;
}
</style>
