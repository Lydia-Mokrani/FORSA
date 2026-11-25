import crypto from 'crypto';

/**
 * Calcule le condensat SHA-256 hexadécimal d'une chaîne (ex: nonce, code OTP).
 */
export function hashString(value: string): string {
  return crypto.createHash('sha256').update(value).digest('hex');
}
