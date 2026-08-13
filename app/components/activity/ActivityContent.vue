<template>
    <div class="flex flex-col gap-4 min-h-[600px]">
        <!-- Filters and row count on one line: the count describes the list the
             tabs filter, so it belongs beside them rather than in a banner of
             its own. On narrow widths the count wraps under the tabs.

             The tabs are a segmented control — one bordered track holding pill
             buttons — instead of seven separate bordered boxes. The track makes
             them read as a single choice, and only the selected pill carries a
             background, so the active state is the one thing that stands out. -->
        <div class="flex flex-wrap items-center justify-between gap-3">
            <div
class="tm-card tm-line border inline-flex flex-wrap items-center gap-1 p-1 rounded-full"
                role="tablist" :aria-label="t('profile.activity')">
                <button
v-for="tab in tabs" :key="tab.id" type="button" role="tab"
                    :aria-selected="activeTab === tab.id"
                    class="px-3.5 py-1.5 rounded-full text-[13px] font-line-seed leading-none whitespace-nowrap transition-all duration-200 cursor-pointer"
                    :class="activeTab === tab.id
                        ? 'text-white font-semibold'
                        : 'tm-muted hover:text-white'"
                    :style="activeTab === tab.id
                        ? {
                            background: siteConfig.theme.panel.gameTypeBtnActiveGradient,
                            boxShadow: siteConfig.theme.panel.gameTypeBtnActiveShadow,
                        }
                        : {}" @click="setTab(tab.id)">
                    {{ t(tab.labelKey) }}
                </button>
            </div>

            <!-- No chip around the figure: it sat next to the tab track and read
                 as a third control. Weight and colour separate the count from
                 its label well enough on their own. -->
            <div class="flex items-baseline gap-2 shrink-0">
                <span class="tm-muted text-[11px] uppercase tracking-wider">{{ t("bettingReport.total") }}</span>
                <span class="text-sm font-line-seed font-bold text-white tabular-nums">
                    {{ totalRows.toLocaleString() }}
                </span>
            </div>
        </div>

        <!-- Loading -->
        <div v-if="loading" class="flex items-center justify-center py-12 flex-1 min-h-[400px]">
            <div class="flex flex-col items-center gap-4">
                <svg
class="animate-spin h-10 w-10" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    :style="{ color: siteConfig.theme.brandColor }">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
                    <path
class="opacity-75" fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <div class="text-white text-sm font-medium">{{ t("common.loading") }}</div>
            </div>
        </div>

        <!-- Empty -->
        <div
v-else-if="!loading && tableData.length === 0"
            class="flex flex-col items-center justify-center py-12 flex-1 min-h-[400px]">
            <div
class="w-20 h-20 rounded-full flex items-center justify-center mb-4"
                style="background: linear-gradient(135deg, rgba(80,80,80,0.4) 0%, rgba(40,40,40,0.6) 100%);">
                <svg class="tm-muted w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <div class="tm-muted text-base font-medium text-center">
                {{ t("activity.empty") }}
            </div>
        </div>

        <!-- Table. Uses the shared AppTable shell, the same one the other
             account panels render, so this reads identically to the transaction
             ledger and betting report instead of the card-grid DataTable it
             used before. -->
        <div v-else class="flex flex-col gap-4 flex-1 min-h-[400px]">
            <!-- No loading/empty props: this branch only renders once rows
                 exist, and the panel shows its own spinner and empty
                 illustration above, which are richer than a single table row. -->
            <AppTable :columns="activeColumnLabels" :rows="tableData">
                <template #row="{ row }">
                    <td
v-for="col in activeColumns" :key="col"
                        :class="col === 'ID' ? 'break-all max-w-[180px]' : 'whitespace-nowrap'">
                        <TableDateCell v-if="DATE_COLUMNS.includes(col)" :value="String(row[col] ?? '')" />
                        <StatusBadge
v-else-if="col === 'Status'" :tone="statusTone(String(row[col] ?? ''))"
                            :label="String(row[col] ?? '')" />
                        <template v-else-if="col === 'Service' || col === 'Provider'">{{ transactionLabel(row[col]) }}</template>
                        <template v-else>{{ row[col] }}</template>
                    </td>
                </template>
            </AppTable>

            <!-- Server-side Pagination -->
            <div v-if="totalPages > 1" class="flex justify-center items-center gap-1 md:gap-3">
                <button
