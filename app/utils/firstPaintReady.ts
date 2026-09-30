/**
 * Helpers for showing a modal or panel only once its first paint will already
 * be at its final size.
 *
 * Every modal/panel that loads data, images or late fonts after mounting used
 * to open at one size and jump to another when they landed. Each one now runs
 * its "prepare" step (built from these helpers) before it is shown: modals
 * inside their lazy-loader, alongside the chunk import, so it costs no extra
 * time; account panels in `useAccountSection().open()`.
 */

/**
 * Upper bound on how long a first open waits for its prepare step. Only a
 * hung request ever reaches it; the modal then opens and fills in as before.
 */
export const FIRST_PAINT_CAP_MS = 1500;

/**
 * Resolve once every task has settled, or after {@link FIRST_PAINT_CAP_MS}.
 * Never rejects — a failed task just means that piece renders as it did before.
 *
 * @param tasks - Work the first paint depends on.
 * @returns {Promise<void>} Resolves when ready or capped.
 */
export function whenReady(tasks: Array<Promise<unknown> | undefined>): Promise<void> {
  const ready = Promise.allSettled(tasks.filter(Boolean)).then(() => undefined);
  const cap = new Promise<void>(resolve => setTimeout(resolve, FIRST_PAINT_CAP_MS));
  return Promise.race([ready, cap]);
}

/**
 * Download and decode an image so an `<img>` with an intrinsic height paints
 * at full size immediately instead of growing when the file arrives.
 *
 * @param src - Image URL; empty/undefined resolves immediately.
 * @returns {Promise<void>} Resolves when decoded (or on failure).
 */
export function preloadImage(src?: string | null): Promise<void> {
  if (!src || typeof Image === "undefined") return Promise.resolve();
  const img = new Image();
  img.src = src;
  return img.decode().catch(() => undefined);
}

/**
 * Load the Korean LINE Seed weights (Regular + Bold). Only the Latin faces are
 * preloaded site-wide — the Korean files are ~500 KB each — so a modal that is
 * the first to render Korean text in a weight painted in the fallback font and
 * re-laid out taller on the swap.
 *
 * @returns {Promise<unknown>} Resolves when both faces are loaded.
 */
export function loadKoreanFonts(): Promise<unknown> {
  if (typeof document === "undefined" || !document.fonts) return Promise.resolve();
  return Promise.all(["400", "700"].map(weight => document.fonts.load(`${weight} 16px "LINE Seed"`, "가")));
}
