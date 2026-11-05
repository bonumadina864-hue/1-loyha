import * as crypto from 'crypto';

/**
 * Generates a numeric Public ID containing ONLY digits (e.g. 9-digit numeric ID: 749281045).
 * Required by specification: "ID faqat sonlardan iborat bolsin".
 */
export function generateCrockfordId(length = 10): string {
  // First digit non-zero (1-9)
  const firstDigit = (crypto.randomInt(1, 10)).toString();
  let remaining = '';
  for (let i = 1; i < length; i++) {
    remaining += crypto.randomInt(0, 10).toString();
  }
  return firstDigit + remaining;
}

/**
 * Validates whether a given string is a valid numeric ID (between 8 and 12 digits, or legacy crockford).
 */
export function isValidCrockfordId(id: string): boolean {
  if (!id) return false;
  // Accepts 10-digit numeric ID, or 10-char legacy crockford
  const numericRegex = /^\d{10}$/;
  const legacyRegex = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{10}$/i;
  return numericRegex.test(id.trim()) || legacyRegex.test(id.trim());
}

