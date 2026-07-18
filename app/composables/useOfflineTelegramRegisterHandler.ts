/**
 * useOfflineTelegramRegisterHandler
 *
 * Handles Telegram offline auto-registration via URL token parameters.
 *
 * Flow:
 * 1. On mount, detect ?chatId=&token=&referral=&offline=true
 * 2. Strip all params from URL IMMEDIATELY (before any async work or analytics fires)
 * 3. Set openedViaTelegram + openedViaTelegramOffline in sessionStorage
 * 4. POST { chat_id, referral, token } to /auth/register-offline-telegram
 * 5. On 200 (existing user login) or 201 (new user registered): verifyUser() + reload
 *
 * Coexists with useLoginTokenHandler: that handler skips when offline=true && referral is present.
 */

import axiosClient from "~/lib/axios-client";

const TELEGRAM_CHAT_ID_PATTERN = /^-?\d{1,19}$/;

export const useOfflineTelegramRegisterHandler = () => {
  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();

  const hasAttempted = ref(false);

  onMounted(async () => {
    const chatId = route.query.chatId as string | undefined;
    const token = route.query.token as string | undefined;
    const referral = route.query.referral as string | undefined;
    const offline = route.query.offline as string | undefined;

    // Only handle the offline auto-registration flow
    const isOfflineRegister =
      offline === "true" && !!chatId && !!token && referral !== undefined;

    // Strip params from URL immediately — before any awaits, before analytics
    if (chatId || token || referral !== undefined || offline) {
      const query = { ...route.query };
      delete query.chatId;
      delete query.token;
      delete query.referral;
      delete query.offline;
      router.replace({ query });
    }

    if (!isOfflineRegister || hasAttempted.value) return;

    // Validate chatId format before storage or API calls
    if (!TELEGRAM_CHAT_ID_PATTERN.test(chatId!)) return;

    // Mark session as opened via Telegram offline
    sessionStorage.setItem("openedViaTelegram", "true");
    sessionStorage.setItem("openedViaTelegramOffline", "true");

    hasAttempted.value = true;

    try {
      const response = await axiosClient.post(
        "/auth/register-offline-telegram",
        {
          chat_id: chatId,
          referral: referral || "",
          token: token,
        }
      );

      if (response.status === 200 || response.status === 201) {
        localStorage.setItem("tokenLogin", "true");
        await authStore.verifyUser();
        window.location.reload();
      }
    } catch (error) {
      console.error("Offline Telegram register error:", error);
    }
  });
};
