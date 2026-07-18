<template>
  <div class="partner-table rounded-2xl overflow-hidden" :style="{ background: cardBg }"
    :key="String(accent)">
    <div class="overflow-x-auto partner-x-scroll">
      <table class="w-full border-collapse min-w-max">
        <thead class="partner-thead">
          <tr :style="{ background: headBg }">
            <th v-if="expandable" class="w-9" aria-hidden="true"></th>
            <th v-for="col in columns" :key="col.key"
              class="px-4 py-3.5 text-[11px] md:text-xs font-semibold uppercase tracking-[0.06em] whitespace-nowrap transition-colors"
              :class="[
                alignClass(col.align),
                isSortable(col) ? 'cursor-pointer select-none hover:text-white/70' : '',
                sortKey === col.key ? 'text-white/80' : 'text-white/45',
              ]"
              :aria-sort="sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : undefined"
              @click="onSort(col)">
              <span class="inline-flex items-center gap-1.5"
                :class="col.align === 'right' ? 'flex-row-reverse' : ''">
                {{ col.label }}
                <svg v-if="isSortable(col)" class="w-2.5 h-2.5 shrink-0 transition-opacity"
                  :class="sortKey === col.key ? 'opacity-100' : 'opacity-35'"
                  :style="sortKey === col.key ? { color: accent } : {}"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path v-if="sortKey === col.key && sortDir === 'asc'" d="m4.5 15.75 7.5-7.5 7.5 7.5" />
                  <path v-else-if="sortKey === col.key && sortDir === 'desc'" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                  <path v-else d="M8.25 9 12 5.25 15.75 9M8.25 15 12 18.75 15.75 15" />
                </svg>
              </span>
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="sortedRows.length === 0">
            <td :colspan="colSpan" class="px-4 py-12 text-center text-white/45 text-sm">
              {{ emptyText || $t('partner.deposits.noData') }}
            </td>
          </tr>
          <template v-for="(row, i) in sortedRows" :key="i">
            <tr class="partner-row transition-colors duration-200 hover:bg-white/[0.06]"
              :class="[i % 2 === 1 ? 'bg-white/[0.015]' : '', expandable ? 'cursor-pointer' : '']"
              @click="onRowClick(i)">
              <!-- Expand chevron (accordion tables only) -->
              <td v-if="expandable" class="pl-4 pr-0 w-9 align-middle">
                <svg class="w-4 h-4 text-white/40 transition-transform duration-200"
                  :class="isExpanded(i) ? 'rotate-90' : ''" :style="isExpanded(i) ? { color: accent } : {}"
                  viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"
                  stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="m9 5 7 7-7 7" />
                </svg>
              </td>
              <td v-for="col in columns" :key="col.key"
                class="px-4 py-3.5 text-[13px] whitespace-nowrap" :class="alignClass(col.align)">
                <!-- Per-column override: pages can supply `#cell-<key>` for custom
                     cells (action buttons, refresh, etc.); default rendering below. -->
                <slot :name="`cell-${col.key}`" :row="row" :value="row[col.key]" :index="i">
                  <template v-if="col.type === 'status'">
                    <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold"
                      :class="statusClass(String(row[col.key]))">
                      {{ row[col.key] }}
                    </span>
                  </template>
                  <span v-else-if="col.type === 'profit'" class="font-bold tabular-nums"
                    :style="{ color: Number(row[col.key]) < 0 ? '#f87171' : '#4ade80' }">
                    {{ fmtNum(row[col.key]) }}
                  </span>
                  <span v-else-if="col.type === 'currency' || col.type === 'number'"
                    class="text-white/90 font-semibold tabular-nums">
                    {{ fmtNum(row[col.key]) }}
                  </span>
                  <span v-else-if="col.type === 'accent'" class="font-bold" :style="{ color: accent }">
                    {{ row[col.key] }}
                  </span>
                  <span v-else class="text-white/80">{{ row[col.key] }}</span>
                </slot>
              </td>
            </tr>
            <!-- Expanded content (accordion) — a full-width sub-row -->
            <tr v-if="expandable && isExpanded(i)" class="expand-row">
              <td :colspan="colSpan" class="p-0">
                <div class="expand-content">
                  <slot name="expanded" :row="row" :index="i" />
                </div>
              </td>
            </tr>
          </template>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useCurrency } from "@/composables/useCurrency";
import type { PartnerColumn } from "@/utils/partnerMenu";

const props = defineProps<{
  columns: PartnerColumn[];
  rows: Record<string, unknown>[];
  emptyText?: string;
  /** When true, rows are click-to-expand accordions; supply an `#expanded`
   *  slot for the sub-content (e.g. a nested sub-table). */
  expandable?: boolean;
}>();

