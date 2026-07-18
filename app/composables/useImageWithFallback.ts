/**
 * Vue composable for handling image loading with fallback
 * Ported from banana-lucky-next/lib/utils/image-handler.ts (useImageWithFallback hook)
 */

/**
 * Composable for handling image loading with fallback
 * @param src - The image source URL (reactive ref or plain string)
 * @param fallbackSrc - Fallback image source if the main image fails
 * @returns Reactive image source, loading state, error state, and retry function
 */
export function useImageWithFallback(
  src: Ref<string> | string,
  fallbackSrc?: string,
) {
  const siteConfig = useSiteConfig();
  const resolvedFallback =
    fallbackSrc ?? siteConfig.assets.images.defaultThumbnail;
  const srcRef = typeof src === "string" ? ref(src) : src;

  const imageSrc = ref(srcRef.value);
  const isLoading = ref(true);
  const hasError = ref(false);

  const loadImage = (url: string) => {
    if (!url) {
      imageSrc.value = resolvedFallback;
      isLoading.value = false;
      return;
    }

    isLoading.value = true;
    hasError.value = false;
    imageSrc.value = url;

    const img = new Image();

    img.onload = () => {
      isLoading.value = false;
      hasError.value = false;
    };

    img.onerror = () => {
      console.warn(`Failed to load image: ${url}`);
      imageSrc.value = resolvedFallback;
      isLoading.value = false;
      hasError.value = true;
    };

    img.src = url;
  };

  // Watch for src changes
  watch(
    srcRef,
    (newSrc) => {
      loadImage(newSrc);
    },
    { immediate: true },
  );

  const retry = () => {
    loadImage(srcRef.value);
  };

  return {
    imageSrc,
    isLoading,
    hasError,
    retry,
  };
}
