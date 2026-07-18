/**
 * Number formatting utilities
 */

/**
 * Format number with US locale (comma as thousand separator)
 */
export function formatNumber(value: string | number): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (isNaN(num)) return "0";
  return num.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

/**
 * Format number with Indonesian locale (dot as thousand separator)
 */
export function formatNumberID(value: number): string {
  return value.toLocaleString("id-ID");
}

/**
 * Format a name as Title Case (proper noun).
 * Collapses casing per word: "john doe" -> "John Doe", "JOHN" -> "John".
 */
export function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .replace(/\b\p{L}/gu, (ch) => ch.toUpperCase());
}
