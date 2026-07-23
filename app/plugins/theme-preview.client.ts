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

const MAX_DEPTH = 12;
const MAX_PROPERTIES = 5000;
const BLOCKED_KEYS = new Set(["__proto__", "constructor", "prototype"]);

function normalizePreviewOrigin(raw: string): string | null {
  try {
    const url = new URL(raw);
    const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
    if (url.origin !== raw || (url.protocol !== "https:" && !(local && url.protocol === "http:")))
      return null;
    return url.origin;
  } catch {
    return null;
  }
}

/**
 * A `blob:` URL is only dereferenceable by the origin that created it — the
 * browser partitions its blob store per origin. So a `blob:https://admin.host/…`
 * minted in the admin panel can NEVER be loaded by this iframe, whatever the
 * CSP says; the request fails before it reaches the network.
 *
 * The admin must post the File/Blob itself (structured clone handles it) so the
 * iframe can mint its own same-origin object URL — see the Blob branch in
 * `validateThemeDraft`. Until it does, a foreign blob URL is dropped rather
 * than rendered, so the previous image stays instead of a broken-image icon.
 */
function isForeignBlobUrl(value: string): boolean {
  if (!value.startsWith("blob:")) return false;
  try {
    // The part after `blob:` is the owning origin.
    return new URL(value.slice(5)).origin !== window.location.origin;
  } catch {
    return true;
  }
}

/** Validate bounds and clone into fresh plain objects before making it reactive. */
export function validateThemeDraft(value: unknown): SiteConfig | null {
  let properties = 0;
  const visit = (input: unknown, depth: number): unknown => {
    if (depth > MAX_DEPTH || ++properties > MAX_PROPERTIES) throw new Error("draft too large");
    if (input === null || typeof input === "boolean") return input;
    if (typeof input === "number") {
      if (!Number.isFinite(input)) throw new Error("invalid number");
      return input;
    }
    if (typeof input === "string") {
      if (input.length > 200_000) throw new Error("string too large");
      // Unusable in this document — drop it so the merge falls back instead of
      // rendering a broken image.
      return isForeignBlobUrl(input) ? null : input;
    }
    if (Array.isArray(input)) return input.map((item) => visit(item, depth + 1));
    if (typeof input !== "object") throw new Error("unsupported value");
    // A File/Blob survives structured clone, so the admin can post the picked
    // file directly. Mint a same-origin object URL the iframe can actually
    // load. (Must precede the plain-object check — a Blob is not plain.)
    if (typeof Blob !== "undefined" && input instanceof Blob) {
      return URL.createObjectURL(input);
    }
    const prototype = Object.getPrototypeOf(input);
    if (prototype !== Object.prototype && prototype !== null)
      throw new Error("non-plain object");
    const output: Record<string, unknown> = Object.create(null);
    for (const [key, child] of Object.entries(input as Record<string, unknown>)) {
      if (BLOCKED_KEYS.has(key) || key.length > 128) throw new Error("invalid key");
      output[key] = visit(child, depth + 1);
    }
    return output;
  };

  try {
    const result = visit(value, 0);
    if (!result || typeof result !== "object" || Array.isArray(result)) return null;
    return result as SiteConfig;
  } catch {
    return null;
  }
}

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
        .map(normalizePreviewOrigin)
        .filter((origin): origin is string => origin !== null),
    ],
  );

  // ── Grab the shared useState ref for live theme updates ──────────────────
  const userPageConfig = useState<SiteConfig | null>(
    "userPageConfig",
    () => null,
  );

  // ── 1. Signal readiness to the parent frame ─────────────────────────────
  onNuxtReady(() => {
    for (const origin of allowedOrigins) {
      try {
        window.parent.postMessage({ type: "theme-preview-ready" }, origin);
      } catch {
        // Some browser security modes block cross-frame postMessage.
      }
    }
  });

  // ── 2. Listen for config updates from the parent frame ───────────────────
  const handleMessage = (event: MessageEvent): void => {
    // Reject messages from any origin not in our allowlist
    if (event.source !== window.parent || !allowedOrigins.has(event.origin)) return;

    const data = event.data as Record<string, unknown> | null;
    if (!data || data["type"] !== "theme-draft") return;

    const draft = validateThemeDraft(data["config"]);
    if (!draft) return;

    // Write into shared state — useSiteConfig() reads this and re-renders
    userPageConfig.value = draft;
  };

  window.addEventListener("message", handleMessage);

  // Clean up when the Nuxt app unmounts (e.g., HMR reload in dev)
  onUnmounted(() => {
    window.removeEventListener("message", handleMessage);
  });
});
