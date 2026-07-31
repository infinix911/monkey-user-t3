<template>
  <!-- Transaction ledger, rendered inside the NewProfileModal account-section
       panel (desktop sliding panel + mobile full-screen modal). Mirrors the
       layout contract of the other my-account sections (e.g. BettingReport):
       `h-full flex flex-col min-h-0` so the table is the only scroll region. -->
  <div class="pt-2 h-full flex flex-col min-h-0">
    <!-- Table Section: flex-1 + min-h-0 makes this the single scroll region. -->
    <AppTable
      :columns="columns" :rows="ledgerData" :loading="loading"
      :loading-text="$t('common.loadingTransactions')" :empty-text="$t('common.noTransactionsFound')"
      class="mb-4">
      <template #row="{ row }">
        <td class="whitespace-nowrap"><TableDateCell :value="String(row.created_at ?? '')" /></td>
        <td>{{ row.transaction }}</td>
        <td>
          <StatusBadge
            :tone="statusTone(row.status as LedgerStatus)"
            :label="statusLabel(row.status as LedgerStatus)" />
        </td>
        <td class="whitespace-nowrap">{{ formatAmount(row.amount as string) }}</td>
        <td class="whitespace-nowrap">{{ formatAmount(row.wallet_after as string) }}</td>
      </template>
    </AppTable>

    <!-- Pagination — compact prev / current / next (the ledger can have many
         pages, so we avoid rendering every page button). -->
    <div v-if="!loading && totalPages > 1" class="flex items-center justify-center gap-3">
      <button type="button" :disabled="currentPage <= 1"
        class="tm-btn-ghost px-3 py-1 rounded text-sm cursor-pointer"
        @click="goToPage(currentPage - 1)">&lt;</button>
      <span class="text-white text-sm" style="font-family: var(--font-line-seed)">
        {{ currentPage }} / {{ totalPages }}
      </span>
      <button type="button" :disabled="currentPage >= totalPages"
        class="tm-btn-ghost px-3 py-1 rounded text-sm cursor-pointer"
        @click="goToPage(currentPage + 1)">&gt;</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useApi } from "@/composables/useApi";
import type { StatusTone } from "~/components/StatusBadge.vue";
import { validateResponse } from "@/lib/validateResponse";
import {
  logsResponseWireSchema,
  mapLogsResponse,
  type ILedgerItem,
  type LedgerStatus,
} from "@/interfaces/ledger";

const { t, te } = useI18n();
// Ledger amounts follow the deployment currency, not a pinned locale.
const { formatNumber } = useCurrency();

// Column headers for the account transaction ledger.
const columns = computed(() => [
  t("myAccount.transactionLogs.date"),
  t("myAccount.transactionLogs.description"),
  t("myAccount.transactionLogs.status"),
  t("myAccount.transactionLogs.amount"),
  t("myAccount.transactionLogs.lastBalance"),
]);

/**
 * `status` is a closed enum from the backend, so it can be translated. The
 * `transaction` column is free-form backend text and is passed through as-is.
 */
function statusLabel(status: LedgerStatus): string {
  const key = `myAccount.transactionLogs.statuses.${status}`;
  return te(key) ? t(key) : status;
}

const PAGE_SIZE = 50;
const loading = ref(false);
const currentPage = ref(1);
const totalPages = ref(0);
const ledgerData = ref<ILedgerItem[]>([]);

/**
 * Ledger status → badge tone, so this reads like the status column in the
 * transaction and activity panels rather than carrying its own palette.
 */
function statusTone(status: LedgerStatus): StatusTone {
  if (status === "completed") return "success";
  if (status === "failed") return "rejected";
  return "pending"; // "new"
}

function formatAmount(value: string | null | undefined): string {
  if (value == null) return "0";
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return "0";
  return formatNumber(num);
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
  background: color-mix(in srgb, var(--tm-accent) 12%, var(--body-bg));
}
</style>
