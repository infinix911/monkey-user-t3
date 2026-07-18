<template>
  <div class="w-full h-screen bg-black flex items-center justify-center relative">
    <!-- Loading State -->
    <div v-if="isLoading" class="text-center text-white">
      <div class="mb-4">
        <svg
class="animate-spin h-12 w-12 mx-auto text-yellow-500" xmlns="http://www.w3.org/2000/svg" fill="none"
          viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path
class="opacity-75" fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
      <p class="text-lg">{{ $t("common.gameLoading") }}</p>
    </div>

    <!-- Error State -->
    <div v-else class="text-center text-white max-w-md px-4">
      <svg
class="h-16 w-16 mx-auto mb-4 text-red-500" xmlns="http://www.w3.org/2000/svg" fill="none"
        viewBox="0 0 24 24" stroke="currentColor">
        <path
stroke-linecap="round" stroke-linejoin="round" stroke-width="2"
          d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
      </svg>
      <p class="text-xl font-bold mb-2">{{ $t("common.gameError") }}</p>
      <p class="text-gray-400 mb-6">{{ error || $t("common.gameError") }}</p>
      <div class="flex gap-4 justify-center">
        <button
class="px-6 py-2 bg-yellow-500 text-black rounded hover:bg-yellow-600 transition-colors"
          @click="reloadPage">
          {{ $t("common.retry") }}
        </button>
        <button class="px-6 py-2 bg-gray-700 text-white rounded hover:bg-gray-600 transition-colors" @click="goBack">
          {{ $t("common.goBack") }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import { useI18n } from "vue-i18n";
import axiosClient from "@/lib/axios-client";
import { useAuthStore } from "@/stores/auth";

definePageMeta({
  layout: "game",
});

const { t } = useI18n();
const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
// Drives the global top progress bar (app.vue) while we resolve the one-time
// launch URL — the route-nav bar already finished once this CSR page mounted,
// so without this there's no feedback during the /games/launch round-trip.
const loadingIndicator = useLoadingIndicator();

// Route params
const gameType = route.params.game_type as string;
const rawGameId = route.params.game_id as string;
const gameId = rawGameId.replace(/^GAME_/, "");
const lobbyIdParam = (route.query.lobbyId as string) || "";

// State
const isLoading = ref(true);
const error = ref<string | null>(null);

/**
 * Fetch game launch URL from API and redirect the tab to it.
 * On failure, render the error UI with retry/back buttons.
 */
const fetchGameUrl = async () => {
  isLoading.value = true;
  error.value = null;
  loadingIndicator.start();

  try {
    const isCasino = gameType.toLowerCase() === "casino";
    let params: Record<string, string>;
    if (isCasino) {
      params = { lobby: gameId };
    } else {
      const lobbyId = lobbyIdParam || authStore.currentGame?.lobby_id || "";
      if (!lobbyId) {
        error.value = t("common.gameError");
        isLoading.value = false;
        loadingIndicator.finish();
        return;
      }
      params = { lobby: lobbyId, game: gameId };
    }

    console.log("[game-launch] request params:", params);
    const launchResponse = await axiosClient.get("/games/launch", { params });
    const data = launchResponse.data;
    const url: string = data?.url || data?.game_url || data?.message || "";

    // console.log("[game-launch] response data:", data);
    // console.log("[game-launch] resolved url:", url);

    if (!url) {
      throw new Error("Game URL not found in response");
    }

    loadingIndicator.finish();
    window.location.replace(url);
  } catch (err: unknown) {
    console.error("Failed to fetch game URL:", err);
    const gameErr = err as { response?: { data?: { message?: string } } };
    const code = gameErr?.response?.data?.message;
    // Map backend block codes to friendly, localized messages. Anything else
    // (or no code) falls back to the generic load error so raw codes like
    // GAME_RESTRICTED are never shown to the user.
    const blockMessages: Record<string, string> = {
      GAME_RESTRICTED: t("common.gameBlocked"),
      GAME_BLOCKED: t("common.gameBlocked"),
      GAME_BLOCKED_BY_PROMOTION: t("common.gameBlockedByPromotion"),
    };
    error.value =
      (code && blockMessages[code]) || t("common.gameError");
    isLoading.value = false;
    loadingIndicator.finish();
  }
};

const reloadPage = () => {
  window.location.reload();
};

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
};

onMounted(() => {
  fetchGameUrl();
});
</script>
