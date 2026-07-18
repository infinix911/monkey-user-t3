import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axiosClient from "@/lib/axios-client";
import { useSiteStore } from "./site";

/**
 * Auth / session store — user identity, wallet, level, referral and the
 * current game session. Split out of the former monolithic `app` store.
 * See [[useUiStore]] for modals/device and [[useSiteStore]] for site data.
 */

export interface VerifyUserResponse {
  id: string;
  upper_id: string;
  username: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  phone: string;
  user_type: number;
  level: number;
  currency: string;
  wallet: string;
  point_wallet: string;
  level_name?: string;
  level_exp?: string;
  level_min_exp?: string;
  next_level?: number;
  next_level_name?: string;
  next_level_min_exp?: string;
}

export interface UserState {
  id: string;
  username: string;
  level: number;
  level_name: string;
  level_exp: string;
  level_min_exp: string;
  next_level: number;
  next_level_name: string;
  next_level_min_exp: string;
  wallet: string;
  point_wallet: string;
  bank_name: string;
  bank_account: string;
  bank_account_name: string;
  phone: string;
  user_type: number;
  currency: string;
  upper_id: string;
}

export interface Reward {
  name: string;
  description: string;
  type: string;
  metric: string;
  valid_to: string;
}

export interface MemberLevel {
  id: number;
  name: string;
  min_exp: string;
  rewards: Reward[];
}

export interface GameState {
  id: string;
  name: string;
  provider: string;
  type: string;
  lobby_id: string;
}

/**
 * Default user state (empty/logged out)
 */
export const defaultUserState: UserState = {
  id: "",
  username: "",
  level: 0,
  level_name: "",
  level_exp: "",
  level_min_exp: "",
  next_level: 0,
  next_level_name: "",
  next_level_min_exp: "",
  wallet: "",
  point_wallet: "",
  bank_name: "",
  bank_account: "",
  bank_account_name: "",
  phone: "",
  user_type: 0,
  currency: "",
  upper_id: "",
};

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
      const result = (await axiosClient.get<VerifyUserResponse>("/auth/v"))
        .data;

      const userData: UserState = {
        id: result.id,
        username: result.username,
        level: result.level,
        level_name: result.level_name || "",
        level_exp: result.level_exp || "",
        level_min_exp: result.level_min_exp || "",
        next_level: result.next_level || 0,
        next_level_name: result.next_level_name || "",
        next_level_min_exp: result.next_level_min_exp || "",
        wallet: result.wallet,
        point_wallet: result.point_wallet,
        bank_name: result.bank_name,
        bank_account: result.bank_account,
        bank_account_name: result.bank_account_name,
        phone: result.phone,
        user_type: result.user_type,
        currency: result.currency,
        upper_id: result.upper_id,
      };

      // Update store with user data
      user.value = userData;

      return result;
    } catch (error: unknown) {
      const status = apiErrorStatus(error);
      if (status === 401) {
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
   * Fetch member levels from API
   */
  const getMemberLevels = async (): Promise<MemberLevel[]> => {
    try {
      const response =
        await axiosClient.get<MemberLevel[]>("/promotions/levels");
      return response.data;
    } catch (error: unknown) {
      throw new Error(apiErrorMessageOr(error, "Failed to fetch member levels"));
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
    getMemberLevels,
    logout,
  };
});
