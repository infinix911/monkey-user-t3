/**
 * Theme Preview Plugin (client only)
 *
 * When the current page is loaded inside the theme-editor's preview iframe
 * (detected via ?themePreview=1), this plugin:
 *
 * 1. Posts `{ type: 'theme-preview-ready' }` to the parent frame once the app
 *    is mounted, signalling that the iframe is ready to receive config updates.
 *
 * 2. Listens for `{ type: 'theme-draft', config: SiteConfig }` messages from
 *    the parent frame and writes the received config into useState('userPageConfig')
 *    so useSiteConfig() re-renders the whole app reactively — no page reload
 *    needed.
 *
 * All logic is guarded behind the ?themePreview=1 flag and an explicit
 * origin allowlist, so there is zero overhead for normal visitors.
 *
 * The admin panel lives on a DIFFERENT origin; permitted parent origins are
 * read from NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN (comma-separated list).
 * location.origin is always implicitly allowed for same-origin dev.
 *
 * PostMessage protocol (must match the admin panel's PreviewFrame component):
 *   iframe → parent : { type: 'theme-preview-ready' }
 *   parent → iframe : { type: 'theme-draft', config: SiteConfig }
 */

import type { SiteConfig } from "@/composables/useDefaultThemeConfig";

export default defineNuxtPlugin(() => {
  // Guard: only activate inside the preview iframe
  if (!import.meta.client) return;

  const isPreview =
    new URLSearchParams(window.location.search).get("themePreview") === "1";
  if (!isPreview) return;

  // ── Build the allowlist of permitted parent origins ──────────────────────
  // NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN may be a comma-separated list of origins
  // (e.g. "https://admin.example.com,https://admin-staging.example.com").
  // location.origin is always included so same-origin dev works without config.
  const config = useRuntimeConfig();
  const rawEnv = (config.public.adminPreviewOrigin as string | undefined) ?? "";
  const allowedOrigins = new Set<string>(
    [
      location.origin,
      ...rawEnv
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean),
    ],
  );

  // ── Grab the shared useState ref for live theme updates ──────────────────
  const userPageConfig = useState<SiteConfig | null>(
    "userPageConfig",
    () => null,
  );

  // ── 1. Signal readiness to the parent frame ─────────────────────────────
  // Use '*' so the signal reaches the admin panel regardless of whether
  // NUXT_PUBLIC_ADMIN_PREVIEW_ORIGIN is configured. The payload is a
  // no-op ping with no sensitive data, so broadcasting is safe.
  onNuxtReady(() => {
    try {
      window.parent.postMessage({ type: "theme-preview-ready" }, "*");
    } catch {
      // Swallow — some browser security modes block cross-frame postMessage.
    }
  });

  // ── 2. Listen for config updates from the parent frame ───────────────────
  const handleMessage = (event: MessageEvent): void => {
    // Reject messages from any origin not in our allowlist
    if (!allowedOrigins.has(event.origin)) return;

    const data = event.data as Record<string, unknown> | null;
    if (!data || data["type"] !== "theme-draft") return;

    const config = data["config"];
    if (!config || typeof config !== "object") return;

    // Write into shared state — useSiteConfig() reads this and re-renders
    userPageConfig.value = config as SiteConfig;
  };

  window.addEventListener("message", handleMessage);

  // Clean up when the Nuxt app unmounts (e.g., HMR reload in dev)
  onUnmounted(() => {
    window.removeEventListener("message", handleMessage);
  });
});
