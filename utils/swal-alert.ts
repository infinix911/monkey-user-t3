/**
 * Alert helper utilities.
 *
 * Formerly backed by sweetalert2; now delegates to the in-house imperative
 * dialog (`fireDialog`, rendered by app/components/ui/AppDialog.vue). The public
 * signatures are unchanged so the ~50 existing call sites keep working.
 */

import {
  fireDialog,
  type DialogOptions,
} from "~/composables/useDialogQueue";

interface SwalAlertOptions {
  title: string;
  text?: string;
  html?: string;
  icon?: "success" | "error" | "warning" | "info" | "question";
  confirmButtonText?: string;
  confirmButtonColor?: string;
  showConfirmButton?: boolean;
  showCloseButton?: boolean;
  allowOutsideClick?: boolean;
  allowEscapeKey?: boolean;
  timer?: number;
  timerProgressBar?: boolean;
}

export const showSwalAlert = async (options: SwalAlertOptions) => {
  const {
    title,
    text,
    html,
    icon = "info",
    confirmButtonText = "OK",
    confirmButtonColor = "#04c000",
    showConfirmButton = true,
    showCloseButton = false,
    allowOutsideClick = true,
    allowEscapeKey = true,
    timer,
    timerProgressBar = false,
  } = options;

  const dialogOptions: DialogOptions = {
    title,
    text,
    html,
    icon,
    confirmButtonText,
    confirmButtonColor,
    showConfirmButton,
    showCloseButton,
    allowOutsideClick,
    allowEscapeKey,
    timer,
    timerProgressBar,
  };

  return fireDialog(dialogOptions);
};

export const showSuccessAlert = async (title: string, text?: string) => {
  return showSwalAlert({
    title,
    text,
    icon: "success",
    confirmButtonText: "OK",
    confirmButtonColor: "#04c000",
  });
};

export const showErrorAlert = async (
  title: string,
  content?: string,
  confirmButtonText: string = "OK",
) => {
  const useHtml = content && /<[a-z][\s\S]*>/i.test(content);
  return showSwalAlert({
    title,
    ...(useHtml ? { html: content } : { text: content }),
    icon: "error",
    confirmButtonText,
    showConfirmButton: true,
    allowOutsideClick: true,
    allowEscapeKey: true,
  });
};

export const showWarningAlert = async (title: string, content?: string) => {
  const useHtml = content && /<[a-z][\s\S]*>/i.test(content);
  return showSwalAlert({
    title,
    ...(useHtml ? { html: content } : { text: content }),
    icon: "warning",
  });
};

/**
 * Auto-dismissing dialog for transient feedback (copy confirmations, info /
 * warning notices). Renders the same centered dialog but closes itself after
 * `timer` ms with no button — used where a blocking "click OK" would be
 * intrusive. Toasts remain reserved for websocket notifications.
 */
export const showAutoAlert = async (
  title: string,
  icon: "success" | "error" | "warning" | "info" = "success",
  timer: number = 1800,
) => {
  return showSwalAlert({
    title,
    icon,
    timer,
    timerProgressBar: true,
    showConfirmButton: false,
    allowOutsideClick: true,
  });
};

export const showLoadingAlert = async (title: string, text?: string) => {
  return fireDialog({
    title,
    text,
    icon: "info",
    loading: true,
    showConfirmButton: false,
    allowOutsideClick: false,
  });
};

export const showConfirmationAlert = async (
  title: string,
  text: string,
  confirmButtonText: string = "Yes",
  cancelButtonText: string = "No",
  confirmButtonColor: string = "#dc2626",
  cancelButtonColor: string = "#6b7280",
): Promise<boolean> => {
  const result = await fireDialog({
    title,
    text,
    icon: "warning",
    showCancelButton: true,
    confirmButtonColor,
    cancelButtonColor,
    confirmButtonText,
    cancelButtonText,
  });

  return result.isConfirmed;
};
