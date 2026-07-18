import { defineStore } from "pinia";
import { ref } from "vue";
import type {
  WebSocketMessage,
  NotificationData,
  WalletData,
} from "~/interfaces/socket.interface";
import { useAuthStore } from "./auth";
import axiosClient from "@/lib/axios-client";
import { getWsApiUrl } from "@/lib/domain";

/**
 * WebSocket Store - Real-time connection management
 * Converted from Zustand (Next.js) to Pinia (Nuxt) Composition API
 *
 * Manages:
 * - WebSocket connection lifecycle (connect, disconnect, reconnect)
 * - Token-based authentication
 * - Message handling (notifications, wallet updates, ping/pong)
 * - Exponential backoff reconnection strategy
 * - Connection state and error tracking
 */
export const useWebSocketStore = defineStore("websocket", () => {
  // ============================================================================
  // STATE
  // ============================================================================

  const ws = ref<WebSocket | null>(null);
  const isConnected = ref(false);
  const connectionError = ref<string | null>(null);
  const reconnectAttempts = ref(0);
  const maxReconnectAttempts = 3;

  // Store callback functions (not reactive state)
  let routerRefreshFn: (() => void) | null = null;
  let inquiryCheckCallback: (() => void) | null = null;

  // Prevent multiple simultaneous connection attempts
  let isConnecting = false;

  // Session check interval (polls /auth/v to detect invalidated sessions)
  let sessionCheckInterval: ReturnType<typeof setInterval> | null = null;

  // ============================================================================
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Get WebSocket authentication token from API
   */
  const getWebSocketToken = async (): Promise<string | null> => {
    try {
      const response = await axiosClient.get<{ token: string }>("/auth/ws");

      return response.data.token || null;
    } catch (error: unknown) {
      console.error("🔑 Failed to get WebSocket token:", error);
      return null;
    }
  };

  /**
   * Build WebSocket URL with auth token.
   *
   * getWsApiUrl() now returns the full same-origin URL (wss://<frontend-host>);
   * the Nitro ws-proxy plugin upgrades /ws to the backend WS server, so the
   * backend host stays private.
   */
  const buildWebSocketUrl = (token: string): string => {
    if (typeof window === "undefined") {
      return "";
    }

    return `${getWsApiUrl()}/ws?token=${encodeURIComponent(token)}`;
  };

  // ============================================================================
  // ACTIONS
  // ============================================================================

  /**
   * Set router refresh callback function
   * Called when notifications are received
   */
  const setRouterRefresh = (refreshFn: () => void) => {
    routerRefreshFn = refreshFn;
  };

  /**
   * Set inquiry check callback function
   * Called when inquiry-related notifications are received
   */
  const setInquiryCheckCallback = (callback: () => void) => {
    inquiryCheckCallback = callback;
  };

  /**
   * Connect to WebSocket server
   * - Fetches authentication token
   * - Establishes WebSocket connection
   * - Sets up message handlers
   * - Implements automatic reconnection on failure
   */
  const connect = async () => {
    // If already connected, do nothing
    if (ws.value && ws.value.readyState === WebSocket.OPEN) {
      return;
    }

    // If already connecting, do nothing
    if (isConnecting) {
      return;
    }

    // If not connected, create new connection
    if (!isConnected.value) {
      isConnecting = true;
      connectionError.value = null;

      try {
        // Get authentication token from API
        const token = await getWebSocketToken();

        if (!token || token.trim() === "") {
          const errorMsg = "No WebSocket token available";
          console.error("🔌", errorMsg);
          connectionError.value = errorMsg;
          isConnecting = false;
          return;
        }

        // Build WebSocket URL
        const wsUrl = buildWebSocketUrl(token);

        if (!wsUrl) {
          console.error("🔌 Failed to build WebSocket URL (not in browser)");
          isConnecting = false;
          return;
        }

        // Create new WebSocket connection
        const newWs = new WebSocket(wsUrl);

        // ========================================================================
        // WebSocket Event Handlers
        // ========================================================================

        /**
         * onopen - Connection established successfully
         */
        newWs.onopen = () => {
          ws.value = newWs;
          isConnected.value = true;
          connectionError.value = null;
          reconnectAttempts.value = 0;
          isConnecting = false;
          console.log("🔌 WebSocket connected");
        };

        /**
         * onmessage - Handle incoming messages
         */
        newWs.onmessage = (event) => {
          try {
            // Try to parse as JSON
            const data: WebSocketMessage = JSON.parse(event.data);

            // Handle different event types
            switch (data.event) {
              case "notification": {
                // Show toast notification
                const notificationData = data.data as NotificationData;
                const { success, info } = useToast();

                // Check if this is an inquiry-related notification
                const isInquiryNotification =
                  notificationData?.code === "INQUIRY_DM_USER" ||
                  notificationData?.title?.toLowerCase().includes("inquiry") ||
                  notificationData?.title
                    ?.toLowerCase()
                    .includes("message from admin");

                if (notificationData?.title && notificationData?.message) {
                  success(notificationData.title, {
                    description: notificationData.message,
                  });
                } else if (notificationData?.message) {
                  info(notificationData.message);
                }

                // Trigger inquiry check if this is an inquiry notification
                if (isInquiryNotification && inquiryCheckCallback) {
                  inquiryCheckCallback();
                }

                // Trigger router refresh
                if (routerRefreshFn) {
                  routerRefreshFn();
                }
                break;
              }

              case "wallet": {
                // Update user wallet
                const walletData = data.data as WalletData;
                if (walletData?.wallet !== undefined) {
                  const authStore = useAuthStore();
                  authStore.updateUser({ wallet: String(walletData.wallet) });
                }
                break;
              }

              default:
                // Handle unknown events
                console.log("🔌 Unknown WebSocket event:", data.event);
                break;
            }
          } catch {
            // Handle non-JSON messages (ping/pong)
            if (event.data === "ping") {
              newWs.send("pong");
            }
          }
        };

        /**
         * onclose - Connection closed
         */
        newWs.onclose = (event) => {
          ws.value = null;
          isConnected.value = false;
          connectionError.value = `Connection closed: ${event.reason || "Unknown reason"}`;
          isConnecting = false;

          console.log("🔌 WebSocket closed:", event.code, event.reason);

          // Attempt reconnection if it wasn't a manual close (code 1000)
          if (event.code !== 1000) {
            const currentAttempts = reconnectAttempts.value;
            if (currentAttempts < maxReconnectAttempts) {
              const delay = 2000 * (currentAttempts + 1); // Exponential backoff
              console.log(
                `🔌 Reconnecting in ${delay}ms (attempt ${currentAttempts + 1}/${maxReconnectAttempts})`,
              );

              setTimeout(() => {
                reconnectAttempts.value = currentAttempts + 1;
                connect();
              }, delay);
            } else {
              console.error("🔌 Max reconnection attempts reached");
            }
          }
        };

        /**
         * onerror - Connection error
         */
        newWs.onerror = (error) => {
          console.error("🔌 WebSocket connection error:", error);
          ws.value = null;
          isConnected.value = false;
          connectionError.value = "Connection failed";
          isConnecting = false;
        };

        ws.value = newWs;

        // Start periodic session validation (every 30 seconds)
        // Detects if session was invalidated by another login
        if (sessionCheckInterval) clearInterval(sessionCheckInterval);
        sessionCheckInterval = setInterval(async () => {
          try {
            await axiosClient.get("/auth/v");
          } catch {
            // 401 will be caught by axios interceptor which handles redirect
          }
        }, 30_000);
      } catch (error) {
        console.error("🔌 WebSocket connection failed:", error);
        ws.value = null;
        isConnected.value = false;
        connectionError.value = `Connection failed: ${error instanceof Error ? error.message : "Unknown error"}`;
        isConnecting = false;
      }
    }
  };

  /**
   * Disconnect from WebSocket server
   * Closes connection gracefully and resets state
   */
  const disconnect = () => {
    if (ws.value) {
      console.log("🔌 Disconnecting WebSocket");
      ws.value.close(1000, "Manual disconnect"); // Normal closure
    }

    // Stop session check polling
    if (sessionCheckInterval) {
      clearInterval(sessionCheckInterval);
      sessionCheckInterval = null;
    }

    ws.value = null;
    isConnected.value = false;
    connectionError.value = null;
    reconnectAttempts.value = 0;
  };

  // ============================================================================
  // RETURN PUBLIC API
  // ============================================================================

  return {
    // State
    ws,
    isConnected,
    connectionError,
    reconnectAttempts,

    // Actions
    connect,
    disconnect,
    setRouterRefresh,
    setInquiryCheckCallback,
  };
});
