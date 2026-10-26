import * as crypto from 'crypto';

const CROCKFORD_ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * Generates a 10-character Crockford Base32 ID with ~50 bits of cryptographically secure entropy.
 * Excludes I, L, O, and U to prevent human transcription errors and ambiguity.
 */
export function generateCrockfordId(length = 10): string {
  const randomBytes = crypto.randomBytes(length);
  let result = '';
  for (let i = 0; i < length; i++) {
    const byte = randomBytes[i];
    result += CROCKFORD_ALPHABET[byte % 32];
  }
  return result;
}

/**
 * Validates whether a given string is a valid Crockford Base32 ID.
 */
export function isValidCrockfordId(id: string): boolean {
  if (!id || id.length !== 10) return false;
  const regex = /^[0-9ABCDEFGHJKMNPQRSTVWXYZ]{10}$/i;
  return regex.test(id);
}
