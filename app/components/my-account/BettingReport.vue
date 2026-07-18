<template>
  <div :class="['pt-2  h-full flex flex-col min-h-0', className]">
    <!-- Filter Controls -->
    <div class="mb-6 flex flex-col gap-3">
      <!-- Date Row -->
      <div class="flex flex-col gap-1 w-full">
        <label class="font-medium text-gray-400 text-[10px] md:text-xs whitespace-nowrap">
          {{ t("bettingReport.date") }}
        </label>
        <div class="flex gap-2 items-center w-full">
          <input
            v-model="dateFrom" type="date" :disabled="loading"
            class="flex-1 min-w-0 px-2 py-1.5 text-white text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style="background: #505050; border-radius: 2.349px">
          <span class="text-white text-sm">-</span>
          <input
            v-model="dateTo" type="date" :disabled="loading" :min="minToDate"
            class="flex-1 min-w-0 px-2 py-1.5 text-white text-xs md:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            style="background: #505050; border-radius: 2.349px">
        </div>
      </div>

      <!-- Time Row -->
      <div class="flex flex-col gap-1 w-full">
        <label class="font-medium text-gray-400 text-[10px] md:text-xs whitespace-nowrap">
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
          <label class="font-medium text-gray-400 text-[10px] md:text-xs whitespace-nowrap">
            {{ t("bettingReport.gameType") }}
          </label>
          <div class="relative w-full">
            <select
              v-model="gameType" :disabled="loading"
              class="w-full px-2 py-1.5 text-white appearance-none pr-7 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
              style="
                font-family: var(--font-line-seed);
                border-radius: 2.349px;
                background: #505050;
                box-shadow: 0 1.566px 1.566px 0 rgba(0, 0, 0, 0.5);
              ">
              <option value="all">{{ t("bettingReport.all") }}</option>
              <option value="casino">{{ t("bettingReport.casino") }}</option>
              <option value="slot">{{ t("bettingReport.slot") }}</option>
              <option value="mini">Mini</option>
              <option value="sport">{{ t("bettingReport.sport") }}</option>
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
          <label class="font-medium text-gray-400 text-[10px] md:text-xs whitespace-nowrap">
            {{ t("bettingReport.provider") }}
          </label>
          <div class="relative w-full">
            <select
              v-model="provider" :disabled="loading || loadingProviders || gameType === 'all'"
              class="w-full px-2 py-1.5 text-white appearance-none pr-7 disabled:opacity-50 disabled:cursor-not-allowed text-xs md:text-sm"
              style="
                font-family: var(--font-line-seed);
                border-radius: 2.349px;
                background: #505050;
                box-shadow: 0 1.566px 1.566px 0 rgba(0, 0, 0, 0.5);
              ">
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
        class="font-medium bg-[#FFE100] hover:bg-[#e6cc00] disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold px-3 py-1.5 transition-colors w-full text-xs md:text-sm"
        style="border-radius: 2.349px" @click="handleSearch">
        {{ t("bettingReport.search") }}
      </button>
    </div>

    <!-- Table Section -->
    <!-- flex-1 + min-h-0 makes this the ONLY scroll region: it fills the
         space left by the filters/pagination so the modal panel itself never
         needs a second scrollbar. min-w-0 lets it shrink horizontally too. -->
    <div class="bg-gray-700 overflow-hidden mb-6 min-w-0 flex-1 min-h-0">
      <!-- Single scroll viewport for BOTH axes: scrollbars stay on the table. -->
      <div class="overflow-auto h-full">
        <table class="w-full lg:min-w-max">
          <thead>
            <tr style="background-color: #161616">
              <th
                class="px-1 py-1.5 text-center text-white font-semibold text-[11px] lg:text-sm leading-tight whitespace-normal lg:whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ t("bettingReport.date") }}
              </th>
              <th
                v-if="showTypeColumn"
                class="px-1 py-1.5 text-center text-white font-semibold text-[11px] lg:text-sm leading-tight whitespace-normal lg:whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ t("bettingReport.gameType") }}
              </th>
              <th
                class="px-1 py-1.5 text-center text-white font-semibold text-[11px] lg:text-sm leading-tight whitespace-normal lg:whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ t("bettingReport.game") }}
              </th>
              <th
                class="px-1 py-1.5 text-center text-white font-semibold text-[11px] lg:text-sm leading-tight whitespace-normal lg:whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ t("bettingReport.room") }}
              </th>
              <th
                class="px-1 py-1.5 text-center text-white font-semibold text-[11px] lg:text-sm leading-tight whitespace-normal lg:whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ t("bettingReport.betAmount") }}
              </th>
              <th
                class="px-1 py-1.5 text-center text-white font-semibold text-[11px] lg:text-sm leading-tight whitespace-normal lg:whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ t("bettingReport.winAmount") }}
              </th>
              <th
                class="px-1 py-1.5 text-center text-white font-semibold text-[11px] lg:text-sm leading-tight whitespace-normal lg:whitespace-nowrap"
                style="font-family: var(--font-line-seed)">
                {{ t("bettingReport.winLoss") }}
              </th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="showTypeColumn ? 7 : 6" class="px-2 py-8 text-center" style="background-color: #505050">
                <span class="text-white" style="font-family: var(--font-line-seed)">{{ t("bettingReport.loading")
                }}</span>
              </td>
            </tr>
            <tr v-else-if="error">
              <td :colspan="showTypeColumn ? 7 : 6" class="px-2 py-8 text-center" style="background-color: #505050">
                <span class="text-red-400" style="font-family: var(--font-line-seed)">{{ error }}</span>
              </td>
            </tr>
            <tr v-else-if="betHistories.length === 0">
              <td :colspan="showTypeColumn ? 7 : 6" class="px-2 py-8 text-center" style="background-color: #505050">
                <span class="text-gray-400" style="font-family: var(--font-line-seed)">{{ t("bettingReport.noData")
                }}</span>
              </td>
            </tr>
            <template v-else>
              <tr
                v-for="(row, index) in betHistories" :key="index" class="border-b last:border-b-0"
                style="background-color: #505050; border-color: #7a7a7a">
                <td
                  class="px-1 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                  style="font-family: var(--font-line-seed)">
                  <div>{{ row.created_at.split(" ")[0] }}</div>
                  <div class="text-[10px] text-gray-400">
                    {{ row.created_at.split(" ")[1] }}
                  </div>
                </td>
                <td
                  v-if="showTypeColumn"
                  class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                  style="font-family: var(--font-line-seed)">
                  {{ typeLabel(row.game_type) }}
                </td>
                <td
                  class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                  style="font-family: var(--font-line-seed)">
                  {{ row.game_name }}
                </td>
                <td
                  class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                  style="font-family: var(--font-line-seed)">
                  {{ row.game_room }}
                </td>
                <td
                  class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                  style="font-family: var(--font-line-seed)">
                  {{ formatNumber(row.bet_amount) }}
                </td>
                <td
                  class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                  style="font-family: var(--font-line-seed)">
                  {{ formatNumber(row.win_amount) }}
                </td>
                <td
                  class="px-1 py-1.5 text-center text-xs lg:text-sm"
                  :class="winLossClass(Number(row.win_amount) - Number(row.bet_amount))"
                  style="font-family: var(--font-line-seed)">
                  {{ formatNumber(Number(row.win_amount) - Number(row.bet_amount)) }}
                </td>
              </tr>
              <!-- Total Row -->
              <tr style="background-color: #505050">
                <td
                  :colspan="showTypeColumn ? 4 : 3" class="px-1 py-1.5 text-center text-[#e2e2e2] font-semibold text-xs lg:text-sm"
                  style="font-family: var(--font-line-seed)">
                  {{ t("bettingReport.total") }}
                </td>
                <td
                  class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                  style="font-family: var(--font-line-seed)">
                  {{ totals.betAmount }}
                </td>
                <td
                  class="px-2 py-1.5 text-center text-[#e2e2e2] text-xs lg:text-sm whitespace-nowrap"
                  style="font-family: var(--font-line-seed)">
                  {{ totals.winAmount }}
                </td>
                <td
                  class="px-1 py-1.5 text-center text-xs lg:text-sm"
                  :class="winLossClass(Number(summary?.net_amount ?? 0))" style="font-family: var(--font-line-seed)">
                  {{ totals.winLoss }}
                </td>
              </tr>
            </template>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Pagination -->
    <div v-if="!loading && totalPages > 1" class="flex justify-center gap-3 lg:gap-2">
      <button
        v-for="page in totalPages" :key="page" :disabled="loading" :class="[
        'transition-colors text-sm lg:text-base lg:px-3 lg:py-1 lg:rounded',
        currentPage === page
          ? 'text-[#ffe100] font-bold lg:bg-[#ffe100] lg:text-gray-800 lg:font-semibold'
          : 'text-gray-400 hover:text-white lg:bg-gray-600 lg:text-white lg:hover:bg-gray-500',
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
import { useApi } from "@/composables/useApi";
import { formatDateAsISO } from "~/lib/date";
import { formatNumber } from "~/lib/formatter";

