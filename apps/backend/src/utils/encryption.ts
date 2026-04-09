import crypto from 'crypto';
import { env } from '@/config/env';

const ENCRYPTION_KEY = env.COOKIE_ENCRYPTION_KEY
  ? Buffer.from(env.COOKIE_ENCRYPTION_KEY, 'hex')
  : crypto.randomBytes(32);
const IV_LENGTH = 16;
const ALGORITHM = 'aes-256-cbc';

/**
 * Encrypts a string using AES-256-CBC encryption
 * @param text - The text to encrypt
 * @returns Encrypted string in format "iv:encryptedData"
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);

  return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 * @param text - The encrypted text in format "iv:encryptedData"
 * @returns Decrypted string
 */
export function decrypt(text: string): string {
  const [ivHex, encryptedHex] = text.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let decrypted = decipher.update(encrypted);
  decrypted = Buffer.concat([decrypted, decipher.final()]);

  return decrypted.toString();
}

/**
 * Safely encrypts data with error handling
 * @param data - The data to encrypt
 * @returns Encrypted string or null if encryption fails
 */
export function safeEncrypt(data: string): string | null {
  try {
    return encrypt(data);
  } catch (error) {
    console.error('Encryption failed:', error);
    return null;
  }
}

/**
 * Safely decrypts data with error handling
 * @param encryptedData - The encrypted data to decrypt
 * @returns Decrypted string or null if decryption fails
 */
export function safeDecrypt(encryptedData: string): string | null {
  try {
    return decrypt(encryptedData);
  } catch (error) {
    console.error('Decryption failed:', error);
    return null;
  }
}
