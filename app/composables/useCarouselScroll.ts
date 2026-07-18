import type { Ref } from "vue";
import { useDragScroll } from "./useDragScroll";

/**
 * Drives one horizontal carousel row on the homepage: tracks whether it is
 * scrolled to the far left/right (to show/hide the gradient arrows) and pages
 * the row by `step * perPage` pixels on arrow click. Folds in `useDragScroll`
 * so each carousel also gets mouse/pen drag-to-scroll.
 *
 * Pass the same `Ref<HTMLElement | null>` bound to the scroll container's `ref`.
 *
 *   - `step`    width of one card + gap, in px (HOT 208, others 194)
 *   - `perPage` cards advanced per arrow click (HOT/others 5)
 */
export function useCarouselScroll(
  elRef: Ref<HTMLElement | null>,
  opts: { step: number; perPage: number },
) {
  const isAtLeft = ref(true);
  const isAtRight = ref(false);

  function updateState() {
    const el = elRef.value;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    isAtLeft.value = el.scrollLeft <= 5;
    isAtRight.value = maxScroll <= 0 || el.scrollLeft >= maxScroll - 5;
  }

  // Advance by one visible page (the row's own width) so the next set of cards
  // scrolls into view; scroll-snap then aligns to a card boundary. clientWidth
  // adapts to the viewport (≈3 cards on mobile, ≈5 on desktop) and is far more
  // reliable than the fixed px `step`, which only matched the desktop card size
  // and over-scrolled on mobile. Falls back to step*perPage if width is 0.
  function pageStep() {
    const w = elRef.value?.clientWidth ?? 0;
    return w > 0 ? w : opts.step * opts.perPage;
  }

  function scrollLeft() {
    const el = elRef.value;
    if (!el) return;
    el.scrollTo({
      left: Math.max(el.scrollLeft - pageStep(), 0),
      behavior: "smooth",
    });
  }

  function scrollRight() {
    const el = elRef.value;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    el.scrollTo({
      left: Math.min(el.scrollLeft + pageStep(), maxScroll),
      behavior: "smooth",
    });
  }

  // Re-evaluate the arrow visibility whenever the row's size or content
  // changes — not just on scroll. Without this the far-left/right flags go
  // stale after the cards finish sizing (images load, the client-side card
  // scale kicks in, viewport resizes), leaving an arrow shown when there's
  // nothing to scroll to in that direction (or hidden when there is).
  let resizeObserver: ResizeObserver | null = null;

  onMounted(() => {
    const el = elRef.value;
    if (!el) return;
    el.addEventListener("scroll", updateState, { passive: true });
    // Run once now and again after the next frame, once layout has settled.
    updateState();
    requestAnimationFrame(updateState);

    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(() => updateState());
      resizeObserver.observe(el);
      // The inner flex track holds the cards; observe it too so the flags
      // refresh when items are added/removed or re-sized.
      if (el.firstElementChild) resizeObserver.observe(el.firstElementChild);
    }
  });

  onBeforeUnmount(() => {
    elRef.value?.removeEventListener("scroll", updateState);
    resizeObserver?.disconnect();
    resizeObserver = null;
  });

  useDragScroll(elRef);

  return { isAtLeft, isAtRight, scrollLeft, scrollRight, updateState };
}
