/**
 * Inquiry mutations composable
 * Ported from banana-lucky-next/lib/hooks/useInquiryMutations.ts
 *
 * Converts:
 * - useCallback → plain functions
 * - useTranslations() → useI18n().t
 * - useRouter from next/navigation → useRouter from Nuxt
 * - router.refresh() → onRefresh callback (SPA-safe, no SSR router.refresh)
 * - axiosInstance → axiosClient from ~/lib/axios-client
 * - showSuccessAlert/showErrorAlert → ~/utils/swal-alert
 */

import axiosClient from "~/lib/axios-client";
import { showSuccessAlert, showErrorAlert } from "~~/utils/swal-alert";
import type { RepliesResponse } from "~/interfaces/inquiry.interface";


const TRANSLATABLE_ERRORS = {
  CREATE_INQUIRY: [
    "PENDING_INQUIRY_FOUND",
    "MEMBER_NOT_FOUND",
    "INTERNAL_ERROR",
  ],
  UPDATE_STATUS: ["INQUIRY_NOT_FOUND", "INTERNAL_ERROR"],
  SEND_REPLY: ["INQUIRY_NOT_FOUND", "INTERNAL_ERROR"],
};

/**
 * Composable for inquiry-related mutations (create, update, delete, reply)
 */
export const useInquiryMutations = (onRefresh?: () => Promise<void>) => {
  const { t } = useI18n();
  const router = useRouter();

  /**
   * Translate API error messages or fallback to raw error
   */
  const getTranslatedError = (
    errorMessage: string,
    translatableList: string[],
  ): string => {
    return translatableList.includes(errorMessage)
      ? t(`inquiry.apiMessages.${errorMessage}`)
      : errorMessage;
  };

  /**
   * Create a new inquiry
   */
  const createInquiry = async (
    title: string,
    content: string,
  ): Promise<void> => {
    try {
      const response = await axiosClient.post("/inquiries", {
        title,
        message: content,
      });

      const apiMessage = response.data?.message || "INQUIRY_CREATED";

      await showSuccessAlert(
        t("inquiry.inquirySent"),
        t(`inquiry.apiMessages.${apiMessage}`),
      );

      // Refresh inquiry data
      if (onRefresh) {
        await onRefresh();
      } else {
        router.go(0);
      }
    } catch (error: unknown) {
      const errorMessage = apiErrorMessageOr(
        error,
        "An unexpected error occurred",
      );

      const translatedMessage = getTranslatedError(
        errorMessage,
        TRANSLATABLE_ERRORS.CREATE_INQUIRY,
      );

      await showErrorAlert(t("inquiry.sendInquiryFailed"), translatedMessage);
    }
  };

  /**
   * Update inquiry status (mark read, delete, close)
   */
  const updateInquiryStatus = async (
    inquiryId: string,
    status: number | string,
  ): Promise<void> => {
    const isMarkRead = status === 4;

    try {
      const response = await axiosClient.patch(`/inquiries/${inquiryId}`, {
        status,
      });

      const apiMessage = response.data?.message;
      const successMessage = apiMessage
        ? t(`inquiry.apiMessages.${apiMessage}`)
        : isMarkRead
          ? t("inquiry.markReadSuccess")
          : t("inquiry.deleteSuccess");

      await showSuccessAlert(t("inquiry.success"), successMessage);

      // Refresh inquiry data
      if (onRefresh) {
        await onRefresh();
      } else {
        router.go(0);
      }
    } catch (error: unknown) {
      const errorMessage = apiErrorMessageOr(
        error,
        "An unexpected error occurred",
      );

      const translatedMessage = getTranslatedError(
        errorMessage,
        TRANSLATABLE_ERRORS.UPDATE_STATUS,
      );

      const errorTitle = isMarkRead
        ? t("inquiry.markRead")
        : t("inquiry.delete");

      await showErrorAlert(errorTitle, translatedMessage);
    }
  };

  /**
   * Update all inquiries status
   */
  const updateAllInquiriesStatus = async (
    status: number | string,
  ): Promise<void> => {
    const isDelete = status === "delete";
    const isMarkRead = status === 4;

    try {
      const response = await axiosClient.patch("/inquiries/", { status });

      const apiMessage = response.data?.message;
      const successMessage = apiMessage
        ? t(`inquiry.apiMessages.${apiMessage}`)
        : isDelete
          ? t("inquiry.deleteAllSuccess")
          : t("inquiry.markAllReadSuccess");

      await showSuccessAlert(t("inquiry.success"), successMessage);

      // Refresh inquiry data in-place when a refresh callback is available
      // (e.g. inside NewProfileModal) — a full router.go(0) reload would
      // close the modal. Fall back to a reload only when no callback exists.
      if (onRefresh) {
        await onRefresh();
      } else {
        router.go(0);
      }
    } catch (error: unknown) {
      const errorMessage = apiErrorMessageOr(
        error,
        "An unexpected error occurred",
      );

      const translatedMessage = getTranslatedError(
        errorMessage,
        TRANSLATABLE_ERRORS.UPDATE_STATUS,
      );

      const errorTitle = isMarkRead
        ? t("inquiry.markAllRead")
        : t("inquiry.deleteAll");

      await showErrorAlert(errorTitle, translatedMessage);
    }
  };

  /**
   * Request a bank account
   */
  const requestBankAccount = async (): Promise<void> => {
    try {
      await axiosClient.post("/inquiries", {
        title: "DEPOSIT_ACCOUNT_REQUEST",
        message: "DEPOSIT_ACCOUNT_REQUEST",
      });

      await showSuccessAlert(
        t("inquiry.success"),
        t("inquiry.bankAccountRequestSent"),
      );

      router.go(0);
    } catch (error: unknown) {
      const errorMessage = apiErrorMessageOr(
        error,
        "An unexpected error occurred",
      );

      const translatedMessage = getTranslatedError(
        errorMessage,
        TRANSLATABLE_ERRORS.CREATE_INQUIRY,
      );

      await showErrorAlert(t("inquiry.accountInquiry"), translatedMessage);
    }
  };

  /**
   * Close an inquiry
   */
  const closeInquiry = async (inquiryId: string): Promise<void> => {
    try {
      const response = await axiosClient.patch(`/inquiries/${inquiryId}`, {
        status: "close",
      });

      const apiMessage = response.data?.message;
      const successMessage = apiMessage
        ? t(`inquiry.apiMessages.${apiMessage}`)
        : t("inquiry.closeInquirySuccess");

      await showSuccessAlert(t("inquiry.success"), successMessage);

      // Refresh inquiry data
      if (onRefresh) {
        await onRefresh();
      } else {
        router.go(0);
      }
    } catch (error: unknown) {
      const errorMessage = apiErrorMessageOr(
        error,
        "An unexpected error occurred",
      );

      const translatedMessage = getTranslatedError(
        errorMessage,
        TRANSLATABLE_ERRORS.UPDATE_STATUS,
      );

      await showErrorAlert(t("inquiry.closeInquiryFailed"), translatedMessage);
    }
  };

  /**
   * Send a reply to an inquiry
   */
  const sendReply = async (
    inquiryId: string,
    message: string,
  ): Promise<RepliesResponse | null> => {
    if (!message || !message.trim()) {
      await showErrorAlert(t("common.error"), t("inquiry.emptyReplyError"));
      return null;
    }

    try {
      await axiosClient.post(`/inquiries/${inquiryId}/reply`, { message });

      // Reload replies to show the new one
      const params = new URLSearchParams({ limit: "20" });
      const response = await axiosClient.get<RepliesResponse>(
        `/inquiries/${inquiryId}/replies?${params.toString()}`,
      );

      return response.data;
    } catch (error: unknown) {
      const errorMessage = apiErrorMessageOr(
        error,
        "An unexpected error occurred",
      );

      const translatedMessage = getTranslatedError(
        errorMessage,
        TRANSLATABLE_ERRORS.SEND_REPLY,
      );

      await showErrorAlert(t("common.error"), translatedMessage);
      return null;
    }
  };

  /**
   * Fetch replies for an inquiry
   */
  const fetchReplies = async (
    inquiryId: string,
  ): Promise<RepliesResponse | null> => {
    try {
      const params = new URLSearchParams({ limit: "20" });
      const response = await axiosClient.get<RepliesResponse>(
        `/inquiries/${inquiryId}/replies?${params.toString()}`,
      );
      return response.data;
    } catch (error: unknown) {
      const errorMessage = apiErrorMessageOr(error, "Failed to load replies");

      await showErrorAlert(t("common.error"), errorMessage);
      return null;
    }
  };

  /**
   * Silently mark inquiry as read (no success alert)
   * Used for auto-marking when expanding inquiries
   */
  const markInquiryAsReadSilent = async (inquiryId: string): Promise<void> => {
    try {
      await axiosClient.patch(`/inquiries/${inquiryId}/read`, {});

      // Refresh inquiry data silently
      if (onRefresh) {
        await onRefresh();
      } else {
        router.go(0);
      }
    } catch (error: unknown) {
      // Silent fail — just log the error
      console.error("Failed to mark inquiry as read:", error);
    }
  };

  return {
    createInquiry,
    updateInquiryStatus,
    updateAllInquiriesStatus,
    requestBankAccount,
    closeInquiry,
    sendReply,
    fetchReplies,
    markInquiryAsReadSilent,
  };
};
