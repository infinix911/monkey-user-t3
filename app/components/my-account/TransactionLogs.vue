<template>
  <!-- Transaction ledger, rendered inside the NewProfileModal account-section
       panel (desktop sliding panel + mobile full-screen modal). Mirrors the
       layout contract of the other my-account sections (e.g. BettingReport):
       `h-full flex flex-col min-h-0` so the table is the only scroll region. -->
  <div class="pt-2 h-full flex flex-col min-h-0">
    <!-- Table Section: flex-1 + min-h-0 makes this the single scroll region. -->
    <AppTable
      :columns="columns" :rows="ledgerData as unknown as Record<string, unknown>[]" :loading="loading"
      :loading-text="$t('common.loadingTransactions')" :empty-text="$t('common.noTransactionsFound')"
      class="mb-4">
      <template #row="{ row }">
        <td class="whitespace-nowrap"><TableDateCell :value="String(row.created_at ?? '')" /></td>
        <td>{{ describeTransaction(String(row.transaction ?? "")) }}</td>
        <td>
          <!-- The ledger only records settled movements, so the status cell is a
               fixed "completed" badge rather than a per-row lookup. -->
          <StatusBadge tone="success" :label="$t('myAccount.transactionLogs.statuses.completed')" />
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

const { t, te } = useI18n();

/**
 * Render the ledger's `transaction` column.
 *
 * The backend column is free text: it holds UPPER_SNAKE tokens
 * (`DEPOSIT_APPROVED`), prose the admin typed ("User Withdrawal"), and for game
 * rows a lobby or provider name. So only token-shaped values with a translation
 * are localized — everything else passes through untouched, which is the same
 * rule InquiryCard applies to app-raised inquiry titles. Without this the raw
 * token was printed straight into the Description column.
 */
function describeTransaction(value: string): string {
  if (!/^[A-Z0-9_]+$/.test(value)) return value;
  const key = `myAccount.transactionLogs.transactions.${value}`;
  return te(key) ? t(key) : value;
}
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

const PAGE_SIZE = 50;
const currentPage = ref(1);
const recordsStore = useMemberRecordsStore();
const ledgerKey = computed(() => `logs:limit=${PAGE_SIZE}&page=${currentPage.value}`);
const ledgerEntry = computed(() => recordsStore.transactionLogs[ledgerKey.value]);
const loading = computed(() => ledgerEntry.value?.status === "loading");
const totalPages = computed(() => ledgerEntry.value?.data?.pages ?? 0);
const ledgerData = computed(() => ledgerEntry.value?.data?.data ?? []);

function formatAmount(value: string | null | undefined): string {
  if (value == null) return "0";
  const num = parseFloat(value);
  if (isNaN(num) || num === 0) return "0";
  return formatNumber(num);
}

async function fetchLedger(page: number) {
  currentPage.value = page;
  await recordsStore.loadTransactionLogs({ page, limit: PAGE_SIZE });
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
