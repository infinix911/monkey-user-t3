import { ref, watch, onMounted, onUnmounted, type Ref } from "vue";

/**
 * Tracks the height of a scaled element and returns the actual rendered height.
 * Use this to set the wrapper height so transform: scale() doesn't cause extra blank space.
 *
 * @param contentRef - template ref on the scaled element
 * @param scaleRef - the current scale factor
 * @returns wrapperHeight - reactive CSS height string for the wrapper
 */
export function useScaledHeight(
  contentRef: Ref<HTMLElement | null>,
  scaleRef: Ref<number>,
) {
  const wrapperHeight = ref<string>("auto");
  let observer: ResizeObserver | null = null;

  function update() {
    if (!contentRef.value) return;
    // getBoundingClientRect returns the visual height after CSS transforms (scale),
    // so no manual multiplication needed. This also accounts for child margins.
    const rect = contentRef.value.getBoundingClientRect();
    wrapperHeight.value = `${rect.height}px`;
  }

  onMounted(() => {
    observer = new ResizeObserver(update);
    if (contentRef.value) {
      observer.observe(contentRef.value);
    }
    update();
  });

  watch(scaleRef, update);

  watch(contentRef, (el, oldEl) => {
    if (oldEl && observer) observer.unobserve(oldEl);
    if (el && observer) observer.observe(el);
    update();
  });

  onUnmounted(() => {
    observer?.disconnect();
  });

  return { wrapperHeight };
}
