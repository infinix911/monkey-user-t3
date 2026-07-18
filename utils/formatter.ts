/**
 * Format a number with thousand separators
 * @param value - The number to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted number string with thousand separators
 *
 * @example
 * formatNumber(1000) // "1,000"
 * formatNumber(1234567) // "1,234,567"
 * formatNumber(123.45) // "123.45"
 */
export function formatNumber(
  value: number | string | null | undefined,
  locale: string = "en-US",
): string {
  if (value === null || value === undefined || value === "") {
    return "0";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return "0";
  }

  return new Intl.NumberFormat(locale).format(numValue);
}

/**
 * Format a number with specific decimal places
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 0)
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted number string with thousand separators and decimal places
 *
 * @example
 * formatNumberWithDecimals(1234.567, 2) // "1,234.57"
 * formatNumberWithDecimals(1000, 2) // "1,000.00"
 */
export function formatNumberWithDecimals(
  value: number | string | null | undefined,
  decimals: number = 0,
  locale: string = "en-US",
): string {
  if (value === null || value === undefined || value === "") {
    return "0" + (decimals > 0 ? "." + "0".repeat(decimals) : "");
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return "0" + (decimals > 0 ? "." + "0".repeat(decimals) : "");
  }

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(numValue);
}

/**
 * Format currency with symbol and thousand separators
 * @param value - The amount to format
 * @param currency - The currency symbol (default: '$')
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted currency string
 *
 * @example
 * formatCurrency(1000, '€') // "€1,000"
 * formatCurrency(1234.56, '$') // "$1,234.56"
 */
export function formatCurrency(
  value: number | string | null | undefined,
  currency: string = "$",
  locale: string = "en-US",
): string {
  const formattedNumber = formatNumber(value, locale);
  return `${currency}${formattedNumber}`;
}

/**
 * Format number for display in input fields (with thousand separators, no decimals)
 * @param value - The number to format
 * @param locale - The locale to use for formatting (default: 'en-US')
 * @returns Formatted number string with thousand separators, no decimals
 *
 * @example
 * formatNumberForInput(1000) // "1,000"
 * formatNumberForInput(1234567) // "1,234,567"
 * formatNumberForInput(123.45) // "123"
 */
export function formatNumberForInput(
  value: number | string | null | undefined,
  locale: string = "en-US",
): string {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  const numValue = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return "";
  }

  return new Intl.NumberFormat(locale).format(Math.floor(numValue));
}

/**
 * Parse formatted input value to raw number (removes thousand separators)
 * @param value - The formatted string value
 * @returns Raw numeric value as string
 *
 * @example
 * parseInputToNumber("1,000") // "1000"
 * parseInputToNumber("1,234,567") // "1234567"
 * parseInputToNumber("123") // "123"
 */
export function parseInputToNumber(value: string): string {
  return value.replace(/[^0-9]/g, "");
}

/**
 * Format input number for display
 * @param value - The input value
 * @returns Object with raw numeric value and formatted display value
 *
 * @example
 * formatInputNumber("1234") // { raw: "1234", display: "1,234" }
 * formatInputNumber("1,234") // { raw: "1234", display: "1,234" }
 */
export function formatInputNumber(value: string): {
  raw: string;
  display: string;
} {
  const raw = parseInputToNumber(value);
  const display = raw ? formatNumberForInput(Number(raw)) : "";

  return { raw, display };
}
