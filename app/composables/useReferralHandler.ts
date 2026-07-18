/**
 * useReferralHandler
 *
 * Handles referral code query parameters on page load.
 * Mirrors the Next.js ReferralHandler component logic 1:1.
 *
 * Flow:
 * 1. On mount, check URL for `referral` or `refferal` (typo supported) param
 * 2. Validate the code against the API
 * 3. If valid: save to localStorage + store, open signup modal
 * 4. If invalid: remove the param from URL
 * 5. Referral param is kept in URL on success (same as Next.js)
 */

import axiosClient from "~/lib/axios-client";

export const useReferralHandler = () => {
  const route = useRoute();
  const router = useRouter();
  const authStore = useAuthStore();
  const uiStore = useUiStore();

  onMounted(async () => {
    // Support both spellings (Next.js handler supports both)
    const referralParam =
      (route.query.refferal as string | undefined) ||
      (route.query.referral as string | undefined);

    if (!referralParam) return;

    const referralCode = referralParam.trim();

    try {
      const response = await axiosClient.post("/auth/check/referral", {
        referral: referralCode,
      });

      if (response.status === 200) {
        // Valid referral code — persist and open signup
        localStorage.setItem("referralCode", referralCode);
        authStore.setReferralCode(referralCode);
        uiStore.setShowSignupModal(true);
        // Keep referral param in URL (same behaviour as Next.js)
      } else {
        handleInvalidReferral();
      }
    } catch {
      // Invalid code or API error — remove the param
      handleInvalidReferral();
    }
  });

  const handleInvalidReferral = () => {
    const query = { ...route.query };
    delete query.refferal;
    delete query.referral;
    router.replace({ query });
  };
};
