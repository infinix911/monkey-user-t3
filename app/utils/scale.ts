import type { Ref } from "vue";

/**
 * Update desktop scale based on viewport width
 * @param scaleRef - Vue ref to update with calculated scale
 */
export const updateDesktopScale = (scaleRef: Ref<number>) => {
  const viewportWidth = window.innerWidth;
  const desktopWidth = 2000;
  const baseScale = Math.min(viewportWidth / desktopWidth, 1);

  // if (viewportWidth >= 900 && viewportWidth <= 1536) {
  //   scaleRef.value = baseScale + 0.18
  // } else if (viewportWidth >= 768 && viewportWidth <= 899) {
  //   scaleRef.value = baseScale + 0.15
  // } else {
  //   scaleRef.value = baseScale
  // }
  scaleRef.value = baseScale;
};

/**
 * Design width of the mobile header row, in px — the width at which its
 * contents sit side by side at their intended sizes with a small gap:
 *
 *   8 (row px-1) + 4 (logo ml-1) + 210 (logo cap) + 10 (gap)
 *     + 178 (two 86px buttons + 6px gap) + 4 (pr-1) = 414
 *
 * Narrower viewports (iPhone 12 at 390, SE at 375) don't fit that, so instead
 * of letting the logo and the buttons collide the whole row is laid out at this
 * width and scaled down to the viewport — see `mobileHeaderScale`. Re-derive
 * this if the logo cap, the button size or the row padding changes.
 */
export const MOBILE_HEADER_DESIGN_WIDTH = 414;

/**
 * Scale factor for the mobile header row: shrink-to-fit below the design width,
 * never magnify above it. Mirrored by the pre-paint inline script in app.vue —
 * keep the two in step.
 */
export const mobileHeaderScale = (viewportWidth: number): number =>
  Math.min(1, viewportWidth / MOBILE_HEADER_DESIGN_WIDTH);

/**
 * Update mobile scale based on viewport width
 * @param scaleRef - Vue ref to update with calculated scale
 */
export const updateMobileScale = (scaleRef: Ref<number>) => {
  const viewportWidth = window.innerWidth;
  const mobileWidth = 786;
  scaleRef.value = Math.min(viewportWidth / mobileWidth, 1);
};

/**
 * Setup responsive scaling for desktop and mobile
 * @param desktopScaleRef - Vue ref for desktop scale
 * @param mobileScaleRef - Vue ref for mobile scale
 * @returns Cleanup function to remove event listeners
 */
export const setupResponsiveScaling = (
  desktopScaleRef: Ref<number>,
  mobileScaleRef: Ref<number>,
) => {
  const handleResize = () => {
    updateDesktopScale(desktopScaleRef);
    updateMobileScale(mobileScaleRef);
  };

  // Initial update
  handleResize();

  // Add event listener
  window.addEventListener("resize", handleResize);

  // Return cleanup function
  return () => {
    window.removeEventListener("resize", handleResize);
  };
};
