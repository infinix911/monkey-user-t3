import { getApiHostUrl, getWebsocketHostUrl } from "../utils/upstream-config";

/**
 * Fail during Nitro startup when a private upstream is missing or malformed.
 * This prevents an apparently healthy deployment from serving SSR pages with
 * accidental localhost fallbacks.
 */
export default defineNitroPlugin(() => {
  getApiHostUrl();
  getWebsocketHostUrl();
});
