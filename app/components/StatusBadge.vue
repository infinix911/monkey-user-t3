<template>
  <span
    class="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[0.85em] font-medium whitespace-nowrap border"
    :class="toneClass">
    <span class="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
/**
 * A pill for a status cell.
 *
 * Colour is carried by a `tone` rather than a raw colour so every table reaches
 * the same four looks; the dot inherits `currentColor`, so a new tone only needs
 * its text/border/background trio. Tints are alpha-based to sit on any table
 * background without a second variant per surface.
 */
import { computed } from "vue";

export type StatusTone =
  | "pending"
  | "processing"
  | "success"
  | "rejected"
  | "danger"
  | "cancelled";

const props = withDefaults(
  defineProps<{
    /** Which of the four looks to use. */
    tone?: StatusTone;
    /** Text, when not supplied via the default slot. */
    label?: string;
  }>(),
  { tone: "pending", label: "" },
);

const RED = "text-red-400 border-red-400/40 bg-red-400/10";

const TONES: Record<StatusTone, string> = {
  pending: "text-amber-400 border-amber-400/40 bg-amber-400/10",
  processing: "text-blue-400 border-blue-400/40 bg-blue-400/10",
  success: "text-emerald-400 border-emerald-400/40 bg-emerald-400/10",
  // Two names, one look: a rejected request and a debit are both red, but
  // calling a debit "rejected" at the call site would read as a bug.
  rejected: RED,
  danger: RED,
  // Cancelled is not a failure — it is a request that stopped. Grey keeps it
  // distinct from the red of something the operator refused.
  cancelled: "text-white/60 border-white/25 bg-white/10",
};

const toneClass = computed(() => TONES[props.tone]);
</script>
