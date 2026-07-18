/**
 * Regular expression to match non-numeric characters
 */
const DIGIT_REGEX = /[^0-9]/g;

/**
 * Regular expression to match non-numeric characters (allows decimal point)
 */
const DECIMAL_REGEX = /[^0-9.]/g;

/**
 * Sanitizes numeric input by removing non-numeric characters
 * @param input - The input string to sanitize
 * @param maxLength - Optional maximum length to truncate the result
 * @returns Sanitized string containing only numeric characters
 */
export function sanitizeNumericInput(
  input: string,
  maxLength?: number,
): string {
  const sanitized = input.replace(DIGIT_REGEX, "");
  return maxLength !== undefined ? sanitized.slice(0, maxLength) : sanitized;
}

/**
 * Sanitizes decimal input by removing non-numeric characters except decimal point
 * Ensures only one decimal point is allowed
 * @param input - The input string to sanitize
 * @returns Sanitized string containing only numeric characters and one decimal point
 */
export function sanitizeDecimalInput(input: string): string {
  // Remove all non-numeric characters except decimal point
  let sanitized = input.replace(DECIMAL_REGEX, "");

  // Ensure only one decimal point
  const parts = sanitized.split(".");
  if (parts.length > 2) {
    sanitized = parts[0] + "." + parts.slice(1).join("");
  }

  return sanitized;
}
