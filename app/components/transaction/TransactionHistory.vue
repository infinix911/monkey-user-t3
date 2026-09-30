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
    <AppTable :columns="columns" :rows="transactions as unknown as Record<string, unknown>[]" :empty-text="t(`${type}.history.noData`)">
      <template #row="{ row }">
        <td><TableDateCell :value="String(row.updated_at ?? '')" /></td>
        <td>{{ formatNumber(parseFloat(String(row.amount ?? '0'))) }}</td>
        <td>
          <StatusBadge
            :tone="getStatusTone(row.status as number)"
            :label="t(`${type}.history.${getStatusKey(row.status as number)}`)" />
        </td>
      </template>
    </AppTable>
  </div>
</template>

<script setup lang="ts">
import type { StatusTone } from "~/components/StatusBadge.vue";
import { formatNumberID as formatNumber } from "~/lib/formatter";
import { transactionHistoryQuery } from "~/components/transaction/transactionHistoryQuery";

const props = defineProps<{
  type: "deposit" | "withdrawal";
  method?: string;
}>();

const { t } = useI18n();

const siteConfig = useSiteConfig();
const accentColor = computed(() => siteConfig.theme.transactionmodal.accentColor);

const recordsStore = useMemberRecordsStore();

/** Header labels, in column order — the `row` slot emits cells to match. */
const columns = computed(() => [
  t(`${props.type}.history.date`),
  t(`${props.type}.history.amount`),
  t(`${props.type}.history.status`),
]);

/**
 * Backend status code → badge tone.
 *
 * Replaces a bare coloured-text mapping; the codes are unchanged (0 pending,
 * 1 processing, 2 completed, 9 rejected).
 */
/**
 * Backend transaction status codes.
 *
 * The set is sparse — 1 is not issued, and the gaps are deliberate — so this is
 * a lookup rather than a range. Anything outside it falls back to `completed`:
 * a member's own history should not show an alarming state for a code the
 * frontend simply has not been told about yet.
 */
const STATUSES: Record<number, { tone: StatusTone; key: string }> = {
  0: { tone: "pending", key: "statusNew" },
  2: { tone: "success", key: "statusCompleted" },
  3: { tone: "cancelled", key: "statusCancelled" },
  9: { tone: "rejected", key: "statusRejected" },
};

const FALLBACK_STATUS = { tone: "success" as StatusTone, key: "statusCompleted" };

/**
 * Badge tone for a status code.
 *
 * @param status - Backend status code.
 * @returns {StatusTone} Tone for StatusBadge.
 */
function getStatusTone(status: number): StatusTone {
  return (STATUSES[status] ?? FALLBACK_STATUS).tone;
}

/**
 * i18n key suffix for a status code, resolved under `<type>.history.*`.
 *
 * @param status - Backend status code.
 * @returns {string} Key suffix.
 */
function getStatusKey(status: number): string {
  return (STATUSES[status] ?? FALLBACK_STATUS).key;
}

async function fetchTransactions() {
  await recordsStore.loadWalletTransactions(transactionHistoryQuery(props.type, props.method));
}

const transactionKey = computed(() => {
  const params = transactionHistoryQuery(props.type, props.method);
  return `wallet:${Object.entries(params).filter(([, value]) => value !== undefined && value !== "").sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`).join("&")}`;
});
const transactions = computed(() => recordsStore.walletTransactions[transactionKey.value]?.data ?? []);

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
