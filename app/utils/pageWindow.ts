/**
 * Page numbers for a compact pager: the first and last page, a window around
 * the current one, and `"..."` for each gap — e.g. `1 … 4 5 6 7 8 9 … 303`.
 * A long result set therefore renders a handful of buttons instead of one per
 * page.
 *
 * @param current - 1-based current page.
 * @param total - Total page count.
 * @param maxVisible - Pages shown in the window (default 6).
 * @returns {(number | "...")[]} Page numbers and gap markers, in order.
 */
export function pageWindow(current: number, total: number, maxVisible = 6): (number | "...")[] {
  const pages: (number | "...")[] = [];
  if (total <= maxVisible) {
    for (let i = 1; i <= total; i++) pages.push(i);
    return pages;
  }
  const half = Math.floor(maxVisible / 2);
  let start = Math.max(1, current - half);
  let end = Math.min(total, current + half);

  if (current <= half) {
    end = maxVisible;
  } else if (current >= total - half) {
    start = total - maxVisible + 1;
  }

  if (start > 1) {
    pages.push(1);
    if (start > 2) pages.push("...");
  }
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total) {
    if (end < total - 1) pages.push("...");
    pages.push(total);
  }
  return pages;
}
