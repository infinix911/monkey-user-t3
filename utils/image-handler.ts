/**
 * Image handler utilities
 * Ported from banana-lucky-next/lib/utils/image-handler.ts
 *
 * Note: The React hook useImageWithFallback has been converted to a Vue composable
 * at ~/composables/useImageWithFallback.ts
 */

/**
 * Utility function to check if an image URL is valid
 * @param url - The image URL to check
 * @returns Promise<boolean> - Whether the image URL is valid
 */
export async function isValidImageUrl(url: string): Promise<boolean> {
  if (!url) return false;

  try {
    const response = await fetch(url, { method: "HEAD" });
    return (
      response.ok &&
      (response.headers.get("content-type")?.startsWith("image/") ?? false)
    );
  } catch (error) {
    console.warn(`Error checking image URL ${url}:`, error);
    return false;
  }
}

/**
 * Utility function to get a safe image URL with fallback
 * @param url - The original image URL
 * @param fallback - The fallback URL
 * @returns Promise<string> - The safe image URL to use
 */
export async function getSafeImageUrl(
  url: string,
  fallback: string = "/images/default.png",
): Promise<string> {
  if (!url) return fallback;

  const isValid = await isValidImageUrl(url);
  return isValid ? url : fallback;
}
