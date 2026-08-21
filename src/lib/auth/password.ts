import crypto from "node:crypto";
import { promisify } from "node:util";

const scryptAsync = promisify(crypto.scrypt);

const SALT_BYTES = 16;
const KEY_LEN = 64;

const CAMPUS_WORDS = [
  "Kathmandu", "Patan", "Bhaktapur", "Pokhara", 
  "Lumbini", "Everest", "Himalaya", "Gorkha",
  "Janakpur", "Mustang", "Annapurna", "Chitwan",
  "Tribhuvan", "Campus", "Scholar", "Classroom"
];
const SYMBOLS = ["#", "!", "@", "$", "&"];

/**
 * Hashes a plain text password using scrypt with a random 16-byte salt.
 * Output format: `${saltHex}:${derivedKeyHex}` (161 characters)
 * 100% compatible with src/db/seed.ts.
 */
export async function hashPassword(plainText: string): Promise<string> {
  if (!plainText || typeof plainText !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = (await scryptAsync(plainText, salt, KEY_LEN)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Synchronous variant for seeding scripts and CLI utilities.
 */
export function hashPasswordSync(plainText: string): string {
  if (!plainText || typeof plainText !== "string") {
    throw new Error("Password must be a non-empty string");
  }
  const salt = crypto.randomBytes(SALT_BYTES).toString("hex");
  const derivedKey = crypto.scryptSync(plainText, salt, KEY_LEN);
  return `${salt}:${derivedKey.toString("hex")}`;
}

/**
 * Verifies a plain text password against a stored scrypt hash using timingSafeEqual.
 * Returns false safely on any malformed input without throwing unhandled exceptions.
 */
export async function verifyPassword(plainText: string, storedHash: string): Promise<boolean> {
  if (!plainText || !storedHash || typeof plainText !== "string" || typeof storedHash !== "string") {
    return false;
  }

  const parts = storedHash.split(":");
  if (parts.length !== 2) {
    return false;
  }

  const [salt, expectedKeyHex] = parts;
  if (salt.length !== 32 || expectedKeyHex.length !== 128) {
    return false;
  }

  try {
    const derivedKey = (await scryptAsync(plainText, salt, KEY_LEN)) as Buffer;
    const expectedKey = Buffer.from(expectedKeyHex, "hex");

    if (derivedKey.length !== expectedKey.length) {
      return false;
    }

    return crypto.timingSafeEqual(derivedKey, expectedKey);
  } catch {
    return false;
  }
}

/**
 * Generates an 8+ character memorable temporary password for Admin Provisioning.
 * Format: Word + Symbol + Year (e.g. Kathmandu#2026)
 */
export function generateMemorablePassword(): string {
  const word = CAMPUS_WORDS[Math.floor(Math.random() * CAMPUS_WORDS.length)];
  const symbol = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
  const year = new Date().getFullYear();
  return `${word}${symbol}${year}`;
}

/**
 * Alias for generateMemorablePassword
 */
export function generateTemporaryPassword(): string {
  return generateMemorablePassword();
}
