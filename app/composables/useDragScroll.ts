import type { Ref } from "vue";

/**
 * Enables click/grab drag-to-scroll on a horizontal scroll container.
 *
 * The home-page carousels (HOT/CASINO/SPORTS) are native
 * `overflow-x-auto` rows with the scrollbar hidden. Touch devices already get
 * native momentum scrolling, but a mouse can't drag-scroll a div — so on
 * desktop the only way to move the row was the arrow buttons. This composable
 * adds pointer drag-to-scroll for mouse/pen while leaving native touch
 * scrolling untouched.
 *
 * Pass the same `Ref<HTMLElement | null>` you bind to the container's `ref`.
 */
export function useDragScroll(elRef: Ref<HTMLElement | null>) {
  // Distance (px) the pointer must travel before a gesture counts as a drag
  // rather than a click — keeps card taps working.
  const DRAG_THRESHOLD = 5;

  let isDragging = false;
  let moved = false;
  let startX = 0;
  let startScroll = 0;
  let activePointerId: number | null = null;

  function onPointerDown(e: PointerEvent) {
    // Leave touch to the browser's native momentum scroll.
    if (e.pointerType === "touch") return;
    const el = elRef.value;
    if (!el) return;

    isDragging = true;
    moved = false;
    startX = e.clientX;
    startScroll = el.scrollLeft;
    activePointerId = e.pointerId;

    // Prevent the browser's native image/text drag so the row tracks the
    // cursor instead of starting a ghost-drag of a card image. This does not
    // block the trailing click, so a plain click still reaches the card.
    e.preventDefault();
    // NOTE: pointer capture is taken in onPointerMove once a real drag starts,
    // not here — capturing on pointerdown retargets the click to the container
    // and the card's @click would never fire.
  }

  function onPointerMove(e: PointerEvent) {
    if (!isDragging) return;
    const el = elRef.value;
    if (!el) return;

    const dx = e.clientX - startX;
    if (!moved && Math.abs(dx) > DRAG_THRESHOLD) {
      moved = true;
      el.style.userSelect = "none";
      el.style.cursor = "grabbing";
      // Capture now (mid-drag) so we keep getting moves even if the pointer
      // leaves the row. Taking capture here — rather than on pointerdown —
      // keeps a plain click's target on the card so its @click still fires.
      if (activePointerId !== null) {
        try {
          el.setPointerCapture(activePointerId);
        } catch {
          // Pointer already gone; ignore.
        }
      }
    }
    if (moved) {
      // Native programmatic scroll-left assignment — 1:1 follow of the cursor.
      el.scrollLeft = startScroll - dx;
    }
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    const el = elRef.value;
    if (el) {
      el.style.userSelect = "";
      el.style.cursor = "";
      if (activePointerId !== null) {
        try {
          el.releasePointerCapture(activePointerId);
        } catch {
          // Already released; ignore.
        }
      }
    }
    activePointerId = null;
  }

  // Capture-phase click handler: swallow the click that follows a real drag so
  // releasing a drag over a card doesn't accidentally open the game. A genuine
  // tap/click (no movement past the threshold) passes through untouched.
  function onClickCapture(e: MouseEvent) {
    if (moved) {
      e.stopPropagation();
      e.preventDefault();
      moved = false;
    }
  }

  onMounted(() => {
    const el = elRef.value;
    if (!el) return;
    el.addEventListener("pointerdown", onPointerDown);
    el.addEventListener("pointermove", onPointerMove);
    el.addEventListener("pointerup", endDrag);
    el.addEventListener("pointercancel", endDrag);
    el.addEventListener("click", onClickCapture, true);
  });

  onBeforeUnmount(() => {
    const el = elRef.value;
    if (!el) return;
    el.removeEventListener("pointerdown", onPointerDown);
    el.removeEventListener("pointermove", onPointerMove);
    el.removeEventListener("pointerup", endDrag);
    el.removeEventListener("pointercancel", endDrag);
    el.removeEventListener("click", onClickCapture, true);
  });
}
