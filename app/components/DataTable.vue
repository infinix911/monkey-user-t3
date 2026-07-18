<template>
  <div class="flex flex-col" :style="containerStyle">
    <!-- Card Layout (Mobile Responsive) -->
    <template v-if="useCardLayout">
      <!-- Scrollable Data Rows Container -->
      <div :style="`background: ${tableBackground}; padding-right: 8px; padding-top: 8px; padding-bottom: 8px;`">
        <div :style="scrollableStyle" class="scrollbar">
          <div
v-for="(item, index) in paginatedData" :key="index"
            class="mb-3 border-b border-b-[#7A7A7A] pl-2 transition-all duration-200 shadow-sm" :style="{
              backgroundColor:
                index % 2 === 0
                  ? tableBackground
                  : darkenColor(tableBackground),
            }" :class="{
              'cursor-pointer hover:bg-[#5a5a5a] hover:border-[#8a8a8a] hover:shadow-md':
                onRowClick,
            }" @click="handleRowClick(item)">
            <div
v-for="(chunk, chunkIndex) in chunkColumns(columns)" :key="chunkIndex"
              class="grid grid-cols-3 gap-1.5 mb-1.5" :class="{
                'mb-0': chunkIndex === chunkColumns(columns).length - 1,
              }">
              <div
v-for="(column, colIndex) in chunk" :key="colIndex"
                class="px-1.5 py-1.5 text-center font-line-seed font-normal flex flex-col items-center justify-center rounded bg-[#373737] border border-[#5a5a5a]"
                :style="getCellStyle(column, item)" :class="{
                  'cursor-pointer hover:bg-[#424242]':
                    column === actionColumn && onActionClick,
                }" @click="handleActionClick($event, column, item)">
                <!-- Value on top -->
                <div class="w-full font-medium">
                  <template
v-if="
                    column === 'nomor keluar' && Array.isArray(item[column])
                  ">
                    <span
v-for="(number, numIndex) in item[column] as string[]" :key="numIndex"
                      class="underline" :style="{ color: effectiveActionColor }" :class="{
                        'mr-2':
                          numIndex < (item[column] as string[]).length - 1,
                      }">
                      {{ number }}
                    </span>
                  </template>
                  <template v-else-if="column === 'STATUS'">
                    <span
class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-medium capitalize"
                      style="font-size: 0.85em" :class="getStatusBadgeClass(item[column] as string)">
                      <svg
v-if="getStatusIconPath(item[column] as string)" class="w-[1.1em] h-[1.1em] shrink-0"
                        fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                        <path
                          stroke-linecap="round" stroke-linejoin="round"
                          :d="getStatusIconPath(item[column] as string)" />
                      </svg>
                      {{ getStatusLabel(item[column] as string) }}
                    </span>
                  </template>
                  <template v-else>
                    <span
v-if="column === 'tanggal'" class="whitespace-pre-line text-center block w-full"
                      style="font-size: 0.85em">
                      {{ getCellContent(column, item) }}
                    </span>
                    <span v-else class="text-center block w-full break-words">
                      {{ getCellContent(column, item) }}
                    </span>
                  </template>
                </div>
                <!-- Column name below -->
                <div class="text-gray-400 mt-0.5 leading-tight" style="font-size: 0.65em">
                  {{ column.charAt(0).toUpperCase() + column.slice(1) }}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <!-- Table Layout (Default) — uses CSS grid so header & body columns align -->
    <template v-else>
      <div class="overflow-auto scrollbar" :style="tableScrollStyle">
        <div
class="grid" :style="{
          gridTemplateColumns: gridTemplateColumns,
          background: tableBackground,
          borderRadius: bottomBorderRadius,
        }">
          <!-- Header cells (sticky) -->
          <div
v-for="(column, index) in columns" :key="`h-${index}`"
            class="text-white text-center font-line-seed font-bold py-2 px-3 whitespace-nowrap sticky top-0 z-10 flex items-center justify-center"
            :style="{
              background: headerBackground,
              fontSize: headerFontSize || '0.875rem',
              borderTopLeftRadius: index === 0 ? headerBorderRadius.split(' ')[0] : '0',
              borderTopRightRadius: index === columns.length - 1 ? headerBorderRadius.split(' ')[1] || headerBorderRadius.split(' ')[0] : '0',
            }">
            {{ column.charAt(0).toUpperCase() + column.slice(1) }}
          </div>
          <!-- Body cells -->
          <template v-for="(item, rowIdx) in paginatedData" :key="`r-${rowIdx}`">
            <div