// One row per individual bet (realtime, from /games/bet-histories).
interface IBetHistoryRow {
  id: number;
  // Present only on the aggregated `all` response — labels each row's game type.
  game_type?: string;
  game_provider: string;
  game_name: string;
  game_room: string;
  bet_amount: string;
  win_amount: string;
  bet_result: string;
  status: number;
  created_at: string;
}

interface IBetHistory {
  pages: number;
  rows: number;
  data: IBetHistoryRow[];
  summary: {
    bet_amount: string;
    win_amount: string;
    roll_amount: string;
    net_amount: string;
  };
}

interface ILobby {
  id: number;
  game_provider: string;
  game_type: string;
  game_name: string;
  has_sub_game: boolean;
  sort: number;
  is_active: boolean;
}

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
const betHistories = ref<IBetHistoryRow[]>([]);
const totalPages = ref(0);
const totalRows = ref(0);
const loading = ref(true);
const error = ref<string | null>(null);
const summary = ref<{
  bet_amount: string;
  win_amount: string;
  roll_amount: string;
  net_amount: string;
} | null>(null);
const currentPage = ref(1);
const gameType = ref("all");
// Tracks the game type the currently displayed rows were fetched with, so the
// Type column shows/hides in sync with the data (not the live dropdown, which
// may change before the next search).
const loadedGameType = ref(gameType.value);
const showTypeColumn = computed(() => loadedGameType.value === "all");
const provider = ref("");

