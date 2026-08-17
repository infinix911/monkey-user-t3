/**
 * Utility functions for game navigation
 * Ported from banana-lucky-next/lib/utils/game-navigation.ts
 */

import { blockedByUnreadInquiries } from "~/utils/unreadInquiryGuard";
import {
  requestEvolutionOneToTenConsent,
  requiresEvolutionOneToTenConsent,
} from "~/composables/useEvolutionOneToTenConsent";

export interface GameLaunchOptions {
  /** Display name supplied by the launch surface, used for policy-specific gates. */
  gameName?: string;
}

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
 * Check if the session was opened via Telegram Offline bot.
 * Currently unused — the offline deposit/withdraw variant it used to gate was
 * the partner flow, removed with the partner section.
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
 * Open a game URL - navigates in same window inside Telegram, otherwise opens
 * in a new tab.
 *
 * Blocked while the member has unread inquiry replies: an unread reply is
 * usually the operator asking for something, and launching a game buries it.
 * Guarded HERE rather than at each call site so every launch surface —
 * HomeGameCard, LobbyCard, SubGames, RecentlyPlayed, Recommended, the home
 * page and slot-RTP — is covered by construction, and a new one cannot miss
 * it. Fire-and-forget: the guard shows the warning and opens the inquiry
 * modal itself, so callers need not await.
 */
export function openGame(gameUrl: string, options: GameLaunchOptions = {}): void {
  void blockedByUnreadInquiries().then((blocked) => {
    if (blocked) return;
    if (!requiresEvolutionOneToTenConsent(options.gameName)) {
      launchGame(gameUrl);
      return;
    }

    void requestEvolutionOneToTenConsent().then((consented) => {
      if (consented) launchGame(gameUrl);
    });
  });
}

/** Perform the actual navigation, once the guard has allowed it. */
function launchGame(gameUrl: string): void {
  if (shouldOpenGameInSameWindow()) {
    // Inside Telegram WebApp, navigate in the same window
    window.location.href = gameUrl;
  } else {
    window.open(gameUrl, "_blank", "noopener,noreferrer");
  }
}
