/**
 * Date formatting utilities
 */

/**
 * Format a Date object as an ISO date string (YYYY-MM-DD)
 */
export function formatDateAsISO(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Get a date range spanning the last N days from today
 */
export function getDateRangeLastNDays(days: number): {
  startDate: string;
  endDate: string;
} {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  return {
    startDate: formatDateAsISO(startDate),
    endDate: formatDateAsISO(endDate),
  };
}
