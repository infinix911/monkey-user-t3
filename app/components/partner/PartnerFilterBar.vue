<template>
  <!-- Shared partner search/filter toolbar — ports stargazer-high's
       search-container pattern: optional type+keyword, a date range, quick
       range buttons (Today / Last Week / 15 Days), and a Search button. -->
  <div class="flex flex-wrap items-center justify-end gap-2.5 mb-5">
    <!-- Page-specific controls (e.g. transaction-type / member select) -->
    <slot name="prepend" />

    <!-- Search type + keyword -->
    <select v-if="types && types.length" v-model="searchType" class="pf-ctl">
      <option v-for="o in types" :key="o.value" :value="o.value">{{ o.label }}</option>
    </select>
    <input v-if="(types && types.length) || searchable" v-model="keyword" type="text"
      :placeholder="placeholder || $t('partnerPages.members.searchPlaceholder')"
      class="pf-ctl pf-input" @keyup.enter="emitSearch">

    <!-- Date range picker (themed calendar popover + quick presets) -->
    <PartnerDateRange v-if="date" v-model:start="startValue" v-model:end="endValue" @change="emitSearch" />

    <!-- Search -->
    <button type="button" class="pf-search" :style="{ background: activeGradient, color: activeText }"
      @click="emitSearch">
      <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.2" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m21 21-5.197-5.197m0 0A7.5 7.5 0 1 0 5.196 5.196a7.5 7.5 0 0 0 10.607 10.607Z" />
      </svg>
      {{ $t('partnerPages.members.search') }}
    </button>

    <!-- Trailing controls (e.g. Add Sub Member) -->
    <slot name="append" />
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
defineProps<{
  /** When provided, renders a search-type select + keyword input. */
  types?: { value: string; label: string }[];
  /** Show a keyword input on its own (no type select). */
  searchable?: boolean;
  /** Keyword input placeholder. */
  placeholder?: string;
  /** Show the date range + quick range buttons. */
  date?: boolean;
}>();

const emit = defineEmits<{
  search: [{ searchType: string; keyword: string; start: string; end: string }];
}>();

const { activeGradient, activeText } = usePartnerTheme();

// Two-way bound so pages can live-filter on the keyword/type.
const searchType = defineModel<string>("searchType", { default: "" });
const keyword = defineModel<string>("keyword", { default: "" });

// Local-time YYYY-MM-DD (default range = this month to today).
const fmt = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const now = new Date();
const defaultStart = fmt(new Date(now.getFullYear(), now.getMonth(), 1));
const defaultEnd = fmt(now);
const start = defineModel<string>("start");
const end = defineModel<string>("end");
const startValue = computed({
  get: () => start.value || defaultStart,
  set: (value: string) => { start.value = value; },
});
const endValue = computed({
  get: () => end.value || defaultEnd,
  set: (value: string) => { end.value = value; },
});

const emitSearch = () =>
  emit("search", {
    searchType: searchType.value,
    keyword: keyword.value,
    start: startValue.value,
    end: endValue.value,
  });
</script>

<style scoped>
.pf-ctl {
  height: 38px;
  padding: 0 12px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
  color-scheme: dark;
  transition: border-color 0.2s ease;
}

.pf-ctl:focus {
  outline: none;
  border-color: var(--pb-accent, #ff7a00);
}

.pf-ctl::placeholder {
  color: rgba(255, 255, 255, 0.4);
}

.pf-ctl option {
  background: #111;
  color: #fff;
}

.pf-input {
  min-width: 180px;
  flex: 1 1 180px;
  max-width: 300px;
}

.pf-search {
  height: 38px;
  padding: 0 16px;
  border-radius: 9px;
  font-size: 13px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  white-space: nowrap;
  cursor: pointer;
  transition: filter 0.2s ease;
}

.pf-search:hover {
  filter: brightness(1.05);
}
</style>