v-for="(column, colIndex) in columns" :key="`c-${rowIdx}-${colIndex}`"
              class="px-3 text-center font-line-seed font-normal flex items-center justify-center transition-all duration-200"
              :class="[
                column === 'tanggal' || column === 'nomor' ? 'break-all' : wrapColumns?.includes(column) ? 'break-words' : 'whitespace-nowrap',
                {
                  'cursor-pointer': (column === actionColumn && onActionClick) || onRowClick,
                  'hover:bg-blue-500/20': onRowClick,
                },
              ]" :style="getGridCellStyle(column, item, rowIdx)" @click="handleCellClick($event, column, item)">
              <template v-if="column === 'nomor keluar' && Array.isArray(item[column])">
                <span
v-for="(number, numIndex) in item[column] as string[]" :key="numIndex"
                  class="underline" :style="{ color: effectiveActionColor }" :class="{
                    'mr-2': numIndex < (item[column] as string[]).length - 1,
                  }">
                  {{ number }}
                </span>
              </template>
              <template v-else-if="column === 'STATUS'">
                <span
class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium capitalize"
                  :class="getStatusBadgeClass(item[column] as string)">
                  <svg
v-if="getStatusIconPath(item[column] as string)" class="w-3.5 h-3.5 shrink-0" fill="none"
                    stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" :d="getStatusIconPath(item[column] as string)" />
                  </svg>
                  {{ getStatusLabel(item[column] as string) }}
                </span>
              </template>
              <template v-else>
                <div
v-if="column === 'nomor' && Array.isArray(item[column])"
                  class="flex flex-row flex-wrap items-start justify-center gap-x-4 gap-y-2 w-full leading-tight">
                  <div
v-for="(prize, pIdx) in item[column] as Array<{ value: string; label: string }>" :key="pIdx"
                    class="flex flex-col items-center leading-tight">
                    <div class="font-semibold">{{ prize.value }}</div>
                    <div class="opacity-70" style="font-size: 0.7em">{{ prize.label }}</div>
                  </div>
                </div>
                <span
v-else-if="column === 'tanggal' || column === 'nomor'"
                  class="whitespace-pre-line text-center block w-full leading-tight">
                  {{ getCellContent(column, item) }}
                </span>
                <span v-else class="text-center block w-full">
                  {{ getCellContent(column, item) }}
                </span>
              </template>
            </div>
          </template>
        </div>
      </div>
    </template>
    <!-- Pagination Controls -->
    <div
v-if="enablePagination && totalPages > 1"
      class="flex justify-center items-center mt-4 gap-1 md:gap-3 overflow-x-auto w-full px-2">
      <!-- Previous Button -->
      <button
:disabled="currentPageValue === 1"
        class="font-line-seed px-4 md:px-6 py-3 md:py-2 rounded-lg text-white text-[32px] md:text-base transition-all duration-200 flex items-center gap-2 flex-shrink-0 h-12 md:h-auto"
        :class="currentPageValue === 1
          ? 'bg-gray-700 cursor-not-allowed opacity-40'
          : 'bg-gradient-to-r from-[#373737] to-[#4a4a4a] hover:from-[#4a4a4a] hover:to-[#5a5a5a] shadow-md hover:shadow-lg'
          " @click="goToPage(currentPageValue - 1)">
        <svg class="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
        </svg>
        <span class="hidden sm:inline">{{ $t('common.previous') }}</span>
      </button>

      <!-- Page Numbers -->
      <div class="flex gap-1 md:gap-2 items-center flex-shrink-0">
        <button
v-for="(page, index) in pageNumbers" :key="`page-${index}`" :disabled="typeof page !== 'number'"
          class="px-2 md:px-0 min-w-[50px] md:min-w-[25px] h-10 transition-colors duration-200 text-[32px] md:text-[16px] flex items-center justify-center"
          :class="[
            typeof page === 'number' && currentPageValue === page
              ? ''
              : typeof page === 'number'
                ? 'text-gray-400 hover:text-gray-200 font-line-seed'
                : 'text-gray-600 cursor-default  font-line-seed',
          ]"
          :style="typeof page === 'number' && currentPageValue === page ? { color: effectiveActionColor } : {}"
          @click="typeof page === 'number' ? goToPage(page) : null">
          {{ page }}
        </button>
      </div>

      <!-- Next Button -->
      <button
