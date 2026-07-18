import { ref, computed, onMounted, onUnmounted } from "vue";

/**
 * Composable for detecting mobile viewport.
 * Listens to window resize events and returns reactive isMobile/windowWidth.
 *
 * @param breakpoint - Pixel threshold for mobile detection (default: 768)
 */
export function useMobileDetect(breakpoint = 768) {
  // Initialize with the same value on SSR and first client render so
  // hydration matches. Real viewport width is read in onMounted.
  const windowWidth = ref(breakpoint + 1);
  const isMobile = computed(() => windowWidth.value < breakpoint);

  function updateWidth() {
    windowWidth.value = window.innerWidth;
  }

  onMounted(() => {
    updateWidth();
    window.addEventListener("resize", updateWidth);
  });

  onUnmounted(() => {
    window.removeEventListener("resize", updateWidth);
  });

  return { windowWidth, isMobile };
}
