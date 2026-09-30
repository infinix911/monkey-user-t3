/**
 * Query for the login-history panel (the last 7 days).
 *
 * Shared by LoginHistory.vue and the account-panel prefetch
 * (`prepareAccountSection`) so the prefetch fills the exact member-records
 * cache entry the panel then reads.
 */

const formatDate = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export function loginHistoryQuery(): { startDate: string; endDate: string } {
  const today = new Date();
  const sevenDaysAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  return { startDate: formatDate(sevenDaysAgo), endDate: formatDate(today) };
}
