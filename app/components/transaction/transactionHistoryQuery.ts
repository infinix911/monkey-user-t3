/**
 * Query for the deposit/withdrawal history table (the last 7 days).
 *
 * Shared by TransactionHistory.vue and `prepareDepositModal()` so a prefetch
 * fills the exact member-records cache entry the table then reads.
 */

const formatDate = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export function transactionHistoryQuery(type: "deposit" | "withdrawal", method?: string) {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { type, startDate: formatDate(sevenDaysAgo), endDate: formatDate(today), method };
}
