/**
 * useProfileNavigation — what a profile menu item does when it is chosen.
 *
 * One implementation for every surface. The modal and the desktop sidebar differ
 * only in what should happen *after* a navigation — the modal dismisses itself,
 * the rail stays put — which is the single `onNavigate` hook.
 */

import { showWarningAlert, showAutoAlert } from "~~/utils/swal-alert";
import { useApi } from "@/composables/useApi";
import {
  isAccountSection,
  useAccountSection,
} from "@/composables/useAccountSections";
import type { MenuItem } from "@/composables/useProfileMenuItems";

export interface UseProfileNavigationOptions {
  /**
   * Called after an item navigates or completes a one-shot action, so a host
   * that is an overlay can dismiss itself. Omit for a persistent surface.
   */
  onNavigate?: () => void;
  /** Opens the promotion feature modal. */
  onPromotion: () => void;
  /** Opens the activity feature modal. */
  onActivity: () => void;
}

/**
 * Resolves a menu item click.
 *
 * @param options - Host-specific hooks.
 * @returns {object} The shared `handleItemClick`.
 */
export function useProfileNavigation(options: UseProfileNavigationOptions) {
  const siteStore = useSiteStore();
  const router = useRouter();
  const localePath = useLocalePath();
  const { t } = useI18n();
  const { installPWA } = usePWAInstall();
  const accountSection = useAccountSection();
  const authStore = useAuthStore();
  const api = useApi();

  /**
   * Normalises a CMS id for matching (catches livechat / liveChat / live_chat).
   *
   * @param id - Raw item id.
   * @returns {string} Lowercased, letters only.
   */
  const normalize = (id: string): string =>
    id.replace(/[^a-z]/gi, "").toLowerCase();

  /**
   * Installs the PWA, or explains that it is Android-only.
   *
   * @returns {Promise<void>} Resolves once the attempt settles.
   */
  async function handleApkClick(): Promise<void> {
    const isAndroid =
      typeof navigator !== "undefined" && /Android/i.test(navigator.userAgent);
    if (!isAndroid) {
      await showWarningAlert(t("profile.apkAndroidOnly"));
      options.onNavigate?.();
      return;
    }
    const result = await installPWA();
    if (!result.success && result.error === "install_not_available") {
      showAutoAlert(t("profile.installNotAvailableText"), "info");
    }
    options.onNavigate?.();
  }

  /**
   * Runs the behaviour behind one menu item.
   *
   * @param item - The chosen item.
   * @returns {void}
   */
  /**
   * Menu ids that stay reachable while unread replies are blocking everything
   * else. Without this the member is trapped: the warning tells them to read
   * their inquiries, but the item that opens them is itself gated.
   * `faq` is the CMS id for the 공지사항 slot.
   */
  const UNREAD_GUARD_EXEMPT = new Set(["inquiry", "faq", "notice", "livechat"]);

  function handleItemClick(item: MenuItem): void {
    const id = normalize(item.id);

    // Unread inquiry replies block the rest of the account menu — see
    // `blockedByUnreadInquiries`. Async, so this returns immediately and the
    // guard shows the warning (and opens the inquiry surface) on its own.
    if (!UNREAD_GUARD_EXEMPT.has(item.id) && !UNREAD_GUARD_EXEMPT.has(id)) {
      void blockedByUnreadInquiries().then((blocked) => {
        if (!blocked) runItemClick(item);
      });
      return;
    }

    runItemClick(item);
  }

  /** The item's real behaviour, once the unread guard has allowed it. */
  function runItemClick(item: MenuItem): void {
    const id = normalize(item.id);

    // Live chat — open the configured URL in a new tab, same as the header's
    // live-chat button.
    if (id === "livechat") {
      const url = siteStore.siteSettings?.["site:livechat"];
      if (url) {
        window.open(url, "_blank", "noopener,noreferrer");
      } else {
        console.log("[profile] live chat link (site:livechat) not configured");
      }
      // Drop focus so the tile doesn't linger in a focused/active state (this
      // branch neither navigates nor closes the host).
      if (import.meta.client && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }
      return;
    }

    if (item.id === "apk") {
      void handleApkClick();
      return;
    }

    if (item.id === "promotion") {
      options.onPromotion();
      return;
    }

    if (item.id === "activity") {
      options.onActivity();
      return;
    }

    // RTP — the slot-RTP page. Normalised to catch rtp / slot-rtp / slotRtp.
    if (id === "rtp" || id === "slotrtp") {
      router.push(localePath("/slot-rtp"));
      options.onNavigate?.();
      return;
    }

    if (isAccountSection(item.id)) {
      accountSection.open(item.id);
      return;
    }

    if (item.href) {
      // An absolute href leaves this app (the partner console, a Telegram
      // deep link), so it opens in a new tab. Routing it would ask the router
      // to resolve "https://…" as an in-app path and land nowhere.
      if (/^https?:\/\//i.test(item.href)) {
        window.open(item.href, "_blank", "noopener,noreferrer");
        return;
      }
      router.push(localePath(item.href));
    }
    options.onNavigate?.();
  }

  /**
   * Signs the user out and returns to the home page.
   *
   * @returns {Promise<void>} Resolves once logout settles.
   */
  async function handleLogout(): Promise<void> {
    try {
      await api("/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      authStore.logout();
      accountSection.close();
      options.onNavigate?.();
      router.push(localePath("/"));
    }
  }

  return { handleItemClick, handleLogout };
}
