/**
 * Phone number validation utilities for the WhatsApp Broadcasting Application.
 * Handles normalization, validation, and filtering of phone numbers.
 *
 * Implements Requirements: 3.4, 5.1
 */

/**
 * Normalizes a phone number string to a plain digit string in international format.
 *
 * Strips:
 * - Whitespace (spaces, tabs)
 * - Dashes (-)
 * - Parentheses ( )
 * - Leading plus sign (+)
 *
 * The result is a string of digits only, representing the number in international
 * format without any prefix character (e.g. "6281234567890").
 *
 * @param phone - Raw phone number string from any source
 * @returns Normalized digit-only string
 */
export function normalizePhoneNumber(phone: string): string {
  // Remove spaces, dashes, parentheses, and a leading '+'
  return phone
    .trim()
    .replace(/^\+/, "")       // strip leading +
    .replace(/[\s\-().]/g, ""); // strip spaces, dashes, parens, dots
}

/**
 * Validates that a phone number string represents a valid international phone number.
 *
 * Rules:
 * - Must contain only digits after normalization
 * - Length must be between 8 and 15 digits (ITU-T E.164 range)
 * - Must not start with 0 (international format requires a country code)
 *
 * @param phone - Raw or already-normalized phone number string
 * @returns true if the number is a valid international phone number
 */
export function isValidPhoneNumber(phone: string): boolean {
  const normalized = normalizePhoneNumber(phone);

  // Must be digits only
  if (!/^\d+$/.test(normalized)) {
    return false;
  }

  // E.164 allows 8–15 digits total (country code + subscriber number)
  if (normalized.length < 8 || normalized.length > 15) {
    return false;
  }

  // International format must not start with 0 (that would be a local trunk prefix)
  if (normalized.startsWith("0")) {
    return false;
  }

  return true;
}

/**
 * Validates that a phone number is compatible with WhatsApp.
 *
 * WhatsApp uses the same E.164 international format as standard phone numbers,
 * but requires the number to be at least 10 digits to ensure a country code
 * plus a meaningful subscriber number are both present.
 *
 * @param phone - Raw or already-normalized phone number string
 * @returns true if the number is a valid WhatsApp-compatible number
 */
export function isValidWhatsAppNumber(phone: string): boolean {
  if (!isValidPhoneNumber(phone)) {
    return false;
  }

  const normalized = normalizePhoneNumber(phone);

  // WhatsApp requires at least 10 digits (country code + subscriber number)
  return normalized.length >= 10;
}

/**
 * Splits an array of raw phone number strings into valid and invalid buckets.
 *
 * Each number is first normalized, then tested with isValidWhatsAppNumber.
 * Valid numbers are stored in their normalized form; invalid numbers are stored
 * as-is so the caller can report them back to the user.
 *
 * @param phones - Array of raw phone number strings
 * @returns Object with `valid` (normalized) and `invalid` (original) arrays
 */
export function filterValidPhoneNumbers(phones: string[]): {
  valid: string[];
  invalid: string[];
} {
  const valid: string[] = [];
  const invalid: string[] = [];

  for (const phone of phones) {
    if (isValidWhatsAppNumber(phone)) {
      valid.push(normalizePhoneNumber(phone));
    } else {
      invalid.push(phone);
    }
  }

  return { valid, invalid };
}
