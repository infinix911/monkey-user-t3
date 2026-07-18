<template>
  <div class="relative">
    <!-- Trigger pill -->
    <button type="button" class="pdr-trigger" :class="open ? 'is-open' : ''" aria-haspopup="dialog"
      :aria-expanded="open" @click="toggle">
      <svg class="pdr-cal-ic" :style="{ color: accent }" fill="none" stroke="currentColor" stroke-width="1.7"
        viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round"
          d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0V11.25A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
      <span class="pdr-label tabular-nums">{{ start || '—' }}</span>
      <span class="pdr-dash">–</span>
      <span class="pdr-label tabular-nums">{{ end || '—' }}</span>
      <svg class="pdr-chev" :class="open ? 'rotate-180' : ''" fill="none" stroke="currentColor" stroke-width="2.4"
        viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
      </svg>
    </button>

    <!-- Popover -->
    <template v-if="open">
      <div class="fixed inset-0 z-[60]" @click="cancel" />
      <div class="pdr-pop" role="dialog" :style="{ '--pb-accent': accent }">
        <!-- Presets -->
        <div class="pdr-presets">
          <button v-for="p in presets" :key="p.key" type="button" class="pdr-preset"
            :class="isActivePreset(p.key) ? 'is-active' : ''"
            :style="isActivePreset(p.key) ? { background: activeGradient, color: activeText } : {}"
            @click="applyPreset(p.key)">
            {{ p.label }}
          </button>
        </div>

        <!-- Calendar -->
        <div class="pdr-cal">
          <div class="pdr-cal-head">
            <button type="button" class="pdr-nav" :aria-label="'prev'" @click="shiftMonth(-1)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="M15.75 19.5 8.25 12l7.5-7.5" />
              </svg>
            </button>
            <span class="pdr-month">{{ monthLabel }}</span>
            <button type="button" class="pdr-nav" :aria-label="'next'" @click="shiftMonth(1)">
              <svg class="w-4 h-4" fill="none" stroke="currentColor" stroke-width="2.4" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          <div class="pdr-weekdays">
            <span v-for="(w, i) in weekdays" :key="i" class="pdr-weekday">{{ w }}</span>
          </div>

          <div class="pdr-grid">
            <button v-for="cell in cells" :key="cell.iso" type="button" class="pdr-day"
              :class="[
                cell.other ? 'is-other' : '',
                cell.today ? 'is-today' : '',
                cell.selected ? 'is-selected' : '',
                cell.inRange ? 'is-inrange' : '',
                cell.rangeStart ? 'is-start' : '',
                cell.rangeEnd ? 'is-end' : '',
              ]"
              :style="cell.selected ? { background: activeGradient, color: activeText } : {}"
              @click="pick(cell.iso)">
              {{ cell.day }}
            </button>
          </div>

          <!-- Footer -->
          <div class="pdr-foot">
            <button type="button" class="pdr-clear" @click="clear">{{ $t('partnerPages.filters.clear') }}</button>
            <button type="button" class="pdr-apply" :style="{ background: activeGradient, color: activeText }"
              @click="apply">
              {{ $t('partnerPages.filters.apply') }}
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";

const start = defineModel<string>("start", { default: "" });
const end = defineModel<string>("end", { default: "" });
const emit = defineEmits<{ change: [{ start: string; end: string }] }>();

const { t, locale } = useI18n();
const { accent, activeGradient, activeText } = usePartnerTheme();

// --- Local date helpers (avoid UTC drift from toISOString). ---
const fmt = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parse = (s: string): Date | null => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  return y && m && d ? new Date(y, m - 1, d) : null;
};
const todayIso = fmt(new Date());

const open = ref(false);

// Draft range while the popover is open; committed to the models on Apply.
const draftStart = ref("");
const draftEnd = ref("");

// Calendar view month (first of month currently shown).
const viewMonth = ref(new Date());

const toggle = () => (open.value ? cancel() : openPop());
const openPop = () => {
  draftStart.value = start.value;
  draftEnd.value = end.value;
  const seed = parse(start.value) ?? new Date();
  viewMonth.value = new Date(seed.getFullYear(), seed.getMonth(), 1);
  open.value = true;
};
const cancel = () => { open.value = false; };

const shiftMonth = (delta: number) => {
  viewMonth.value = new Date(viewMonth.value.getFullYear(), viewMonth.value.getMonth() + delta, 1);
};

const monthLabel = computed(() =>
  new Intl.DateTimeFormat(locale.value, { month: "long", year: "numeric" }).format(viewMonth.value),
);

const weekdays = computed(() => {
  const f = new Intl.DateTimeFormat(locale.value, { weekday: "short" });
  // 2023-01-01 was a Sunday.
  return Array.from({ length: 7 }, (_, i) => f.format(new Date(2023, 0, 1 + i)));
});

/** 6×7 grid of days covering the visible month plus leading/trailing days. */
const cells = computed(() => {
  const y = viewMonth.value.getFullYear();
  const m = viewMonth.value.getMonth();
  const first = new Date(y, m, 1);
  const gridStart = new Date(y, m, 1 - first.getDay());
  const s = draftStart.value;
  const e = draftEnd.value;
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i);
    const iso = fmt(d);
    const inMonth = d.getMonth() === m;
    const isStart = !!s && iso === s;
    const isEnd = !!e && iso === e;
    const inRange = !!s && !!e && iso > s && iso < e;
    return {
      iso,
      day: d.getDate(),
      other: !inMonth,
      today: iso === todayIso,
      selected: isStart || isEnd,
      rangeStart: isStart && !!e,
      rangeEnd: isEnd,
      inRange,
    };
  });
});

