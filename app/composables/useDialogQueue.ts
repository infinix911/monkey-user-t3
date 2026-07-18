import { ref } from "vue";

/**
 * Imperative dialog controller — the in-house replacement for sweetalert2.
 *
 * A single <AppDialog> (mounted once in app.vue) reads `activeDialog` and
 * renders it. `fireDialog()` sets the active request and returns a Promise that
 * resolves when the user confirms / cancels / dismisses — mirroring
 * `await Swal.fire(...)` so existing call sites keep working unchanged.
 */

export type DialogIcon = "success" | "error" | "warning" | "info" | "question";

export interface DialogOptions {
  title: string;
  text?: string;
  html?: string;
  icon?: DialogIcon;
  confirmButtonText?: string;
  cancelButtonText?: string;
  confirmButtonColor?: string;
  cancelButtonColor?: string;
  showConfirmButton?: boolean;
  showCancelButton?: boolean;
  showCloseButton?: boolean;
  allowOutsideClick?: boolean;
  allowEscapeKey?: boolean;
  timer?: number;
  timerProgressBar?: boolean;
  /** When true, render a spinner and suppress buttons (loading state). */
  loading?: boolean;
}

export interface DialogResult {
  isConfirmed: boolean;
  isDismissed: boolean;
  isDenied: false;
}

interface ActiveDialog extends DialogOptions {
  id: number;
}

// Module-level singleton state — shared across every importer.
const activeDialog = ref<ActiveDialog | null>(null);
let resolver: ((result: DialogResult) => void) | null = null;
let counter = 0;

const CONFIRMED: DialogResult = {
  isConfirmed: true,
  isDismissed: false,
  isDenied: false,
};
const DISMISSED: DialogResult = {
  isConfirmed: false,
  isDismissed: true,
  isDenied: false,
};

/**
 * Show a dialog. Resolves when the user closes it. A new call supersedes any
 * dialog currently open (the previous promise resolves as dismissed), matching
 * sweetalert's single-instance behaviour.
 */
export const fireDialog = (options: DialogOptions): Promise<DialogResult> => {
  // Supersede an already-open dialog so we never leak a pending promise.
  if (resolver) {
    resolver(DISMISSED);
    resolver = null;
  }

  activeDialog.value = { ...options, id: ++counter };

  return new Promise<DialogResult>((resolve) => {
    resolver = resolve;
  });
};

/** Resolve the active dialog and tear it down. */
export const resolveDialog = (result: DialogResult): void => {
  if (!activeDialog.value) return;
  const resolve = resolver;
  resolver = null;
  activeDialog.value = null;
  resolve?.(result);
};

export const confirmDialog = (): void => resolveDialog(CONFIRMED);
export const dismissDialog = (): void => resolveDialog(DISMISSED);

/** Read-only handle for the presentational component. */
export const useDialogQueue = () => ({
  activeDialog,
  confirmDialog,
  dismissDialog,
});
