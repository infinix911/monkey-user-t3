import { ref, readonly, onMounted } from "vue";

/**
 * Device Detection Composable
 *
 * Detects device type (iOS, Android, mobile) based on user agent and window size.
 * Browser-only - runs in onMounted to avoid SSR issues.
 *
 * Returns read-only reactive refs for device flags.
 *
 * Note: This duplicates some logic from app.store.initDeviceDetection().
 * Use this composable in components that need device detection without
 * depending on the full app store.
 */

export const useDeviceDetection = () => {
  const isIOS = ref(false);
  const isAndroid = ref(false);
  const isMobile = ref(false);

  onMounted(() => {
    if (typeof window !== "undefined" && typeof navigator !== "undefined") {
      const userAgent = navigator.userAgent;

      // Detect iOS devices
      isIOS.value = /iPad|iPhone|iPod/.test(userAgent);

      // Detect Android devices
      isAndroid.value = /Android/.test(userAgent);

      // Detect mobile devices (user agent or screen width)
      isMobile.value =
        /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          userAgent,
        ) || window.innerWidth <= 768;
    }
  });

  return {
    isIOS: readonly(isIOS),
    isAndroid: readonly(isAndroid),
    isMobile: readonly(isMobile),
  };
};