:disabled="currentPageValue === totalPages"
        class="px-4 md:px-6 py-3 md:py-2 rounded-lg text-white font-line-seed text-[32px] md:text-base transition-all duration-200 flex items-center gap-2 flex-shrink-0 h-12 md:h-auto"
        :class="currentPageValue === totalPages
          ? 'bg-gray-700 cursor-not-allowed opacity-40'
          : 'bg-gradient-to-r from-[#373737] to-[#4a4a4a] hover:from-[#4a4a4a] hover:to-[#5a5a5a] shadow-md hover:shadow-lg'
          " @click="goToPage(currentPageValue + 1)">
        <span class="hidden sm:inline">{{ $t('common.next') }}</span>
        <svg class="w-6 h-6 md:w-5 md:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useI18n } from "vue-i18n";
import { useMobileDetect } from "@/composables/useMobileDetect";

defineOptions({
  name: "DataTable",
});

const siteConfig = useSiteConfig();
const { t, te } = useI18n();

interface DataTableProps {
  columns: string[];
  data: Record<string, unknown>[];
  headerBackground?: string;
  headerBorderRadius?: string;
  bottomBorderRadius?: string;
  maxHeight?: string;
  actionColumn?: string;
  actionText?: string;
  actionColor?: string;
  tableHeight?: string;
  tableBackground?: string;
  cellFontSize?: string;
  cellPaddingY?: string;
  rowHeight?: string;
  headerHeight?: string;
  headerFontSize?: string;
  headerMarginTop?: string;
  headerMarginBottom?: string;
  enablePagination?: boolean;
  pageSize?: number;
  currentPage?: number;
  isResponsiveRow?: boolean;
  linkColumns?: string[];
  wrapColumns?: string[];
  wrapColumnMaxWidth?: string;
  onActionClick?: (item: Record<string, unknown>) => void;
  onRowClick?: (item: Record<string, unknown>) => void;
  onLinkClick?: (column: string, item: Record<string, unknown>) => void;
}

const props = withDefaults(defineProps<DataTableProps>(), {
  headerBackground: "#373737",
  headerBorderRadius: "10px 10px 0 0",
  bottomBorderRadius: "10px",
  maxHeight: "433px",
  actionColumn: "action",
  actionText: "[Detail]",
  actionColor: undefined,
  tableHeight: "auto",
  tableBackground: "#505050",
  cellFontSize: "15px",
  cellPaddingY: "8px",
  rowHeight: "auto",
  headerHeight: "auto",
  headerFontSize: "",
  headerMarginTop: "0",
  headerMarginBottom: "0",
  enablePagination: false,
  pageSize: 10,
  currentPage: undefined,
  isResponsiveRow: false,
  linkColumns: undefined,
  wrapColumns: undefined,
  wrapColumnMaxWidth: "200px",
  onActionClick: undefined,
  onRowClick: undefined,
  onLinkClick: undefined,
});

const { isMobile } = useMobileDetect();

// Falls back to the themed panel accent when no actionColor prop is passed.
const effectiveActionColor = computed(
  () => props.actionColor ?? siteConfig.theme.panel.actionColor,
);

const useCardLayout = computed(() => props.isResponsiveRow && isMobile.value);

// Columns listed in `wrapColumns` get a capped track (max `wrapColumnMaxWidth`)
// so long unbroken content wraps instead of stretching the column; all other
// columns keep their content-driven `max-content` sizing.
const gridTemplateColumns = computed(() =>
  props.columns
    .map((col) =>
      props.wrapColumns?.includes(col)
        ? `minmax(min-content, ${props.wrapColumnMaxWidth})`
        : "minmax(max-content, 1fr)",
    )
    .join(" "),
);

// Helper function to chunk columns into groups of 3
const chunkColumns = (cols: string[], chunkSize: number = 3): string[][] => {
  const chunks: string[][] = [];
  for (let i = 0; i < cols.length; i += chunkSize) {
    chunks.push(cols.slice(i, i + chunkSize));
  }
  return chunks;
};

const emit = defineEmits<{
  "page-change": [page: number];
}>();

const internalCurrentPage = ref(1);

// Use internal state if currentPage prop is not provided, otherwise use prop
const currentPageValue = computed(() => {
  return props.currentPage !== undefined
    ? props.currentPage
    : internalCurrentPage.value;
});

