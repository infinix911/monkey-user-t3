/**
 * Formats a date string for display in notification components
 * @param dateString - ISO date string to format
 * @param options - Formatting options
 * @returns Formatted date string
 */
export const formatNotificationDate = (
  dateString: string,
  options: {
    monthFormat?: "short" | "long";
    includeYear?: boolean;
  } = {},
): string => {
  const { monthFormat = "long", includeYear = false } = options;

  const date = new Date(dateString);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const notificationDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  );

  if (notificationDate.getTime() === today.getTime()) {
    return "Today";
  } else if (notificationDate.getTime() === yesterday.getTime()) {
    return "Yesterday";
  } else {
    const formatOptions: Intl.DateTimeFormatOptions = {
      month: monthFormat,
      day: "numeric",
    };

    if (includeYear) {
      formatOptions.year = "numeric";
    }

    return date.toLocaleDateString("en-US", formatOptions);
  }
};

/**
 * Checks if a notification is new (created within the last 24 hours)
 * @param createdAt - ISO date string of when the notification was created
 * @returns boolean indicating if the notification is new
 */
export const isNotificationNew = (createdAt: string): boolean => {
  const notificationDate = new Date(createdAt);
  const now = new Date();
  const timeDiff = now.getTime() - notificationDate.getTime();
  const hoursDiff = timeDiff / (1000 * 3600); // Convert to hours

  return hoursDiff < 24;
};

/**
 * Formats time for display (HH:MM format)
 * @param dateString - ISO date string
 * @returns Formatted time string
 */
export const formatNotificationTime = (dateString: string): string => {
  return new Date(dateString).toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });
};
