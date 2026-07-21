<template>
  <section
    class="ticker-card relative overflow-hidden rounded-xl border border-white/10 bg-black/70 backdrop-blur-sm shadow-lg"
  >
    <header
      class="flex items-center justify-between px-4 py-2.5 border-b border-white/10 bg-gradient-to-r from-[#FF6A00]/20 to-transparent"
    >
      <h3 class="text-sm font-semibold tracking-wide text-[#FF6A00] uppercase">
        {{ title }}
      </h3>
      <span
        v-if="status === 'live'"
        class="flex items-center gap-1.5 text-[10px] uppercase font-semibold text-emerald-400"
      >
        <span class="relative flex h-2 w-2">
          <span
            class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60"
          />
          <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
        </span>
        {{ $t("home.ticker.live") }}
      </span>
    </header>

    <div class="grid grid-cols-3 gap-2 px-3 py-2 text-[11px] uppercase tracking-wide text-white/50 border-b border-white/5">
      <span>{{ $t("home.ticker.no") }}</span>
      <span class="text-center">{{ $t("home.ticker.member") }}</span>
      <span class="text-right">{{ $t("home.ticker.amount") }}</span>
    </div>

    <div class="ticker-viewport" :style="{ height: viewportHeight }">
      <!-- Loading skeleton -->
      <div v-if="isLoading" class="px-3 py-2 space-y-2">
        <div
          v-for="i in 6"
          :key="i"
          class="grid grid-cols-3 gap-2 items-center"
        >
          <div class="h-4 rounded bg-white/10 animate-pulse" />
          <div class="h-4 rounded bg-white/10 animate-pulse" />
          <div class="h-4 rounded bg-white/10 animate-pulse" />
        </div>
      </div>

      <!-- Empty / error state (no API data and no fallback) -->
      <div
        v-else-if="displayRows.length === 0"
        class="flex h-full items-center justify-center text-sm text-white/50 px-3"
      >
        {{ $t("home.ticker.noData") }}
      </div>

      <!-- Populated ticker -->
      <ul
        v-else
        class="ticker-track"
        :style="trackStyle"
      >
        <li
          v-for="(row, i) in doubledRows"
          :key="i"
          class="grid grid-cols-3 items-center gap-2 px-3 py-2 text-sm text-white/90 border-b border-white/5"
        >
          <span class="text-[#FF6A00] font-semibold">
            {{ ((i % displayRows.length) + 1).toString().padStart(2, "0") }}
          </span>
          <span class="truncate text-center">{{ row.member }}</span>
          <span class="text-right font-semibold text-emerald-400 tabular-nums">
            {{ formatAmount(row.amount) }}
          </span>
        </li>
      </ul>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted } from "vue";
import type { TopTransactionRow } from "~~/utils/top-transactions-fallback";

type Props = {
  title: string;
  endpoint: string;
  cacheKey: string;
  visibleRows?: number;
};

const props = withDefaults(defineProps<Props>(), {
  visibleRows: 6,
});

type ApiResponse =
  | { code?: number; data?: TopTransactionRow[] }
  | TopTransactionRow[]
  | null
  | undefined;

const unwrap = (res: ApiResponse): TopTransactionRow[] => {
  if (Array.isArray(res)) return res;
  if (res && typeof res === "object" && Array.isArray(res.data)) return res.data;
  return [];
};

const api = useApi();
const currency = useCurrency();

const { data: apiRows, refresh } = await useAsyncData<TopTransactionRow[]>(
  props.cacheKey,
  async () => {
    const res = await api<ApiResponse>(props.endpoint).catch(
      () => null as ApiResponse,
    );
    return unwrap(res);
  },
  { default: (): TopTransactionRow[] => [] },
);

const isLoading = computed(() => apiRows.value == null);

const displayRows = computed<TopTransactionRow[]>(() => {
  return apiRows.value ?? [];
});

const status = computed<"live" | "loading">(() => {
  if (isLoading.value) return "loading";
  return "live";
});

// Render the rows twice so translateY(-50%) wraps seamlessly. We deliberately
// re-spread (not duplicate the array reference) so each <li> :key is unique.
const doubledRows = computed<TopTransactionRow[]>(() => [
  ...displayRows.value,
  ...displayRows.value,
]);

const ROW_HEIGHT_PX = 44; // ~ py-2 + text-sm line-height
const viewportHeight = computed(
  () => `${ROW_HEIGHT_PX * props.visibleRows}px`,
);

// Animation duration scales with row count so a long list isn't a blur and a
// short list isn't molasses. Clamped to a sensible band.
const animationDuration = computed(() => {
  const n = displayRows.value.length || 1;
  const seconds = Math.min(60, Math.max(20, n * 2.5));
  return `${seconds}s`;
});

const trackStyle = computed(() => ({
  animationDuration: animationDuration.value,
}));

const formatAmount = (value: string | number): string => {
  const num = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(num)) return String(value ?? "");
  return currency.format(num);
};

// Refresh every 60s on the client so the ticker stays roughly current between
// SSR cache windows. No-op on server.
let refreshTimer: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  if (typeof window === "undefined") return;
  refreshTimer = setInterval(() => {
    refresh();
  }, 60_000);
});
onBeforeUnmount(() => {
  if (refreshTimer) clearInterval(refreshTimer);
});
</script>

<style scoped>
.ticker-viewport {
  overflow: hidden;
  position: relative;
  mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 18px,
    #000 calc(100% - 18px),
    transparent 100%
  );
  -webkit-mask-image: linear-gradient(
    to bottom,
    transparent 0,
    #000 18px,
    #000 calc(100% - 18px),
    transparent 100%
  );
}

.ticker-track {
  margin: 0;
  padding: 0;
  list-style: none;
  animation-name: ticker-scroll;
  animation-timing-function: linear;
  animation-iteration-count: infinite;
  will-change: transform;
}

.ticker-card:hover .ticker-track {
  animation-play-state: paused;
}

@keyframes ticker-scroll {
  from {
    transform: translateY(0);
  }
  to {
    transform: translateY(-50%);
  }
}

@media (prefers-reduced-motion: reduce) {
  .ticker-track {
    animation: none !important;
    transform: none !important;
  }
}
</style>