const currency = useCurrency();

// Partner palette mapped to table roles (usePartnerTheme).
const { accent, cardBg, headBg } = usePartnerTheme();

// --- Sorting -------------------------------------------------------------
// Click a header to cycle asc → desc → unsorted. Numeric columns
// (currency/number/profit) sort numerically; everything else sorts as text
// (natural/locale). Action/slot-only columns opt out with `sortable: false`.
const sortKey = ref<string | null>(null);
const sortDir = ref<"asc" | "desc">("asc");
const NUMERIC_TYPES = new Set(["currency", "number", "profit"]);

const isSortable = (col: PartnerColumn) => col.sortable !== false;

const onSort = (col: PartnerColumn) => {
  if (!isSortable(col)) return;
  expandedRows.value = new Set(); // row indices shift when re-sorted
  if (sortKey.value !== col.key) {
    sortKey.value = col.key;
    sortDir.value = "asc";
  } else if (sortDir.value === "asc") {
    sortDir.value = "desc";
  } else {
    sortKey.value = null;
  }
};

// --- Expandable (accordion) rows ----------------------------------------
const expandedRows = ref<Set<number>>(new Set());
const isExpanded = (i: number) => expandedRows.value.has(i);
const colSpan = computed(() => props.columns.length + (props.expandable ? 1 : 0));

const onRowClick = (i: number) => {
  if (!props.expandable) return;
  const next = new Set(expandedRows.value);
  next.has(i) ? next.delete(i) : next.add(i);
  expandedRows.value = next;
};

const sortedRows = computed(() => {
  const key = sortKey.value;
  if (!key) return props.rows;
  const col = props.columns.find((c) => c.key === key);
  const numeric = NUMERIC_TYPES.has(col?.type ?? "");
  const dir = sortDir.value === "desc" ? -1 : 1;
  return [...props.rows].sort((a, b) => {
    const va = a[key];
    const vb = b[key];
    if (numeric) return dir * ((Number(va) || 0) - (Number(vb) || 0));
    return dir * String(va ?? "").localeCompare(String(vb ?? ""), undefined, { numeric: true });
  });
});

const alignClass = (a?: string) =>
  a === "right" ? "text-right" : a === "center" ? "text-center" : "text-left";

const fmtNum = (v: unknown) => currency.formatNumber(Number(v) || 0);

const statusClass = (status: string) => {
  const s = status.toLowerCase();
  if (/(completed|approved|success|active|paid)/.test(s))
    return "bg-green-900/40 text-green-400 border border-green-500/25";
  if (/(rejected|denied|failed|inactive|cancel)/.test(s))
    return "bg-red-900/40 text-red-400 border border-red-500/25";
  if (/(processing|proces)/.test(s))
    return "bg-blue-900/40 text-blue-300 border border-blue-500/25";
  return "bg-yellow-900/40 text-yellow-300 border border-yellow-500/25";
};
</script>

<style scoped>
.partner-table {
  backdrop-filter: blur(12px) saturate(1.05);
  -webkit-backdrop-filter: blur(12px) saturate(1.05);
  border: 1px solid rgba(255, 255, 255, 0.06);
  /* Layered premium shadow — tight contact + soft ambient drop. */
  box-shadow:
    0 1px 2px 0 rgba(0, 0, 0, 0.35),
    0 20px 48px -26px rgba(0, 0, 0, 0.85);
}

/* Expanded accordion sub-row — inset, slightly darker well with a top hairline. */
.expand-row > td {
  background: rgba(0, 0, 0, 0.28);
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.05);
}

.expand-content {
  padding: 12px 16px 16px 44px;
}

/* Header sits above rows with a hairline separator; sticky no-ops safely until
   a vertical scroll container is introduced. */
.partner-thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  box-shadow: inset 0 -1px 0 0 rgba(255, 255, 255, 0.08);
}

/* Keep sticky header cells opaque over their own header background. */
.partner-thead tr {
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
}

/* Visible thin horizontal scrollbar — the member table has many columns and
   must scroll sideways; a hidden scrollbar left no affordance for mouse users. */
.partner-x-scroll {
  scrollbar-width: thin;
  scrollbar-color: rgba(255, 255, 255, 0.28) transparent;
  overscroll-behavior-x: contain;
}

.partner-x-scroll::-webkit-scrollbar {
  height: 8px;
}

.partner-x-scroll::-webkit-scrollbar-track {
  background: transparent;
}

.partner-x-scroll::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.22);
  border-radius: 8px;
}

.partner-x-scroll::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.38);
}
</style>
