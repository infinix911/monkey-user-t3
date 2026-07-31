<template>
  <div class="leading-tight">
    <div class="tabular-nums">{{ parts.date || "—" }}</div>
    <div v-if="parts.time" class="tabular-nums text-[0.85em] opacity-60">
      {{ parts.time }}
    </div>
  </div>
</template>

<script setup lang="ts">
/**
 * A timestamp in a table cell: date on the first line, time beneath it.
 *
 * `tabular-nums` keeps the digits in a column from jittering row to row, which
 * is what makes a date column scannable. The time is dimmed and smaller because
 * it is the secondary half — the date is what a member looks for.
 */
import { computed } from "vue";
import { toDateParts } from "@/utils/table-format";

const props = defineProps<{
  /** Timestamp as the API returned it. */
  value: string | null | undefined;
}>();

const parts = computed(() => toDateParts(props.value));
</script>
