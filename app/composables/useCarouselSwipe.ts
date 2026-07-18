import { computed, ref, type Ref } from "vue";

export interface UseCarouselSwipeOptions {
  /** Current slide count (reactive getter). Swipe is a no-op when <= 1. */
  count: () => number;
  /** Index ref the swipe reads and mutates (clamped to [0, count-1]). */
  index: Ref<number>;
  /** Minimum horizontal px travel to count as a swipe. Default 50. */
  threshold?: number;
  /** Called when a drag starts — e.g. to pause autoplay. */
  onInteractStart?: () => void;
  /** Called after a drag settles — e.g. to resume autoplay. */
  onInteractEnd?: () => void;
}

/**
 * Pointer-based horizontal swipe for a `translateX` carousel. Uses Pointer
 * Events, so the SAME handlers drive mouse (desktop), touch (mobile) and pen —
 * touch-only handlers never fire for a mouse.
 *
 * - The track follows the finger/cursor while dragging via `dragDeltaX` /
 *   `trackTransform`; on release a drag past `threshold` advances or retreats
 *   one slide (clamped to the ends).
 * - `onClickCapture` swallows the trailing click after a drag so a mouse-drag
 *   over a child link/button doesn't also fire it (touch already suppresses the
 *   tap after a swipe).
 *
 * The carousel element should also set `touch-action: pan-y` (Tailwind
 * `touch-pan-y`) so vertical page scrolling still works while horizontal drags
 * drive the carousel.
 */
export function useCarouselSwipe(opts: UseCarouselSwipeOptions) {
  const threshold = opts.threshold ?? 50;
  const isDragging = ref(false);
  const dragStartX = ref(0);
  const dragDeltaX = ref(0);
  const dragged = ref(false);
  // Element + pointer id we capture *once a drag actually starts*, so move/up
  // keep firing on the container even when the finger/cursor travels past the
  // banner edges. We deliberately do NOT capture on pointerdown: capturing on a
  // plain tap makes the browser dispatch the trailing `click` to the capture
  // container instead of the inner element, which swallowed menu-item clicks in
  // the profile modal. `pendingEl` holds the candidate until the drag threshold
  // is crossed in onPointerMove.
  let pendingEl: Element | null = null;
  let captureEl: Element | null = null;
  let capturePointerId = -1;

  function releaseCapture() {
    if (captureEl && capturePointerId !== -1) {
      try {
        captureEl.releasePointerCapture?.(capturePointerId);
      } catch {
        // capture may already be gone (pointer ended) — ignore.
      }
    }
    captureEl = null;
    capturePointerId = -1;
    pendingEl = null;
  }

  const trackTransform = computed(
    () => `translateX(calc(-${opts.index.value * 100}% + ${dragDeltaX.value}px))`,
  );

  function reset() {
    isDragging.value = false;
    dragDeltaX.value = 0;
  }

  function onPointerDown(e: PointerEvent) {
    if (opts.count() <= 1) return;
    isDragging.value = true;
    dragged.value = false;
    dragStartX.value = e.clientX;
    dragDeltaX.value = 0;
    // Remember the candidate element/pointer; capture is deferred until the
    // drag threshold is crossed (see onPointerMove) so a tap's click still
    // lands on the inner button.
    pendingEl = e.currentTarget as Element | null;
    capturePointerId = e.pointerId;
    opts.onInteractStart?.();
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging.value) return;
    dragDeltaX.value = e.clientX - dragStartX.value;
    if (Math.abs(dragDeltaX.value) > 8 && !dragged.value) {
      dragged.value = true;
      // Now it's a real drag — capture so move/up keep firing past the edges.
      try {
        pendingEl?.setPointerCapture?.(e.pointerId);
        captureEl = pendingEl;
      } catch {
        // setPointerCapture can throw if the pointer is already gone — ignore.
      }
    }
  }

  function onPointerUp() {
    if (!isDragging.value) return;
    const delta = dragDeltaX.value;
    releaseCapture();
    reset();
    const last = opts.count() - 1;
    if (delta <= -threshold) {
      opts.index.value = Math.min(opts.index.value + 1, last);
    } else if (delta >= threshold) {
      opts.index.value = Math.max(opts.index.value - 1, 0);
    }
    opts.onInteractEnd?.();
  }

  // Pointer was cancelled (e.g. the browser took over for a vertical scroll) —
  // drop the drag without changing the slide.
  function onPointerCancel() {
    if (!isDragging.value) return;
    releaseCapture();
    reset();
    opts.onInteractEnd?.();
  }

  function onClickCapture(e: MouseEvent) {
    if (dragged.value) {
      e.stopPropagation();
      e.preventDefault();
      dragged.value = false;
    }
  }

  return {
    isDragging,
    dragDeltaX,
    trackTransform,
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
  };
}
