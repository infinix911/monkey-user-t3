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
import { useMemberInboxStore } from "~/stores/member-inbox";


// The per-operation TRANSLATABLE_ERRORS allowlists were removed: apiMessage()
// translates only tokens that exist under inquiry.apiMessages, so the lists were
// a second copy of the i18n file that had to be kept in sync by hand.

/**
 * Composable for inquiry-related mutations (create, update, delete, reply)
 */
export const useInquiryMutations = (onRefresh?: () => Promise<void>) => {
  const { t } = useI18n();
  const apiMessage = useApiMessage();
  const inbox = useMemberInboxStore();

  /** Invalidate every derived inbox view before reloading the active feed. */
  const refreshInbox = async () => {
    inbox.invalidateInquiries(false);
    if (onRefresh) await onRefresh();
    else await inbox.loadInquiries(1);
    useUiStore().setHasUnreadInquiries(
      inbox.hasUnreadInquiries,
      inbox.unreadInquiryCount,
    );
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

      const token = response.data?.message || "INQUIRY_CREATED";

      await showSuccessAlert(
        t("inquiry.inquirySent"),
        apiMessage(token, "inquiry", "inquiry.inquirySent"),
      );

      await refreshInbox();
    } catch (error: unknown) {
      const translatedMessage = apiMessage(error, "inquiry");

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

      const successMessage = apiMessage(
        response.data?.message,
        "inquiry",
        isMarkRead ? "inquiry.markReadSuccess" : "inquiry.deleteSuccess",
      );

      await showSuccessAlert(t("inquiry.success"), successMessage);

      await refreshInbox();
    } catch (error: unknown) {
      const translatedMessage = apiMessage(error, "inquiry");

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
    status: "read" | "close" | "delete",
  ): Promise<void> => {
    const isDelete = status === "delete";
    const isMarkRead = status === "read";

    try {
      const response = await axiosClient.patch("/inquiries/", { status });

      const successMessage = apiMessage(
        response.data?.message,
        "inquiry",
        isDelete ? "inquiry.deleteAllSuccess" : "inquiry.markAllReadSuccess",
      );

      await showSuccessAlert(t("inquiry.success"), successMessage);

      await refreshInbox();
    } catch (error: unknown) {
      const translatedMessage = apiMessage(error, "inquiry");

      const errorTitle = isMarkRead
        ? t("inquiry.markAllRead")
        : t("inquiry.deleteAll");

      await showErrorAlert(errorTitle, translatedMessage);
    }
  };

  /**
   * Raise a "send me a deposit account" inquiry.
   *
   * Title and body are the literal token `BANK_ACCOUNT_REQUEST` so the admin
   * side can recognise the request without string matching — it is also the key
   * the inquiry list renders through `inquiry.apiMessages.BANK_ACCOUNT_REQUEST`.
   */
  const requestBankAccount = async (): Promise<void> => {
    try {
      await axiosClient.post("/inquiries", {
        title: "BANK_ACCOUNT_REQUEST",
        message: "BANK_ACCOUNT_REQUEST",
      });

      await showSuccessAlert(t("inquiry.bankAccountRequestSent"));

      // Refresh in place when a callback exists. A router.go(0) reload would
      // tear down whatever modal the button was pressed from (this is called
      // from the deposit modal), so only fall back to it when there's nothing
      // to refresh.
      await refreshInbox();
    } catch (error: unknown) {
      const translatedMessage = apiMessage(error, "inquiry");

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

      const successMessage = apiMessage(
        response.data?.message,
        "inquiry",
        "inquiry.closeInquirySuccess",
      );

      await showSuccessAlert(t("inquiry.success"), successMessage);

      await refreshInbox();
    } catch (error: unknown) {
      const translatedMessage = apiMessage(error, "inquiry");

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
      await refreshInbox();
      return inbox.loadReplies(inquiryId, true);
    } catch (error: unknown) {
      const translatedMessage = apiMessage(error, "inquiry");

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
      return await inbox.loadReplies(inquiryId);
    } catch (error: unknown) {
      // Was apiErrorMessageOr(), which returns the RAW backend message and a
      // hardcoded English fallback. Every other path in this file already
      // translates through apiMessage().
      await showErrorAlert(t("common.error"), apiMessage(error, "inquiry"));
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

      await refreshInbox();
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
