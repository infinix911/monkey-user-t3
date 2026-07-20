/**
 * WebSocket message interface
 * Used for parsing incoming WebSocket messages from the server
 */
export interface WebSocketMessage {
  event: string;
  data: unknown;
}

/**
 * WebSocket notification data structure
 */
export interface NotificationData {
  title?: string;
  message?: string;
  code?: string;
}

/**
 * WebSocket wallet update data structure
 */
export interface WalletData {
  wallet?: string | number;
  point?: string | number;
}
