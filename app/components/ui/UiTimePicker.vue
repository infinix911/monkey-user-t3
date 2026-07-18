<template>
  <div ref="rootRef" class="relative w-full">
    <button
      type="button"
      :disabled="disabled"
      :aria-expanded="open"
      :class="[
        'group w-full px-3 py-1.5 flex items-center justify-center gap-1.5',
        'text-white text-xs md:text-sm tabular-nums',
        'transition-colors duration-150',
        'hover:bg-[#5a5a5a] focus:outline-none focus:ring-1 focus:ring-[#FFE100]/50',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-[#505050]',
      ]"
      style="background: #505050; border-radius: 2.349px"
      @click="toggle"
    >
      <svg
        class="w-3.5 h-3.5 text-gray-300 group-hover:text-white transition-colors"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        stroke-linejoin="round"
      >
        <circle cx="12" cy="12" r="9" />
        <polyline points="12 7 12 12 15 14" />
      </svg>
      <span>{{ displayValue }}</span>
    </button>

    <transition
      enter-active-class="transition ease-out duration-150"
      enter-from-class="opacity-0 -translate-y-1 scale-[0.98]"
      enter-to-class="opacity-100 translate-y-0 scale-100"
      leave-active-class="transition ease-in duration-100"
      leave-from-class="opacity-100"
      leave-to-class="opacity-0"
    >
      <div
        v-if="open"
        class="absolute left-0 right-0 top-full mt-1.5 z-20 overflow-hidden rounded-md shadow-2xl border border-[#3a3a3a] origin-top"
        style="background: #1f1f1f"
      >
        <div
          class="flex items-center justify-between px-3 py-1.5 border-b border-[#3a3a3a]"
          style="background: #161616"
        >
          <span
            class="text-[10px] uppercase tracking-wider text-gray-500 font-semibold"
          >
            Hour
          </span>
          <span class="text-[#FFE100] text-xs font-bold tabular-nums">
            {{ displayValue }}
          </span>
          <span
            class="text-[10px] uppercase tracking-wider text-gray-500 font-semibold"
          >
            Min
          </span>
        </div>

        <div class="flex">
          <div
            ref="hourListRef"
            class="flex-1 overflow-y-auto max-h-48 py-1.5 time-picker-scroll"
          >
            <button
              v-for="h in hourOptions"
              :key="`h-${h}`"
              type="button"
              :data-value="h"
              :disabled="isHourDisabled(h)"
              :class="[
                'block w-full mx-auto px-3 py-1.5 text-center text-sm tabular-nums',
                'transition-colors duration-100',
                isHourDisabled(h)
                  ? 'text-gray-600 cursor-not-allowed'
                  : selectedHour === h
                    ? 'text-[#FFE100] font-bold'
                    : 'text-gray-300 hover:text-white hover:bg-[#2a2a2a]',
              ]"
              @click="selectHour(h)"
            >
              {{ h }}
            </button>
          </div>
          <div class="w-px" style="background: #3a3a3a" />
          <div
            ref="minuteListRef"
            class="flex-1 overflow-y-auto max-h-48 py-1.5 time-picker-scroll"
          >
            <button
              v-for="m in minuteOptions"
              :key="`m-${m}`"
              type="button"
              :data-value="m"
              :disabled="isMinuteDisabled(m)"
              :class="[
                'block w-full mx-auto px-3 py-1.5 text-center text-sm tabular-nums',
                'transition-colors duration-100',
                isMinuteDisabled(m)
                  ? 'text-gray-600 cursor-not-allowed'
                  : selectedMinute === m
                    ? 'text-[#FFE100] font-bold'
                    : 'text-gray-300 hover:text-white hover:bg-[#2a2a2a]',
              ]"
              @click="selectMinute(m)"
            >
              {{ m }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount, nextTick } from "vue";

const props = withDefaults(
  defineProps<{
    modelValue: string;
    disabled?: boolean;
    minTime?: string;
  }>(),
  { disabled: false, minTime: undefined },
);

const emit = defineEmits<{
  (e: "update:modelValue", value: string): void;
}>();

const hourOptions = Array.from({ length: 24 }, (_, i) =>
  String(i).padStart(2, "0"),
);
const minuteOptions = Array.from({ length: 60 }, (_, i) =>
  String(i).padStart(2, "0"),
);

