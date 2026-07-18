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