// Localised label for a row's game type in the aggregated `all` view.
function typeLabel(type?: string): string {
  if (!type) return "";
  const key = `bettingReport.${type}`;
  const label = t(key);
  return label === key ? type : label;
}
const providers = ref<ILobby[]>([]);
const loadingProviders = ref(false);

// Green for a net win (positive), red for a net loss (negative), neutral at zero.
function winLossClass(value: number): string {
  if (value > 0) return "text-green-400";
  if (value < 0) return "text-red-400";
  return "text-[#e2e2e2]";
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
  try {
    loadingProviders.value = true;
    const api = useApi();
    providers.value =
      (await api<ILobby[]>(`/games/lobbies?game_type=${type}`)) || [];
    provider.value = "";
  } catch (err) {
    console.error("Failed to fetch providers:", err);
    providers.value = [];
  } finally {
    loadingProviders.value = false;
  }
}

// Fetch bet histories
async function fetchBetHistories(page: number = 1) {
  try {
    loading.value = true;
    error.value = null;

    const params = new URLSearchParams({
      start_date: `${dateFrom.value} ${timeFrom.value}`,
      end_date: `${dateTo.value} ${timeTo.value}`,
      page: String(page),
      limit: "25",
    });

    if (provider.value) {
      params.append("game_name", provider.value);
    }

    const typeForRequest = gameType.value;
    const api = useApi();
    const data = await api<IBetHistory>(
      `/games/bet-histories/${typeForRequest}?${params.toString()}`,
    );
    betHistories.value = data.data || [];
    totalPages.value = data.pages || 0;
    totalRows.value = data.rows || 0;
    summary.value = data.summary || null;
    currentPage.value = page;
    loadedGameType.value = typeForRequest;
  } catch (err) {
    console.error("Failed to fetch bet histories:", err);
    error.value = t("bettingReport.error");
    betHistories.value = [];
  } finally {
    loading.value = false;
  }
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
    providers.value = [];
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
/* Keep the header row visible while the body scrolls vertically. */
thead th {
  position: sticky;
  top: 0;
  z-index: 20;
  background-color: #161616;
}
</style>
