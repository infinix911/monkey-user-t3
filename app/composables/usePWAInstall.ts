/**
 * PWA install composable
 * Provides installPWA() to trigger the browser's install prompt
 */

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

declare global {
  interface Window {
    __pwaInstallPrompt?: BeforeInstallPromptEvent | null;
    __pwaInstalled?: boolean;
    __pwaListeners?: Set<() => void>;
  }
}

export function usePWAInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null);
  const isAppInstalled = ref(false);

  const syncWithGlobalState = () => {
    deferredPrompt.value = window.__pwaInstallPrompt || null;
    isAppInstalled.value = window.__pwaInstalled || false;
  };

  onMounted(() => {
    syncWithGlobalState();
    if (!window.__pwaListeners) {
      window.__pwaListeners = new Set();
    }
    window.__pwaListeners.add(syncWithGlobalState);
  });

  onUnmounted(() => {
    window.__pwaListeners?.delete(syncWithGlobalState);
  });

  const installPWA = async (): Promise<{
    success: boolean;
    outcome?: "accepted" | "dismissed";
    error?: string;
  }> => {
    if (typeof window === "undefined") {
      return { success: false, error: "Not in browser" };
    }
    if (window.__pwaInstalled) {
      return { success: true, outcome: "accepted" };
    }
    if (!window.__pwaInstallPrompt) {
      return { success: false, error: "install_not_available" };
    }
    try {
      await window.__pwaInstallPrompt.prompt();
      const { outcome } = await window.__pwaInstallPrompt.userChoice;
      if (outcome === "accepted") {
        window.__pwaInstallPrompt = null;
      }
      return { success: outcome === "accepted", outcome };
    } catch (error) {
      console.error("Error installing PWA:", error);
      return { success: false, error: String(error) };
    }
  };

  return {
    deferredPrompt,
    isAppInstalled,
    installPWA,
  };
}
