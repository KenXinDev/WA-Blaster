/**
 * Formatting utility helpers.
 */

/**
 * Formats a phone number to international format by stripping non-digit characters.
 * @param phone - Raw phone number string
 * @returns Cleaned phone number string containing only digits
 */
export function formatPhoneNumber(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Truncates a string to the given max length, appending "..." if truncated.
 * @param str - Input string
 * @param maxLength - Maximum allowed length
 * @returns Truncated string
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Formats a Date object to a human-readable locale string.
 * @param date - Date to format
 * @returns Formatted date string
 */
export function formatDate(date: Date): string {
  return date.toLocaleString();
}
