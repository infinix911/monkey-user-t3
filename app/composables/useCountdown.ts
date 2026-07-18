import { ref, onMounted, onUnmounted, type Ref } from "vue";

export interface CountdownReturn {
  countdown: Ref<string>;
  isClosed: Ref<boolean>;
}

/**
 * Composable for countdown timer logic.
 * Accepts a reactive getter for the close timestamp (in ms or seconds).
 * Returns formatted HH:MM:SS countdown string and isClosed flag.
 */
export function useCountdown(
  getCloseTime: () => number | null | undefined,
): CountdownReturn {
  const countdown = ref("00:00:00");
  const isClosed = ref(true);
  let timer: ReturnType<typeof setInterval> | null = null;

  function normalizeTimestamp(ts: number): number {
    // Handle both seconds and milliseconds formats
    return ts < 10_000_000_000 ? ts * 1000 : ts;
  }

  function update() {
    const raw = getCloseTime();
    if (!raw || raw === 0) {
      isClosed.value = true;
      countdown.value = "00:00:00";
      return;
    }

    const remaining = normalizeTimestamp(raw) - Date.now();
    if (remaining <= 0) {
      isClosed.value = true;
      countdown.value = "00:00:00";
      return;
    }

    isClosed.value = false;
    const totalSeconds = Math.floor(remaining / 1000);
    // Military (24h) HH:MM:SS — days are folded into the hours field rather than
    // shown as a "1d 19h 49m" style, so a multi-day countdown reads e.g. 43:49:12.
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    countdown.value = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  onMounted(() => {
    update();
    timer = setInterval(update, 1000);
  });

  onUnmounted(() => {
    if (timer) clearInterval(timer);
  });

  return { countdown, isClosed };
}
