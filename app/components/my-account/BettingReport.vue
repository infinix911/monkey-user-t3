<template>
  <div :class="['pt-2  h-full flex flex-col min-h-0', className]">
    <!-- Filter Controls -->
    <div class="mb-6 flex flex-col gap-3">
      <!-- Date Row -->
      <div class="flex flex-col gap-1 w-full">
        <label class="tm-muted font-medium text-[10px] md:text-xs whitespace-nowrap">
          {{ t("bettingReport.date") }}
        </label>
        <div class="flex gap-2 items-center w-full">
          <input
            v-model="dateFrom" type="date" :disabled="loading"
            class="tm-field flex-1 min-w-0 px-2 py-1.5 text-xs md:text-sm">
          <span class="text-white text-sm">-</span>
          <input
            v-model="dateTo" type="date" :disabled="loading" :min="minToDate"
            class="tm-field flex-1 min-w-0 px-2 py-1.5 text-xs md:text-sm">
        </div>
      </div>

      <!-- Time Row -->
      <div class="flex flex-col gap-1 w-full">
        <label class="tm-muted font-medium text-[10px] md:text-xs whitespace-nowrap">
          {{ t("bettingReport.time") }}
        </label>
        <div class="flex gap-2 items-center w-full">
          <UiTimePicker v-model="timeFrom" :disabled="loading" />
          <span class="text-white text-sm">-</span>
          <UiTimePicker v-model="timeTo" :disabled="loading" :min-time="endMinTime" />
        </div>
        <span v-if="dateError" class="text-red-400 text-xs">{{
          dateError
        }}</span>
      </div>

      <!-- Type & Provider Row -->
      <div class="flex gap-2 w-full">
        <!-- Game Type -->
        <div class="flex flex-col gap-1 flex-1 min-w-0">
          <label class="tm-muted font-medium text-[10px] md:text-xs whitespace-nowrap">
            {{ t("bettingReport.gameType") }}
          </label>
          <div class="relative w-full">
            <select
              v-model="gameType" :disabled="loading"
              class="tm-field w-full px-2 py-1.5 appearance-none pr-7 text-xs md:text-sm"
              style="font-family: var(--font-line-seed)">
              <option value="all">{{ t("bettingReport.all") }}</option>
              <option value="casino">{{ t("bettingReport.casino") }}</option>
              <option value="slot">{{ t("bettingReport.slot") }}</option>
              <option value="sport">{{ t("bettingReport.sport") }}</option>
              <option value="mini">{{ t("bettingReport.mini") }}</option>
            </select>
            <svg
              class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
        <!-- Provider -->
        <div class="flex flex-col gap-1 flex-1 min-w-0">
          <label class="tm-muted font-medium text-[10px] md:text-xs whitespace-nowrap">
            {{ t("bettingReport.provider") }}
          </label>
          <div class="relative w-full">
            <select
              v-model="provider" :disabled="loading || loadingProviders || gameType === 'all'"
              class="tm-field w-full px-2 py-1.5 appearance-none pr-7 text-xs md:text-sm"
              style="font-family: var(--font-line-seed)">
              <option value="">{{ t("bettingReport.allProviders") }}</option>
              <option v-for="lobby in providers" :key="lobby.id" :value="lobby.game_name">
                {{ lobby.game_name }}
              </option>
            </select>
            <svg
              class="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-white pointer-events-none" fill="none"
              viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <!-- Search button -->
      <button
        :disabled="loading"
        class="tm-btn rounded-lg font-bold px-3 py-1.5 transition-colors w-full text-xs md:text-sm"
        @click="handleSearch">
        {{ t("bettingReport.search") }}
      </button>
    </div>

    <!-- Table Section -->
    <!-- The shared table shell. flex-1 + min-h-0 keeps it the ONLY scroll
         region, so the modal panel never needs a second scrollbar. -->
    <AppTable
      :columns="columns" :rows="betHistories as unknown as Record<string, unknown>[]" :loading="loading" :error="error"
      :loading-text="t('bettingReport.loading')" :empty-text="t('bettingReport.noData')"
      class="mb-6">
      <template #row="{ row }">
        <td class="whitespace-nowrap"><TableDateCell :value="String(row.created_at ?? '')" /></td>
        <td v-if="showTypeColumn" class="whitespace-nowrap">{{ typeLabel(row.game_type as string) }}</td>
        <td class="whitespace-nowrap">{{ row.game_name }}</td>
        <td class="whitespace-nowrap">{{ row.game_room }}</td>
        <td class="whitespace-nowrap">{{ formatNumber(row.bet_amount as number) }}</td>
        <td class="whitespace-nowrap">{{ formatNumber(row.win_amount as number) }}</td>
        <td class="whitespace-nowrap">{{ formatNumber(row.auto_deducted_amount as number) }}</td>
        <td :class="winLossClass(Number(row.win_amount) - Number(row.bet_amount))">
          {{ formatNumber(Number(row.win_amount) - Number(row.bet_amount)) }}
        </td>
      </template>

      <template #footer>
        <td :colspan="showTypeColumn ? 4 : 3" class="font-semibold">{{ t("bettingReport.total") }}</td>
        <td class="whitespace-nowrap">{{ totals.betAmount }}</td>
        <td class="whitespace-nowrap">{{ totals.winAmount }}</td>
        <td class="whitespace-nowrap">—</td>
        <td :class="winLossClass(Number(summary?.net_amount ?? 0))">{{ totals.winLoss }}</td>
      </template>
    </AppTable>
    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="flex justify-center gap-3 lg:gap-2">
      <button
        v-for="page in totalPages" :key="page" :disabled="loading" :class="[
        'transition-colors text-sm lg:text-base cursor-pointer',
        currentPage === page
          ? 'tm-btn font-semibold px-3 py-1 rounded'
          : 'tm-card tm-muted hover:text-white px-3 py-1 rounded',
        loading ? 'opacity-50 cursor-not-allowed' : '',
      ]" style="font-family: var(--font-line-seed)" @click="handlePageChange(page)">
        {{ page }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import { formatDateAsISO } from "~/lib/date";
import { formatNumber } from "~/lib/formatter";

// One row per individual bet (realtime, from /games/bet-histories).

const _props = defineProps<{
  className?: string;
}>();

const { t } = useI18n();

// Date filter state (using string values for native date inputs)
const today = new Date();
const twoMonthsAgo = new Date(today.getTime() - 60 * 24 * 60 * 60 * 1000);
const dateFrom = ref(formatDateAsISO(twoMonthsAgo));
const dateTo = ref(formatDateAsISO(today));
const timeFrom = ref("00:00");
const timeTo = ref("23:59");

// Date validation
const dateError = ref<string | null>(null);

const minToDate = computed(() => dateFrom.value);

const endMinTime = computed(() =>
  dateFrom.value === dateTo.value ? timeFrom.value : undefined,
);

function validateDates(): boolean {
  dateError.value = null;

  if (dateTo.value < dateFrom.value) {
    dateError.value = t("bettingReport.errorToDateMustBeAfterFromDate");
    return false;
  }
  if (dateTo.value === dateFrom.value && timeTo.value < timeFrom.value) {
    dateError.value = t("bettingReport.errorToDateMustBeAfterFromDate");
    return false;
  }
  return true;
}

watch(dateFrom, () => {
  validateDates();
});

watch(dateTo, () => {
  validateDates();
});

watch([timeFrom, timeTo], () => {
  validateDates();
});

// Data state
const currentPage = ref(1);
const gameType = ref("casino");
const provider = ref("");
// Tracks the game type the currently displayed rows were fetched with, so the
// Type column shows/hides in sync with the data (not the live dropdown, which
// may change before the next search).
const recordsStore = useMemberRecordsStore();
const reportKey = computed(() => {
  const params = { startDate: `${dateFrom.value} ${timeFrom.value}`, endDate: `${dateTo.value} ${timeTo.value}`, gameType: gameType.value, provider: provider.value, page: currentPage.value, limit: 25 };
  return `betting:${Object.entries(params).filter(([, value]) => value !== undefined && value !== "").sort(([a], [b]) => a.localeCompare(b)).map(([name, value]) => `${name}=${encodeURIComponent(String(value))}`).join("&")}`;
});
const reportEntry = computed(() => recordsStore.bettingReports[reportKey.value]);
const betHistories = computed(() => reportEntry.value?.data?.data ?? []);
const totalPages = computed(() => reportEntry.value?.data?.pages ?? 0);
const loading = computed(() => !reportEntry.value || reportEntry.value.status === "loading");
const error = computed(() => reportEntry.value?.status === "error" ? t("bettingReport.error") : null);
const summary = computed(() => reportEntry.value?.data?.summary ?? null);
const loadedGameType = computed(() => reportEntry.value?.data?.loadedGameType ?? gameType.value);
const showTypeColumn = computed(() => loadedGameType.value === "all");

/**
 * Header labels in column order. Game Type only appears in the aggregated `all`
 * view, so it is spliced in conditionally — the `row` slot applies the same
 * condition, and the footer's colspan shifts with it.
 */
const columns = computed(() => [
  t("bettingReport.date"),
  ...(showTypeColumn.value ? [t("bettingReport.gameType")] : []),
  t("bettingReport.game"),
  t("bettingReport.room"),
  t("bettingReport.betAmount"),
  t("bettingReport.winAmount"),
  t("bettingReport.autoDeductedAmount"),
  t("bettingReport.winLoss"),
]);

// Localised label for a row's game type in the aggregated `all` view.
function typeLabel(type?: string): string {
  if (!type) return "";
  const key = `bettingReport.${type}`;
  const label = t(key);
  return label === key ? type : label;
}
const providerKey = computed(() => `providers:gameType=${encodeURIComponent(gameType.value)}`);
const providerEntry = computed(() => recordsStore.providerLobbies[providerKey.value]);
const providers = computed(() => providerEntry.value?.data ?? []);
const loadingProviders = computed(() => providerEntry.value?.status === "loading");

// Green for a net win (positive), red for a net loss (negative), neutral at zero.
function winLossClass(value: number): string {
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-white/85";
}

// Computed totals
const totals = computed(() => {
  if (summary.value) {
    return {
      betAmount: formatNumber(summary.value.bet_amount),
      winAmount: formatNumber(summary.value.win_amount),
      winLoss: formatNumber(summary.value.net_amount),
    };
  }
  return { betAmount: "0", winAmount: "0", winLoss: "0" };
});

// Fetch providers
async function fetchProviders(type: string) {
  provider.value = "";
  await recordsStore.loadProviderLobbies(type);
}

// Fetch bet histories. The API only accepts a concrete game type, so the
// aggregate UI view combines the three supported endpoint responses locally.
async function fetchBetHistories(page: number = 1) {
  currentPage.value = page;
  await recordsStore.loadBettingReport({
    startDate: `${dateFrom.value} ${timeFrom.value}`,
    endDate: `${dateTo.value} ${timeTo.value}`,
    gameType: gameType.value,
    provider: provider.value,
    page,
    limit: 25,
  });
}

function handleSearch() {
  if (!validateDates()) return;
  fetchBetHistories(1);
}

function handlePageChange(page: number) {
  fetchBetHistories(page);
}

// Watch gameType to re-fetch providers. `all` has no per-type provider list,
// so clear the dropdown instead of querying lobbies for a non-existent type.
watch(gameType, (newType) => {
  if (newType === "all") {
    provider.value = "";
    return;
  }
  fetchProviders(newType);
});

onMounted(() => {
  fetchBetHistories(1);
  if (gameType.value !== "all") fetchProviders(gameType.value);
});
</script>

<style scoped>
/* Keep the header row visible while the body scrolls vertically. The band has
   to be repeated on the cells (a sticky <th> paints its own background, not the
   row's), so it mirrors `.tm-thead` rather than hardcoding a colour. */
thead th {
  position: sticky;
  top: 0;
  z-index: 20;
  background: color-mix(in srgb, var(--tm-accent) 12%, var(--body-bg));
}
</style>