:disabled="currentPage === 1"
                    class="px-4 py-2 rounded-lg text-white font-line-seed text-xs transition-all duration-200 flex items-center gap-2 h-auto"
                    :class="currentPage === 1
                        ? 'tm-card cursor-not-allowed opacity-40'
                        : 'tm-btn-ghost shadow-md hover:shadow-lg cursor-pointer'"
                    @click="goToPage(currentPage - 1)">
                    <svg
xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    {{ t('common.previous') }}
                </button>

                <template v-for="page in visiblePages" :key="page">
                    <span v-if="page === '...'" class="tm-muted px-2 text-base">...</span>
                    <button
v-else
                        class="px-4 py-2 rounded-lg font-line-seed text-xs transition-all duration-200 h-auto cursor-pointer"
                        :class="currentPage === page
                            ? 'tm-btn font-bold shadow-lg'
                            : 'tm-btn-ghost shadow-md hover:shadow-lg'" @click="goToPage(page as number)">
                        {{ page }}
                    </button>
                </template>

                <button
:disabled="currentPage === totalPages"
                    class="px-4 py-2 rounded-lg text-white font-line-seed text-xs transition-all duration-200 flex items-center gap-2 h-auto"
                    :class="currentPage === totalPages
                        ? 'tm-card cursor-not-allowed opacity-40'
                        : 'tm-btn-ghost shadow-md hover:shadow-lg cursor-pointer'"
                    @click="goToPage(currentPage + 1)">
                    {{ t('common.next') }}
                    <svg
xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
                    </svg>
                </button>
            </div>
        </div>

    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { useApi } from "@/composables/useApi";
import type { StatusTone } from "~/components/StatusBadge.vue";
import { validateResponse } from "@/lib/validateResponse";
import {
  activityResponseWireSchema,
  mapActivityResponse,
  type ActivityRow,
} from "@/interfaces/transaction.interface";
import { useSiteConfig } from "~/composables/useSiteConfig";

defineOptions({
  name: "ActivityContent",
});

const siteConfig = useSiteConfig();

type ActivityCategory =
  | "all"
  | "transaction"
  | "slot"
  | "casino"
  | "sport"
  | "mini"
  | "fishing";

interface Tab {
  id: ActivityCategory;
  labelKey: string;
}


const tabs: Tab[] = [
  { id: "all", labelKey: "common.all" },
  { id: "transaction", labelKey: "notifications.categories.transaction" },
  { id: "slot", labelKey: "navbar.slot" },
  { id: "casino", labelKey: "navbar.casino" },
  { id: "sport", labelKey: "bettingReport.sport" },
  { id: "mini", labelKey: "navbar.mini" },
  { id: "fishing", labelKey: "navbar.fishing" },
];

const TRANSACTION_COLUMNS = [
  "ID",
  "Service",
  "Amount",
  "Status",
  "Updated At",
];

const GAME_COLUMNS = ["ID", "Provider", "Bet", "Win", "Balance", "Date"];

const PAGE_SIZE = 50;

const { t, te } = useI18n();

/** Column key → i18n label key, so the AppTable headers localize. */
const COLUMN_LABEL_KEYS: Record<string, string> = {
  ID: "activity.columns.id",
  Service: "activity.columns.service",
  Amount: "activity.columns.amount",
  Status: "activity.columns.status",
  "Updated At": "activity.columns.updatedAt",
  Provider: "activity.columns.provider",
  Bet: "activity.columns.bet",
  Win: "activity.columns.win",
  Balance: "activity.columns.balance",
  Date: "activity.columns.date",
};

/**
 * Translate a backend transaction/status code (e.g. `DEPOSIT_APPROVED`) to a
 * localized label, falling back to the raw value for unmapped codes and game
 * provider names (Evolution, Pragmatic Slots, …).
 *
 * @param value - The raw `transaction` cell value.
 * @returns {string} Localized label, or the raw value when unmapped.
 */
function transactionLabel(value: unknown): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  const key = `activity.transactionTypes.${raw}`;
  return te(key) ? t(key) : raw;
}
const activeTab = ref<ActivityCategory>("all");
const loading = ref(false);
const rawData = ref<ActivityRow[]>([]);
const currentPage = ref(1);
const totalPages = ref(0);
const totalRows = ref(0);