// Watch for prop changes and update internal state
watch(
  () => props.currentPage,
  (newPage) => {
    if (newPage !== undefined) {
      internalCurrentPage.value = newPage;
    }
  },
);

const totalItems = computed(() => props.data.length);
const totalPages = computed(() => Math.ceil(totalItems.value / props.pageSize));

const startIndex = computed(() => {
  return (currentPageValue.value - 1) * props.pageSize;
});

const endIndex = computed(() => {
  return Math.min(startIndex.value + props.pageSize, totalItems.value);
});

const paginatedData = computed(() => {
  if (!props.enablePagination) {
    return props.data;
  }
  return props.data.slice(startIndex.value, endIndex.value);
});

const pageNumbers = computed(() => {
  const maxVisible = isMobile.value ? 3 : 6;
  const pages: (number | string)[] = [];

  if (totalPages.value <= maxVisible) {
    // Show all pages if total is <= maxVisible
    for (let i = 1; i <= totalPages.value; i++) {
      pages.push(i);
    }
  } else {
    // Smart pagination logic
    const current = currentPageValue.value;
    const half = Math.floor(maxVisible / 2);

    let start = Math.max(1, current - half);
    let end = Math.min(totalPages.value, current + half);

    // Adjust if at boundaries
    if (current <= half) {
      end = maxVisible;
    } else if (current >= totalPages.value - half) {
      start = totalPages.value - maxVisible + 1;
    }

    // Add first page and ellipsis if needed
    if (start > 1) {
      pages.push(1);
      if (start > 2) {
        pages.push("...");
      }
    }

    // Add visible page range
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }

    // Add ellipsis and last page if needed
    if (end < totalPages.value) {
      if (end < totalPages.value - 1) {
        pages.push("...");
      }
      pages.push(totalPages.value);
    }
  }

  return pages;
});

const goToPage = (page: number) => {
  if (page < 1 || page > totalPages.value) {
    return;
  }
  if (props.currentPage === undefined) {
    internalCurrentPage.value = page;
  }
  emit("page-change", page);
};

const containerStyle = computed(() => {
  const styles: Record<string, string> = {};
  if (props.tableHeight !== "auto") {
    styles.height = props.tableHeight;
  }
  return styles;
});

const scrollableStyle = computed(() => {
  const baseStyle = `background: ${props.tableBackground}; overflow-y: auto; overflow-x: hidden;`;
  // Remove max-height on mobile devices
  if (isMobile.value) {
    return baseStyle;
  }
  return `${baseStyle} max-height: ${props.maxHeight};`;
});

const tableScrollStyle = computed(() => {
  const styles: Record<string, string> = {
    background: props.tableBackground,
  };
  if (!isMobile.value) {
    styles.maxHeight = props.maxHeight;
  }
  return styles;
});

const getGridCellStyle = (
  column: string,
  item: Record<string, unknown>,
  rowIdx: number,
): string => {
  const bg =
    rowIdx % 2 === 0
      ? props.tableBackground
      : darkenColor(props.tableBackground);
  const cellStyle = getCellStyle(column, item);
  return `${cellStyle} background: ${bg}; border-bottom: 1px solid #7A7A7A; padding-top: ${props.cellPaddingY}; padding-bottom: ${props.cellPaddingY};`;
};

const handleCellClick = (
  event: Event,
  column: string,
  item: Record<string, unknown>,
) => {
  handleActionClick(event, column, item);
  if (
    props.onRowClick &&
    column !== props.actionColumn &&
    !props.linkColumns?.includes(column)
  ) {
    props.onRowClick(item);
  }
};


const _getRowStyle = (index: number) => {
  const bg =
    index % 2 === 0
      ? props.tableBackground
      : darkenColor(props.tableBackground);
  const baseStyle = `height: ${props.rowHeight}; background: ${bg}; border-bottom: 1px solid #7A7A7A;`;
  const isLastRow = index === paginatedData.value.length - 1;
  if (isLastRow && props.bottomBorderRadius !== "0") {
    return `${baseStyle} border-radius: 0 0 ${props.bottomBorderRadius} ${props.bottomBorderRadius};`;
  }
  return baseStyle;
};

const darkenColor = (color: string): string => {
  // Handle hex colors
  if (color.startsWith("#")) {
    const num = parseInt(color.slice(1), 16);
    const r = Math.max(0, ((num >> 16) & 0xff) - 20);
    const g = Math.max(0, ((num >> 8) & 0xff) - 20);
    const b = Math.max(0, (num & 0xff) - 20);
    return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
  }
  return color;
};