/** Range selection: first pick sets start; second sets end (swaps if earlier). */
const pick = (iso: string) => {
  if (!draftStart.value || (draftStart.value && draftEnd.value)) {
    draftStart.value = iso;
    draftEnd.value = "";
  } else if (iso < draftStart.value) {
    draftEnd.value = draftStart.value;
    draftStart.value = iso;
  } else {
    draftEnd.value = iso;
  }
};

const clear = () => { draftStart.value = ""; draftEnd.value = ""; };

const commit = (s: string, e: string) => {
  start.value = s;
  end.value = e;
  emit("change", { start: s, end: e });
  open.value = false;
};
const apply = () => commit(draftStart.value, draftEnd.value || draftStart.value);

// --- Presets ---
const presets = computed(() => [
  { key: "today", label: t("partnerPages.filters.today") },
  { key: "yesterday", label: t("partnerPages.filters.yesterday") },
  { key: "lastWeek", label: t("partnerPages.filters.lastWeek") },
  { key: "fifteenDays", label: t("partnerPages.filters.fifteenDays") },
  { key: "thisMonth", label: t("partnerPages.filters.thisMonth") },
  { key: "lastMonth", label: t("partnerPages.filters.lastMonth") },
]);

/** Resolve a preset key to a [start, end] ISO pair. */
const presetRange = (key: string): [string, string] => {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const daysAgo = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };
  switch (key) {
    case "today": return [todayIso, todayIso];
    case "yesterday": return [fmt(daysAgo(1)), fmt(daysAgo(1))];
    case "lastWeek": return [fmt(daysAgo(6)), todayIso];
    case "fifteenDays": return [fmt(daysAgo(14)), todayIso];
    case "thisMonth": return [fmt(new Date(y, m, 1)), todayIso];
    case "lastMonth": return [fmt(new Date(y, m - 1, 1)), fmt(new Date(y, m, 0))];
    default: return [todayIso, todayIso];
  }
};

const applyPreset = (key: string) => {
  const [s, e] = presetRange(key);
  const seed = parse(s) ?? new Date();
  viewMonth.value = new Date(seed.getFullYear(), seed.getMonth(), 1);
  commit(s, e);
};

const isActivePreset = (key: string): boolean => {
  const [s, e] = presetRange(key);
  return draftStart.value === s && (draftEnd.value || draftStart.value) === e;
};
</script>

<style scoped>
/* Trigger pill — matches the toolbar control height/rounding. */
.pdr-trigger {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 38px;
  padding: 0 12px;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color 0.2s ease, background-color 0.2s ease;
}

.pdr-trigger:hover {
  background: rgba(255, 255, 255, 0.06);
}

.pdr-trigger.is-open {
  border-color: var(--pb-accent, #ff7a00);
}

.pdr-cal-ic {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.pdr-dash {
  color: rgba(255, 255, 255, 0.3);
}

.pdr-chev {
  width: 13px;
  height: 13px;
  color: rgba(255, 255, 255, 0.5);
  transition: transform 0.2s ease;
  margin-left: 2px;
}

/* Popover */
.pdr-pop {
  position: absolute;
  right: 0;
  top: calc(100% + 8px);
  z-index: 70;
  display: flex;
  background: #101013;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 14px;
  box-shadow: 0 24px 60px -18px rgba(0, 0, 0, 0.85);
  overflow: hidden;
}

.pdr-presets {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px;
  border-right: 1px solid rgba(255, 255, 255, 0.07);
  background: rgba(255, 255, 255, 0.015);
}

.pdr-preset {
  min-width: 104px;
  text-align: left;
  padding: 7px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.7);
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.pdr-preset:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.pdr-cal {
  padding: 12px;
  width: 264px;
}

.pdr-cal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.pdr-month {
  font-size: 13px;
  font-weight: 700;
  color: #fff;
}

.pdr-nav {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  color: rgba(255, 255, 255, 0.7);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}

.pdr-nav:hover {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
}

.pdr-weekdays,
.pdr-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
}

.pdr-weekday {
  text-align: center;
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.35);
  padding-bottom: 6px;
}

.pdr-day {
  position: relative;
  height: 32px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.82);
  border-radius: 8px;
  cursor: pointer;
  transition: background-color 0.12s ease, color 0.12s ease;
}

.pdr-day:hover {
  background: rgba(255, 255, 255, 0.08);
}

.pdr-day.is-other {
  color: rgba(255, 255, 255, 0.25);
}

.pdr-day.is-today {
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.25);
}

/* In-range days get a subtle accent wash; endpoints are filled (inline). */
.pdr-day.is-inrange {
  background: color-mix(in srgb, var(--pb-accent, #ff7a00) 18%, transparent);
  border-radius: 0;
  color: #fff;
}

.pdr-day.is-start {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.pdr-day.is-end {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
}

.pdr-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.07);
}

.pdr-clear {
  font-size: 12px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.55);
  padding: 6px 10px;
  border-radius: 8px;
  cursor: pointer;
  transition: color 0.15s ease, background-color 0.15s ease;
}

.pdr-clear:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

.pdr-apply {
  font-size: 12px;
  font-weight: 700;
  padding: 7px 18px;
  border-radius: 8px;
  cursor: pointer;
  transition: filter 0.15s ease;
}

.pdr-apply:hover {
  filter: brightness(1.05);
}

.pdr-preset.is-active {
  color: #fff;
}
</style>
