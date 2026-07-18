/**
 * Utility functions for game navigation
 * Ported from banana-lucky-next/lib/utils/game-navigation.ts
 */

/**
 * Check if the user is on a mobile device
 */
export function isMobile(): boolean {
  if (typeof window === "undefined") return false;
  return (
    /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
    window.innerWidth <= 768
  );
}

/**
 * Check if the user logged in via token (from chat/external link)
 */
export function isTokenLogin(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("tokenLogin") === "true";
}

/**
 * Check if the session was opened via Telegram (has chatId in URL or was marked as such)
 */
export function isOpenedViaTelegram(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has("chatId")) {
    // Mark this session as opened via Telegram
    sessionStorage.setItem("openedViaTelegram", "true");
    return true;
  }
  return sessionStorage.getItem("openedViaTelegram") === "true";
}

/**
 * Check if the session was opened via Telegram Offline bot
 * (uses partner deposit/withdraw instead of regular deposit/withdraw)
 */
export function isOpenedViaTelegramOffline(): boolean {
  if (typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  if (params.has("offline") && params.get("offline") === "true") {
    sessionStorage.setItem("openedViaTelegramOffline", "true");
    return true;
  }
  return sessionStorage.getItem("openedViaTelegramOffline") === "true";
}

/**
 * Check if games should open in the same window (only when opened via Telegram)
 */
export function shouldOpenGameInSameWindow(): boolean {
  return isOpenedViaTelegram();
}

/**
 * Open a game URL - navigates in same window inside Telegram, otherwise opens in a new tab
 */
export function openGame(gameUrl: string): void {
  if (shouldOpenGameInSameWindow()) {
    // Inside Telegram WebApp, navigate in the same window
    window.location.href = gameUrl;
  } else {
    window.open(gameUrl, "_blank", "noopener,noreferrer");
  }
}