const getCellStyle = (column: string, item?: Record<string, unknown>) => {
  const lineHeight = isMobile.value ? "34px" : "16.445px";
  const baseStyle = `font-size: ${props.cellFontSize}; line-height: ${lineHeight}; text-align: center;`;
  if (column === props.actionColumn) {
    return `${baseStyle} color: ${effectiveActionColor.value};`;
  }
  if (props.linkColumns?.includes(column)) {
    return `${baseStyle} color: ${effectiveActionColor.value}; cursor: pointer; text-decoration: underline;`;
  }
  if (column === "PROFIT" && item) {
    const val = String(item[column] ?? "");
    if (val.startsWith("-")) return `${baseStyle} color: #ef4444;`;
    if (parseFloat(val.replace(/,/g, "")) > 0)
      return `${baseStyle} color: #22c55e;`;
  }
  if (column === "nomor keluar" || column === "nomor") {
    return `${baseStyle} color: ${effectiveActionColor.value};`;
  }
  // Amount columns: yellow for stake/payout, green for discount.
  if (column === "Taruhan" || column === "Bayar") {
    return `${baseStyle} color: #facc15;`;
  }
  if (column === "Diskon") {
    return `${baseStyle} color: #4ade80;`;
  }
  return `${baseStyle} color: white;`;
};

type StatusKind = "success" | "pending" | "failed" | "default";

// Normalize a status string to one of the badge kinds. Handles the ledger API
// enums (completed / new / failed) plus legacy English/Indonesian variants.
const getStatusKind = (status: string): StatusKind => {
  const s = (status || "").toLowerCase();
  if (/(completed|disetujui|success|berhasil|sukses|approved)/.test(s))
    return "success";
  if (/(failed|ditolak|di tolak|tolak|gagal|batal|cancelled|rejected|error)/.test(s))
    return "failed";
  if (/(new|pending|menunggu|tertunda|processing|diproses|proses)/.test(s))
    return "pending";
  return "default";
};

const getStatusBadgeClass = (status: string) => {
  switch (getStatusKind(status)) {
    case "success":
      return "bg-green-900/40 text-green-400 border border-green-500/30";
    case "pending":
      return "bg-yellow-900/40 text-yellow-400 border border-yellow-500/30";
    case "failed":
      return "bg-red-900/40 text-red-400 border border-red-500/30";
    default:
      return "bg-gray-200 text-gray-900 border border-gray-400";
  }
};

// Localized badge label. Maps the ledger status kind to an i18n key
// (common.transactionStatus.*); unknown statuses fall back to the raw value.
const STATUS_LABEL_KEY: Record<StatusKind, string> = {
  success: "common.transactionStatus.completed",
  pending: "common.transactionStatus.new",
  failed: "common.transactionStatus.failed",
  default: "",
};
const getStatusLabel = (status: string): string => {
  const key = STATUS_LABEL_KEY[getStatusKind(status)];
  return key && te(key) ? t(key) : status;
};

// SVG path (24x24 viewBox, stroke) for the status icon — check / clock / x.
const getStatusIconPath = (status: string): string => {
  switch (getStatusKind(status)) {
    case "success":
      return "M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z";
    case "pending":
      return "M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z";
    case "failed":
      return "M9.75 9.75l4.5 4.5m0-4.5l-4.5 4.5M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z";
    default:
      return "";
  }
};

const getCellContent = (column: string, item: Record<string, unknown>) => {
  if (column === props.actionColumn) {
    return props.actionText;
  }
  return (item[column] as string) || "";
};

const handleActionClick = (
  event: Event,
  column: string,
  item: Record<string, unknown>,
) => {
  if (column === props.actionColumn && props.onActionClick) {
    event.stopPropagation();
    props.onActionClick(item);
  }
  if (props.linkColumns?.includes(column) && props.onLinkClick) {
    event.stopPropagation();
    props.onLinkClick(column, item);
  }
};

const handleRowClick = (item: Record<string, unknown>) => {
  if (props.onRowClick) {
    props.onRowClick(item);
  }
};
</script>

<style scoped>
/* Enhanced hover effect for clickable rows */
.cursor-pointer:hover {
  border-left: 3px solid #3b82f6;
  padding-left: 5px;
}
</style>
