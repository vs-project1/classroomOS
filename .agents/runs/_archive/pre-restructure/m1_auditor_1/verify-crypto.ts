import crypto from "node:crypto";
import { hashPassword } from "../../src/db/seed";

function verifyPassword(plainText: string, hash: string): boolean {
  const [salt, key] = hash.split(":");
  if (!salt || !key) return false;
  const derivedKey = crypto.scryptSync(plainText, salt, 64);
  const keyBuffer = Buffer.from(key, "hex");
  return crypto.timingSafeEqual(derivedKey, keyBuffer);
}

async function main() {
  console.log("Testing scrypt password hashing & verification...");
  
  const passwords = [
    "AdminPassword123!",
    "TeacherPass123!",
    "TempPassword123!",
    "StudentPass123!",
  ];

  for (const pw of passwords) {
    const hashed = hashPassword(pw);
    const parts = hashed.split(":");
    console.log(`Password: "${pw}" -> Hash Salt length: ${parts[0].length}, Key length: ${parts[1].length}`);
    
    // Salt should be 32 hex chars (16 bytes), Key should be 128 hex chars (64 bytes)
    if (parts[0].length !== 32 || parts[1].length !== 128) {
      throw new Error(`Invalid hash structure: salt length ${parts[0].length}, key length ${parts[1].length}`);
    }

    // Verify correct password
    const isValid = verifyPassword(pw, hashed);
    if (!isValid) {
      throw new Error(`Failed to verify correct password "${pw}"`);
    }

    // Verify incorrect password
    const isInvalid = verifyPassword(pw + "wrong", hashed);
    if (isInvalid) {
      throw new Error(`Incorrect password accepted for "${pw}"`);
    }

    // Verify uniqueness of salt across hashes
    const hashed2 = hashPassword(pw);
    if (hashed === hashed2) {
      throw new Error(`Salt was not randomized between calls for "${pw}"`);
    }
  }

  console.log("✓ All scrypt password hashing & verification checks passed with timingSafeEqual!");
}

main().catch(console.error);
