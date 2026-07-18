<template>
    <div class="flex flex-col gap-4 min-h-[600px]">
        <!-- Header strip: themed gradient + activity icon + total rows -->
        <div
class="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border" :style="{
            background: siteConfig.theme.panel.headerGradient,
            borderColor: siteConfig.theme.panel.panelBorder,
        }">
            <div class="flex items-center gap-3">
                <div
class="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" :style="{
                    background: siteConfig.theme.panel.gameTypeBtnActiveGradient,
                    border: `1px solid ${siteConfig.theme.panel.gameTypeBtnActiveBorder}`,
                }">
                    <svg
xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24"
                        :stroke="siteConfig.theme.brandColor" stroke-width="2.2">
                        <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                </div>
                <div class="flex flex-col">
                    <span class="text-white text-sm font-line-seed font-semibold leading-tight">{{ t("profile.activity")
                        }}</span>
                    <span
class="text-[11px] font-line-seed leading-tight opacity-80"
                        :style="{ color: siteConfig.theme.brandColor }">
                        {{ activeTabLabel }}
                    </span>
                </div>
            </div>
            <div class="flex items-center gap-2 text-right">
                <span class="text-[11px] text-gray-400 uppercase tracking-wider">{{ t("bettingReport.total") }}</span>
                <span
class="text-sm font-line-seed font-bold px-2.5 py-1 rounded-lg text-black" :style="{
                    background: siteConfig.theme.brandColor,
                }">
                    {{ totalRows.toLocaleString() }}
                </span>
            </div>
        </div>

        <!-- Category Tabs -->
        <div class="flex flex-wrap gap-2">
            <button
v-for="tab in tabs" :key="tab.id" type="button"
                class="px-3 py-2 rounded-lg text-sm font-line-seed transition-all duration-200 cursor-pointer border"
                :class="activeTab === tab.id
                    ? 'text-white font-semibold'
                    : 'bg-[#373737] text-white border-[#454545] hover:bg-[#4a4a4a] hover:border-[#5a5a5a]'"
                :style="activeTab === tab.id
                    ? {
                        background: siteConfig.theme.panel.gameTypeBtnActiveGradient,
                        borderColor: siteConfig.theme.panel.gameTypeBtnActiveBorder,
                        boxShadow: siteConfig.theme.panel.gameTypeBtnActiveShadow,
                    }
                    : {}" @click="setTab(tab.id)">
                {{ t(tab.labelKey) }}
            </button>
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
                <svg class="w-10 h-10 text-[#707070]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
                        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
            </div>
            <div class="text-[#a8a8a8] text-base font-medium text-center">
                {{ t("activity.empty") }}
            </div>
        </div>

        <!-- Table -->
        <div v-else class="flex flex-col gap-4 flex-1 min-h-[400px]">
            <div
class="overflow-hidden rounded-xl border" :style="{
                background: siteConfig.theme.panel.panelGradient,
                borderColor: siteConfig.theme.panel.panelBorder,
            }">
                <DataTable
:columns="activeColumns" :data="tableData"
                    :header-background="siteConfig.theme.panel.tableHeaderBackground" table-background="transparent"
                    :enable-pagination="false" max-height="500px" cell-font-size="13px" cell-padding-y="14px"
                    header-font-size="13px" :status-variants="statusVariants" :wrap-columns="['ID']"
                    wrap-column-max-width="180px" />
            </div>

            <!-- Server-side Pagination -->
            <div v-if="totalPages > 1" class="flex justify-center items-center gap-1 md:gap-3">
                <button
:disabled="currentPage === 1"
                    class="px-4 py-2 rounded-lg text-white font-line-seed text-xs transition-all duration-200 flex items-center gap-2 h-auto"
                    :class="currentPage === 1
                        ? 'bg-gray-700 cursor-not-allowed opacity-40'
                        : 'bg-gradient-to-r from-[#373737] to-[#4a4a4a] hover:from-[#4a4a4a] hover:to-[#5a5a5a] shadow-md hover:shadow-lg cursor-pointer'"
                    @click="goToPage(currentPage - 1)">
                    <svg
xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24"
                        stroke="currentColor">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
                    </svg>
                    {{ t('common.previous') }}
                </button>

                <template v-for="page in visiblePages" :key="page">
                    <span v-if="page === '...'" class="px-2 text-gray-400 text-base">...</span>
                    <button
v-else
                        class="px-4 py-2 rounded-lg font-line-seed text-xs transition-all duration-200 h-auto cursor-pointer"
                        :class="currentPage === page
                            ? 'text-black font-bold shadow-lg'
                            : 'text-white bg-gradient-to-r from-[#373737] to-[#4a4a4a] hover:from-[#4a4a4a] hover:to-[#5a5a5a] shadow-md hover:shadow-lg'"
                        :style="currentPage === page
                            ? { background: siteConfig.theme.brandColor }
                            : {}" @click="goToPage(page as number)">
                        {{ page }}
                    </button>
                </template>

                <button
:disabled="currentPage === totalPages"
                    class="px-4 py-2 rounded-lg text-white font-line-seed text-xs transition-all duration-200 flex items-center gap-2 h-auto"
                    :class="currentPage === totalPages
                        ? 'bg-gray-700 cursor-not-allowed opacity-40'
                        : 'bg-gradient-to-r from-[#373737] to-[#4a4a4a] hover:from-[#4a4a4a] hover:to-[#5a5a5a] shadow-md hover:shadow-lg cursor-pointer'"
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
import DataTable from "~/components/DataTable.vue";
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

interface ActivityRow {
  id: number;
  created_at: string;
  type: string;
  transaction: string;
  transaction_id: string;
  debit: string;
  credit: string;
  wallet_after: string;
}

interface ActivityResponse {
  rows: number;
  pages: number;
  data: ActivityRow[];
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
  "Type",
  "Amount",
  "Status",
  "Updated At",
];

const GAME_COLUMNS = ["ID", "Provider", "Bet", "Win", "Balance", "Date"];

const PAGE_SIZE = 50;

const { t } = useI18n();
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

const statusVariants = computed<Record<string, "success" | "danger" | "warning" | "info" | "default">>(() => ({
  [t("activity.credit")]: "success",
  [t("activity.debit")]: "danger",
  IN: "success",
  OUT: "danger",
}));

const activeTabLabel = computed(() => {
  const tab = tabs.find((tb) => tb.id === activeTab.value);
  return tab ? t(tab.labelKey) : "";
});

const formatAmount = (value: unknown): string => {
  const num = parseFloat(String(value ?? ""));
  if (isNaN(num) || num === 0) return "0";
  return new Intl.NumberFormat("id-ID", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
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
        Type: row.type || "",
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
    const payload = await api<ActivityResponse>(
      `/transactions/activity/${category}`,
      { query: { page, limit: PAGE_SIZE } },
    );
    rawData.value = payload?.data ?? [];
    totalPages.value = payload?.pages ?? 0;
    totalRows.value = payload?.rows ?? 0;
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
