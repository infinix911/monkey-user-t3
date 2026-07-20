import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosClient from "@/lib/axios-client";
import { validateResponse } from "@/lib/validateResponse";
import {
  getSessionResponseSchema,
  mapVerifyUserToState,
  defaultUserState,
  type VerifyUserResponse,
  type UserState,
} from "@/interfaces/auth.interface";
import { useSiteStore } from "./site";

// Re-exported for consumers that import these from the store. Canonical source
// is interfaces/auth.interface.ts.
export type { VerifyUserResponse, UserState };
export { defaultUserState };

/**
 * Auth / session store — user identity, wallet, level, referral and the
 * current game session. Split out of the former monolithic `app` store.
 * See [[useUiStore]] for modals/device and [[useSiteStore]] for site data.
 *
 * The authenticated `GET /auth/get-session` wire shape (camelCase) lives in
 * `interfaces/auth.interface.ts` and is runtime-validated here before being
 * mapped onto the snake_case internal {@link UserState} (anti-corruption
 * layer), so existing consumers keep working and contract drift fails loudly.
 */

export interface GameState {
  id: string;
  name: string;
  provider: string;
  type: string;
  lobby_id: string;
}

export const useAuthStore = defineStore("auth", () => {
  // User & Authentication
  const user = ref<UserState>({ ...defaultUserState });
  const isAuthenticated = computed(() => user.value.id !== "");

  // Referral
  const referralCode = ref<string | null>(null);

  // Game State — sessionStorage bridges the gap when game opens in a popup window.
  // Hydrated client-side via plugins/hydrate-app-store.client.ts so SSR renders
  // the same initial shape as first client render (avoids hydration mismatch).
  const currentGame = ref<GameState | null>(null);
  const isNavigating = ref(false);

  // ----- User management -----

  /**
   * Set user state and update authentication status
   */
  const setUser = (newUser: UserState) => {
    user.value = newUser;
    // isAuthenticated is computed, no need to set manually
  };

  /**
   * Update partial user state (merge with existing)
   */
  const updateUser = (partial: Partial<UserState>) => {
    user.value = { ...user.value, ...partial };
  };

  /**
   * Reset user to logged out state
   */
  const resetUser = () => {
    user.value = { ...defaultUserState };
  };

  // ----- Referral -----

  const setReferralCode = (code: string | null) => {
    referralCode.value = code;
  };

  // ----- Game session -----

  const setCurrentGame = (game: GameState | null) => {
    currentGame.value = game;
    if (typeof window !== "undefined") {
      if (game) {
        sessionStorage.setItem("currentGame", JSON.stringify(game));
      } else {
        sessionStorage.removeItem("currentGame");
      }
    }
  };

  const setIsNavigating = (value: boolean) => {
    isNavigating.value = value;
  };

  // ----- API methods -----

  /**
   * Verify user authentication and fetch user data
   * Throws specific errors: "INVALID_AUTH", "INTERNAL_ERROR"
   */
  const verifyUser = async (): Promise<VerifyUserResponse> => {
    try {
      // Runtime-validate the response against the backend contract so a shape
      // drift throws ApiValidationError instead of silently yielding undefined
      // wallet/bank fields (auth + money safety).
      const result = validateResponse(
        getSessionResponseSchema,
        (await axiosClient.get("/auth/get-session")).data,
        "/auth/get-session",
      );

      if (!result) {
        user.value = { ...defaultUserState };
        throw new Error("INVALID_AUTH");
      }

      // Map onto internal state via the shared mapper (single source of the
      // field mapping). `currency` isn't in the profile response — derive it
      // from the site config.
      user.value = mapVerifyUserToState(result, useSiteCurrency());

      return result;
    } catch (error: unknown) {
      const status = apiErrorStatus(error);
      if (
        status === 401 ||
        (error instanceof Error && error.message === "INVALID_AUTH")
      ) {
        // User is not authenticated, clear user data
        user.value = { ...defaultUserState };
        throw new Error("INVALID_AUTH");
      } else if (status === 500) {
        throw new Error("INTERNAL_ERROR");
      } else {
        throw new Error(apiErrorMessageOr(error, "Failed to verify user"));
      }
    }
  };

  /**
   * Logout user - clear all state and reload page
   */
  const logout = async () => {
    try {
      await axiosClient.post("/auth/logout");
    } catch (error) {
      console.error("Logout failed:", error);
    } finally {
      // Clear all in-memory states
      user.value = { ...defaultUserState };
      useSiteStore().clear();

      // Clear all auth-related localStorage keys so they don't
      // affect subsequent sessions or expose stale data
      if (typeof window !== "undefined") {
        localStorage.removeItem("tokenLogin");
        localStorage.removeItem("tgChatId");
        localStorage.removeItem("referralCode");
        sessionStorage.removeItem("tgChatId");
        sessionStorage.removeItem("openedViaTelegram");
        sessionStorage.removeItem("openedViaTelegramOffline");
        sessionStorage.removeItem("noticeAgreed");

        navigateTo("/");
      }
    }
  };

  return {
    user,
    isAuthenticated,
    referralCode,
    currentGame,
    isNavigating,
    setUser,
    updateUser,
    resetUser,
    setReferralCode,
    setCurrentGame,
    setIsNavigating,
    verifyUser,
    logout,
  };
});
