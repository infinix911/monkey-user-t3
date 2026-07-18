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
 * 4. If both `chatId` and `token` present, navigate to the API redirect endpoint
 * 5. API verifies token, creates session, sets cookie via navigation response, redirects back
 *
 * Uses server-side redirect (GET) instead of XHR POST so the Set-Cookie header is delivered
 * via a navigation response — works reliably across all browsers and avoids cross-origin
 * XHR cookie restrictions that caused failures in production.
 */

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
    if (!chatId || !token || hasAttemptedLogin.value) return;

    hasAttemptedLogin.value = true;

    // Mark this as a token-based login before navigating away
    localStorage.setItem("tokenLogin", "true");

    // Server-side redirect (navigation, not XHR) so the Set-Cookie header
    // lands via the response. /api is the same-origin Nitro proxy that
    // forwards to the backend; cookieDomainRewrite re-scopes bn.session
    // to this origin.
    const redirectUrl = encodeURIComponent(window.location.origin);
    window.location.href = `/api/telegram/login-token?chat_id=${encodeURIComponent(chatId)}&token=${encodeURIComponent(token)}&redirect_url=${redirectUrl}`;
  });
};
