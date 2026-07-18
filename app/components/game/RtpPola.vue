<template>
  <!-- Pola (spin-pattern) panel: a "POLA" header above randomly-picked spin rows
       (value · ✓/✗ marks · mode). The rows are chosen from the full pool below,
       seeded by the game id so they stay stable across SSR/client and per game. -->
  <div
    class="rtp-pola-wrap mt-[3cqw] rounded-lg mb-[3cqw] px-[0cqw] py-[1.6cqw] md:px-[3cqw] md:py-[2.6cqw] md:border md:border-white/10 md:bg-white/5">
    <div class="rtp-pola flex flex-col gap-[2.4cqw]">
      <span class="self-center font-extrabold uppercase leading-none"
        style="font-size: clamp(10px, 5cqw, 13px); letter-spacing: 0.14em" :style="{ color: accent }">{{
          $t("slotRtp.pola") }}</span>

      <div class="flex flex-col gap-[2.2cqw]">
        <div v-for="(row, i) in rows" :key="i" class="flex items-center leading-none">
          <span class="w-[40%] text-left font-bold text-white whitespace-nowrap"
            style="font-size: clamp(8px, 5cqw, 14px)">{{ row.label }}</span>
          <span class="w-[40%] flex items-center justify-center font-black leading-none"
            style="font-size: clamp(11px, 6cqw, 15px)">
            <span v-for="(m, j) in row.marks" :key="j" class="inline-block text-center" style="width: 1.4em"
              :style="{ color: m ? '#2fd36b' : '#ef4444' }">{{ m ? "✓" : "✕" }}</span>
          </span>
          <span class="w-[20%] text-right font-semibold text-white/70 whitespace-nowrap"
            style="font-size: clamp(10px, 5.6cqw, 14px)">{{ row.mode }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = defineProps<{
  /** Game id — seeds the random pick so each game gets a stable pola. */
  seed: string | number;
  /** Theme accent colour for the "POLA" header. */
  accent: string;
}>();

// ── All possible pola values (mirrors the reference RTP site's format) ──
// A manual row reads "Manual N" with no right-hand label; an auto row reads the
// spin count on the left and "Auto" on the right. Nothing else.
const MANUAL_COUNTS = [3, 5, 7, 9, 10] as const;
const AUTO_COUNTS = [10, 20, 30, 40, 50, 60, 70, 80, 90] as const;
// Centre: the ✓/✗ pattern (always at least one ✓ so a row never reads all-✗).
const MARK_PATTERNS = [
  [1, 0, 0],
  [0, 1, 0],
  [0, 0, 1],
  [1, 1, 0],
  [0, 1, 1],
  [1, 0, 1],
  [1, 1, 1],
] as const;

// FNV-1a hash → 32-bit seed, stable across SSR/client.
function seedFromId(id: string | number): number {
  const s = String(id);
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// mulberry32 PRNG — deterministic from the seed.
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Three randomly-picked rows, deterministic per game id. Each row commits to
// manual or auto so the label and mode never contradict.
const rows = computed(() => {
  const rng = mulberry32(seedFromId(props.seed));
  const pick = <T,>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)]!;
  return Array.from({ length: 3 }, () => {
    const isManual = rng() < 0.5;
    return {
      label: isManual ? `Manual ${pick(MANUAL_COUNTS)}` : `${pick(AUTO_COUNTS)}`,
      marks: pick(MARK_PATTERNS),
      mode: isManual ? "" : "Auto",
    };
  });
});
</script>
