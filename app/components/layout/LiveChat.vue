<template>
  <!-- Only show if Tawk.to is configured -->
  <div v-if="isChatAvailable" class="fixed z-[61] bottom-[11px] left-4 md:bottom-8 md:left-auto md:right-4">
    <button
      class="group relative w-[68px] h-[68px] md:w-16 md:h-16 flex items-center justify-center transition-all duration-300 cursor-pointer"
      :aria-label="$t('common.liveChat')" :title="$t('common.chatWithUs')" @click="openChat">
      <!-- Custom live-chat mascot (mobile + desktop) -->
      <NuxtImg
        :src="cdn('/designs/template-3/m-livechat.png')" :alt="$t('common.liveChat')"
        class="w-full h-full object-contain drop-shadow-lg group-hover:scale-110 transition-transform duration-300 mb-[5px]"/>

      <!-- Online Status Indicator -->
      <span
        v-if="isOnline"
        class="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full border-2 border-white animate-pulse"
        :aria-label="$t('common.online')" />
    </button>

    <!-- Tooltip -->
    <div
      class="absolute bottom-full right-0 mb-2 px-3 py-2 bg-gray-900 text-white text-sm rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap">
      {{ $t("common.chatWithUs") }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useI18n } from "vue-i18n";
import { cdn } from "@/utils/assetUrl";

const _t = useI18n().t;
const siteConfig = useSiteConfig();

// State
const isOnline = ref(true); // Assume online by default
const tawkLoaded = ref(false);

// Computed
const isChatAvailable = computed(() => {
  return (
    siteConfig.integrations.tawkTo.propertyId !== null &&
    siteConfig.integrations.tawkTo.widgetId !== null
  );
});

/**
 * Open Tawk.to chat
 * If Tawk.to is not loaded, load it first
 */
const openChat = () => {
  if (!isChatAvailable.value) return;

  // Check if Tawk.to API is available
  type TawkWindow = typeof window & { Tawk_API?: { maximize?: () => void; onStatusChange?: (status: string) => void }; Tawk_LoadStart?: Date; requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void };
  if (typeof window !== "undefined" && (window as TawkWindow).Tawk_API) {
    (window as TawkWindow).Tawk_API!.maximize?.();
  } else {
    // Load Tawk.to if not already loaded
    loadTawkTo();
  }
};

/**
 * Load Tawk.to chat widget
 * Only loads if propertyId and widgetId are configured
 */
const loadTawkTo = () => {
  if (!isChatAvailable.value || tawkLoaded.value) return;
  if (typeof window === "undefined") return;

  const { propertyId, widgetId } = siteConfig.integrations.tawkTo;

  // Create Tawk.to script
  const script = document.createElement("script");
  script.async = true;
  script.src = `https://embed.tawk.to/${propertyId}/${widgetId}`;
  script.charset = "UTF-8";
  script.setAttribute("crossorigin", "*");

  // Add script to document
  document.head.appendChild(script);

  type TawkWindow2 = typeof window & { Tawk_API?: { maximize?: () => void; onStatusChange?: (status: string) => void }; Tawk_LoadStart?: Date; requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void };
  const tawkWin = window as TawkWindow2;
  // Set up Tawk.to API
  tawkWin.Tawk_API = tawkWin.Tawk_API || {};
  tawkWin.Tawk_LoadStart = new Date();

  // Listen for Tawk.to status changes
  tawkWin.Tawk_API.onStatusChange = (status: string) => {
    isOnline.value = status === "online";
  };

  tawkLoaded.value = true;
};

// Defer Tawk.to loading until after page is fully idle to avoid
// blocking initial render and hurting Lighthouse performance score.
onMounted(() => {
  type TawkWindow3 = typeof window & { requestIdleCallback?: (cb: () => void, opts?: { timeout?: number }) => void };
  if (isChatAvailable.value) {
    if ("requestIdleCallback" in window) {
      (window as TawkWindow3).requestIdleCallback!(() => loadTawkTo(), {
        timeout: 8000,
      });
    } else {
      setTimeout(() => loadTawkTo(), 5000);
    }
  }
});
</script>

<style scoped>
/* Pulse animation for online indicator */
@keyframes pulse {

  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.5;
  }
}

.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
</style>