const activeColumns = computed(() =>
  activeTab.value === "transaction" || activeTab.value === "all"
    ? TRANSACTION_COLUMNS
    : GAME_COLUMNS,
);

/** Localized header labels (AppTable renders these); rows still key off activeColumns. */
const activeColumnLabels = computed(() =>
  activeColumns.value.map((col) => t(COLUMN_LABEL_KEYS[col] ?? col)),
);

/** Columns holding a timestamp, rendered through TableDateCell. */
const DATE_COLUMNS = ["Updated At", "Date"];

/**
 * Status text → badge tone. Money in reads green, money out red; the labels are
 * translated, so the comparison is against the same keys the rows are built
 * from rather than raw English.
 *
 * @param value - The cell's status text.
 * @returns {StatusTone} Tone for StatusBadge.
 */
function statusTone(value: string): StatusTone {
  if (value === t("activity.credit") || value === "IN") return "success";
  if (value === t("activity.debit") || value === "OUT") return "danger";
  return "pending";
}

// Currency/locale-aware number formatting (KRW → "1,234,567" with no forced
// decimals), matching the account transaction ledger. Adapts to the deployment
// currency instead of hardcoding a locale.
const { formatNumber } = useCurrency();

const formatAmount = (value: unknown): string => {
  const num = parseFloat(String(value ?? ""));
  if (isNaN(num) || num === 0) return "0";
  return formatNumber(num);
};

// Prefix with "#" and add a space after each comma so multi-ID values
// (e.g. "161287,161288,161291") wrap cleanly between IDs instead of
// breaking mid-number when the ID column hits its max width.
const formatId = (val: unknown): string =>
  val != null && val !== "" ? `#${String(val).replace(/,/g, ", ")}` : "";

const tableData = computed(() => {
  return rawData.value.map((row) => {
    const debit = parseFloat(String(row.debit ?? "0")) || 0;
    const credit = parseFloat(String(row.credit ?? "0")) || 0;
    if (activeTab.value === "transaction" || activeTab.value === "all") {
      const amount = credit > 0 ? credit : debit;
      return {
        ID: formatId(row.id),
        Service: row.transaction || "",
        Amount: formatAmount(amount),
        Status: credit > 0 ? t("activity.credit") : t("activity.debit"),
        "Updated At": String(row.created_at || ""),
      };
    }
    const idValue = row.transaction_id || String(row.id);
    return {
      ID: formatId(idValue),
      Provider: row.transaction || "",
      Bet: formatAmount(debit),
      Win: formatAmount(credit),
      Balance: formatAmount(row.wallet_after),
      Date: String(row.created_at || ""),
    };
  });
});

const fetchActivity = async (category: ActivityCategory, page: number) => {
  loading.value = true;
  try {
    const api = useApi();
    const raw = await api(`/transactions/activity/${category}`, {
      query: { page, limit: PAGE_SIZE },
    });
    const payload = mapActivityResponse(
      validateResponse(
        activityResponseWireSchema,
        raw,
        "/transactions/activity",
      ),
    );
    rawData.value = payload.data;
    totalPages.value = payload.pages;
    totalRows.value = payload.rows;
    currentPage.value = page;
  } catch (err) {
    console.error(`Failed to fetch activity for ${category}:`, err);
    rawData.value = [];
    totalPages.value = 0;
    totalRows.value = 0;
  } finally {
    loading.value = false;
  }
};

const setTab = (id: ActivityCategory) => {
  if (activeTab.value === id) return;
  activeTab.value = id;
  currentPage.value = 1;
  fetchActivity(id, 1);
};

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value || page === currentPage.value) return;
  fetchActivity(activeTab.value, page);
};

const visiblePages = computed<(number | string)[]>(() => {
  const maxVisible = 6;
  const pages: (number | string)[] = [];
  if (totalPages.value <= maxVisible) {
    for (let i = 1; i <= totalPages.value; i++) pages.push(i);
    return pages;
  }
  const current = currentPage.value;
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(totalPages.value, current + half);

  if (current <= half) {
    end = maxVisible;
  } else if (current >= totalPages.value - half) {
    start = totalPages.value - maxVisible + 1;
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("...");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < totalPages.value) {
    if (end < totalPages.value - 1) pages.push("...");
    pages.push(totalPages.value);
  }
  return pages;
});

onMounted(() => {
  fetchActivity(activeTab.value, 1);
});
</script>