function parse(value: string): [string, string] {
  const [h = "00", m = "00"] = (value || "00:00").split(":");
  return [h.padStart(2, "0"), m.padStart(2, "0")];
}

const [initialH, initialM] = parse(props.modelValue);
const selectedHour = ref(initialH);
const selectedMinute = ref(initialM);

watch(
  () => props.modelValue,
  (val) => {
    const [h, m] = parse(val);
    if (h !== selectedHour.value) selectedHour.value = h;
    if (m !== selectedMinute.value) selectedMinute.value = m;
  },
);

const minParts = computed(() => {
  if (!props.minTime) return null;
  const [h = "00", m = "00"] = props.minTime.split(":");
  return { h: h.padStart(2, "0"), m: m.padStart(2, "0") };
});

function isHourDisabled(h: string): boolean {
  if (!minParts.value) return false;
  return h < minParts.value.h;
}

function isMinuteDisabled(m: string): boolean {
  if (!minParts.value) return false;
  if (selectedHour.value < minParts.value.h) return true;
  if (selectedHour.value === minParts.value.h && m < minParts.value.m)
    return true;
  return false;
}

const displayValue = computed(
  () => `${selectedHour.value}:${selectedMinute.value}`,
);

function emitChange() {
  emit("update:modelValue", `${selectedHour.value}:${selectedMinute.value}`);
}

function selectHour(h: string) {
  if (isHourDisabled(h)) return;
  selectedHour.value = h;
  if (
    minParts.value &&
    selectedMinute.value < minParts.value.m &&
    h === minParts.value.h
  ) {
    selectedMinute.value = minParts.value.m;
  }
  emitChange();
}

function selectMinute(m: string) {
  if (isMinuteDisabled(m)) return;
  selectedMinute.value = m;
  emitChange();
}

watch(
  () => props.minTime,
  () => {
    if (!minParts.value) return;
    let changed = false;
    if (selectedHour.value < minParts.value.h) {
      selectedHour.value = minParts.value.h;
      changed = true;
    }
    if (
      selectedHour.value === minParts.value.h &&
      selectedMinute.value < minParts.value.m
    ) {
      selectedMinute.value = minParts.value.m;
      changed = true;
    }
    if (changed) emitChange();
  },
);

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);
const hourListRef = ref<HTMLElement | null>(null);
const minuteListRef = ref<HTMLElement | null>(null);

function scrollSelectedIntoView() {
  for (const el of [hourListRef.value, minuteListRef.value]) {
    if (!el) continue;
    const target = el.querySelector<HTMLElement>(
      `[data-value="${el === hourListRef.value ? selectedHour.value : selectedMinute.value}"]`,
    );
    if (target) {
      el.scrollTop =
        target.offsetTop - el.clientHeight / 2 + target.clientHeight / 2;
    }
  }
}

function toggle() {
  if (props.disabled) return;
  open.value = !open.value;
  if (open.value) {
    nextTick(scrollSelectedIntoView);
  }
}

function handleClickOutside(e: MouseEvent) {
  if (rootRef.value && !rootRef.value.contains(e.target as Node)) {
    open.value = false;
  }
}

function handleEsc(e: KeyboardEvent) {
  if (e.key === "Escape" && open.value) {
    open.value = false;
  }
}

onMounted(() => {
  if (typeof document !== "undefined") {
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
  }
});

onBeforeUnmount(() => {
  if (typeof document !== "undefined") {
    document.removeEventListener("mousedown", handleClickOutside);
    document.removeEventListener("keydown", handleEsc);
  }
});
</script>

<style scoped>
.time-picker-scroll {
  scrollbar-width: thin;
  scrollbar-color: #3a3a3a transparent;
}
.time-picker-scroll::-webkit-scrollbar {
  width: 4px;
}
.time-picker-scroll::-webkit-scrollbar-track {
  background: transparent;
}
.time-picker-scroll::-webkit-scrollbar-thumb {
  background: #3a3a3a;
  border-radius: 2px;
}
.time-picker-scroll::-webkit-scrollbar-thumb:hover {
  background: #4a4a4a;
}
</style>
