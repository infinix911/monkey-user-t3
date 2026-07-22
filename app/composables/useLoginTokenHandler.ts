/**
 * useLoginTokenHandler
 *
 * Handles auto-login via URL token parameters.
 * Mirrors the Next.js LoginTokenHandler component logic 1:1.
 *
 * Flow:
 * 1. On mount, check URL for `chatId`, `token`, and optional `offline` params
 * 2. Strip sensitive params from the URL IMMEDIATELY (before any async work or GA fires)
 * 3. If `chatId` present, mark session as opened via Telegram in sessionStorage
 * 4. If both `chatId` and `token` are present, POST the same-origin one-time
 *    exchange endpoint. The API sets the session cookie and returns a safe
 *    relative redirect path.
 */

import { getCsrfHeaders } from "@/lib/csrf";

const TELEGRAM_CHAT_ID_PATTERN = /^-?\d{1,19}$/;

function safeRedirectPath(value: unknown): string {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//"))
    return "/";
  try {
    const url = new URL(value, window.location.origin);
    return url.origin === window.location.origin
      ? `${url.pathname}${url.search}${url.hash}`
      : "/";
  } catch {
    return "/";
  }
}

export const useLoginTokenHandler = () => {
  const route = useRoute();
  const router = useRouter();

  // Guard against duplicate execution within the same page lifecycle
  const hasAttemptedLogin = ref(false);

  onMounted(async () => {
    const chatId = route.query.chatId as string | undefined;
    const token = route.query.token as string | undefined;
    const offline = route.query.offline as string | undefined;
    const referral = route.query.referral as string | undefined;

    // Offline registration flow (offline=true + referral present) is handled
    // by useOfflineTelegramRegisterHandler — skip here to avoid consuming the token
    if (offline === "true" && referral !== undefined) return;

    // 1. Remove sensitive params from URL FIRST — before any awaits, before GA fires
    //    This prevents token from leaking into analytics, browser history, or Referer headers
    if (chatId || token) {
      const query = { ...route.query };
      delete query.chatId;
      delete query.token;
      delete query.offline;
      router.replace({ query });
    }

    // 2. Mark Telegram session (using values captured before URL cleanup)
    if (chatId) {
      sessionStorage.setItem("openedViaTelegram", "true");
      if (offline === "true") {
        sessionStorage.setItem("openedViaTelegramOffline", "true");
      }
    }

    // 3. Skip if required params were missing or already attempted
    if (
      !chatId ||
      !token ||
      !TELEGRAM_CHAT_ID_PATTERN.test(chatId) ||
      hasAttemptedLogin.value
    )
      return;

    hasAttemptedLogin.value = true;

    // Mark this as a token-based login before navigating away
    localStorage.setItem("tokenLogin", "true");

    try {
      const response = await $fetch<{
        redirectPath?: string;
        data?: { redirectPath?: string };
      }>("/api/telegram/login-token", {
        method: "POST",
        credentials: "include",
        headers: getCsrfHeaders(),
        body: { chatId, token, redirectPath: window.location.pathname || "/" },
        retry: 0,
      });
      window.location.assign(
        safeRedirectPath(response?.data?.redirectPath ?? response?.redirectPath),
      );
    } catch {
      localStorage.removeItem("tokenLogin");
      hasAttemptedLogin.value = false;
    }
  });
};
