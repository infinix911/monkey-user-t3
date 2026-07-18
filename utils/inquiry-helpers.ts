/**
 * Inquiry helper utilities
 * Ported from banana-lucky-next/lib/utils/inquiry-helpers.ts
 */

/**
 * Format relative time (e.g., "2h ago", "1d ago")
 */
export const formatTimeAgo = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800)
      return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return date.toLocaleDateString();
  } catch {
    return dateString;
  }
};

/**
 * Check if a reply is from the current user
 */
export const isUserReply = (reply: {
  sender_type?: string;
  created_by_type?: string;
  sender?: string;
}): boolean => {
  return (
    reply.sender_type === "member" ||
    reply.created_by_type === "member" ||
    reply.sender?.toLowerCase() === "you"
  );
};

/**
 * Get Tailwind CSS classes for inquiry status badge
 */
export const getStatusStyle = (status: number): string => {
  switch (status) {
    case 1:
      return "bg-transparent text-white border border-white";
    case 2:
      return "bg-transparent text-yellow-500 border border-yellow-500";
    case 0:
      return "bg-transparent text-red-500 border border-red-500";
    case 9:
      return "bg-transparent text-red-500 border border-red-500";
    default:
      return "bg-transparent text-white border border-gray-500";
  }
};

/**
 * Translate special inquiry texts (e.g., DEPOSIT_ACCOUNT_REQUEST)
 * @param text - The text to potentially translate
 * @param t - The i18n translation function from useI18n()
 */
export const translateInquiryText = (
  text: string | null | undefined,
  t: (key: string) => string,
): string => {
  if (!text) return "";
  if (text === "DEPOSIT_ACCOUNT_REQUEST") {
    return t("inquiry.depositAccountRequest");
  }
  return text;
};

/**
 * Get pagination page numbers with ellipsis
 */
export const getPageNumbers = (
  totalPages: number,
  currentPage: number,
): (number | string)[] => {
  const pages: (number | string)[] = [];

  if (totalPages <= 7) {
    // Show all pages if 7 or fewer
    for (let i = 1; i <= totalPages; i++) {
      pages.push(i);
    }
  } else {
    // Always show first page
    pages.push(1);

    if (currentPage <= 4) {
      // Near the start
      for (let i = 2; i <= 5; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    } else if (currentPage >= totalPages - 3) {
      // Near the end
      pages.push("...");
      for (let i = totalPages - 4; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // In the middle
      pages.push("...");
      for (let i = currentPage - 1; i <= currentPage + 1; i++) {
        pages.push(i);
      }
      pages.push("...");
      pages.push(totalPages);
    }
  }

  return pages;
};
