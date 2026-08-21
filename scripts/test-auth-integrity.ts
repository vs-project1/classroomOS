import crypto from "node:crypto";
import { hashPassword, hashPasswordSync, verifyPassword, generateMemorablePassword } from "../src/lib/auth/password";
import { createSessionToken, verifySessionToken, verifySessionTokenEdge, DEFAULT_SESSION_SECRET } from "../src/lib/auth/token";
import { getRolePermissions, hasPermission } from "../src/lib/auth/rbac";

async function main() {
  console.log("🔒 Starting Empirical Integrity Audit for Milestone 2 Auth...");

  // --- Test 1: scrypt Hashing Integrity ---
  console.log("\n[Check 1] Cryptographic scrypt Hashing & Verification");
  const testPass = "SecureAdmin#2026";
  const hash1 = await hashPassword(testPass);
  const hash2 = await hashPassword(testPass);

  console.log(`Hash 1: ${hash1}`);
  console.log(`Hash 2: ${hash2}`);

  if (hash1 === hash2) {
    throw new Error("FAIL: Repeated hashing generated identical hashes. Salt is static or bypassed!");
  }
  const [salt1, key1] = hash1.split(":");
  const [salt2, key2] = hash2.split(":");
  if (salt1.length !== 32 || key1.length !== 128) {
    throw new Error(`FAIL: Salt or key length invalid: salt=${salt1.length}, key=${key1.length}`);
  }

  const verifyValid = await verifyPassword(testPass, hash1);
  const verifyWrong = await verifyPassword("WrongPassword123!", hash1);
  const verifyTamperedHash = await verifyPassword(testPass, `${salt1}:${"a".repeat(128)}`);

  console.log(`Verify correct password: ${verifyValid}`);
  console.log(`Verify wrong password: ${verifyWrong}`);
  console.log(`Verify tampered key: ${verifyTamperedHash}`);

  if (!verifyValid) throw new Error("FAIL: verifyPassword failed for genuine password!");
  if (verifyWrong) throw new Error("FAIL: verifyPassword passed for incorrect password!");
  if (verifyTamperedHash) throw new Error("FAIL: verifyPassword passed for tampered hash!");

  // --- Test 2: Memorable Password Generator ---
  console.log("\n[Check 2] Memorable Password Generator");
  const mem1 = generateMemorablePassword();
  const mem2 = generateMemorablePassword();
  console.log(`Generated Temp Passwords: "${mem1}", "${mem2}"`);
  if (mem1.length < 8) throw new Error("FAIL: Generated password is less than 8 characters!");
  if (mem1 === mem2) console.warn("Note: Generated passwords matched (random collision possible).");

  // --- Test 3: HMAC Session Token Signing & timingSafeEqual Verification ---
  console.log("\n[Check 3] HMAC Session Token Signing & Timing-Safe Verification");
  const payload = {
    userId: "usr_test_audit_001",
    role: "ADMIN" as const,
    mustChangePassword: true,
    expiresAt: Date.now() + 10000,
  };

  const token = createSessionToken(payload);
  console.log(`Session Token: ${token}`);

  const decoded = verifySessionToken(token);
  console.log("Decoded Token Payload:", decoded);

  if (!decoded) throw new Error("FAIL: verifySessionToken failed to decode valid token!");
  if (decoded.userId !== payload.userId || decoded.role !== "ADMIN" || !decoded.mustChangePassword) {
    throw new Error("FAIL: Decoded payload does not match original!");
  }

  // Test Tampering Resistance
  const tamperedSig = token.substring(0, token.length - 4) + "0000";
  const tamperedPayload = "usr_hacked_001" + token.substring(payload.userId.length);

  const decodedTamperedSig = verifySessionToken(tamperedSig);
  const decodedTamperedPayload = verifySessionToken(tamperedPayload);

  console.log(`Tampered signature rejected: ${decodedTamperedSig === null}`);
  console.log(`Tampered payload rejected: ${decodedTamperedPayload === null}`);

  if (decodedTamperedSig !== null || decodedTamperedPayload !== null) {
    throw new Error("FAIL: Tampered session token was accepted!");
  }

  // Test Expiration
  const expiredPayload = {
    userId: "usr_expired_001",
    role: "STUDENT" as const,
    mustChangePassword: false,
    expiresAt: Date.now() - 5000, // Expired 5 seconds ago
  };
  const expiredToken = createSessionToken(expiredPayload);
  const decodedExpired = verifySessionToken(expiredToken);
  console.log(`Expired token rejected: ${decodedExpired === null}`);
  if (decodedExpired !== null) {
    throw new Error("FAIL: Expired token was accepted!");
  }

  // --- Test 4: Web Crypto Edge Verification Parity ---
  console.log("\n[Check 4] Web Crypto Edge Parity (verifySessionTokenEdge)");
  const edgeDecoded = await verifySessionTokenEdge(token);
  console.log("Edge Decoded Payload:", edgeDecoded);

  if (!edgeDecoded) throw new Error("FAIL: verifySessionTokenEdge failed to decode valid token!");
  if (edgeDecoded.userId !== payload.userId || edgeDecoded.role !== payload.role) {
    throw new Error("FAIL: verifySessionTokenEdge decoded payload mismatch!");
  }

  const edgeTampered = await verifySessionTokenEdge(tamperedSig);
  const edgeExpired = await verifySessionTokenEdge(expiredToken);
  console.log(`Edge tampered token rejected: ${edgeTampered === null}`);
  console.log(`Edge expired token rejected: ${edgeExpired === null}`);

  if (edgeTampered !== null || edgeExpired !== null) {
    throw new Error("FAIL: verifySessionTokenEdge accepted invalid token!");
  }

  // --- Test 5: RBAC Matrix Determinism ---
  console.log("\n[Check 5] RBAC Matrix Verification");
  const adminPerms = getRolePermissions("ADMIN");
  const studentPerms = getRolePermissions("STUDENT");
  const teacherPerms = getRolePermissions("TEACHER");
  const crPerms = getRolePermissions("CR");

  if (!adminPerms.canManageAccounts) throw new Error("FAIL: Admin cannot manage accounts!");
  if (studentPerms.canManageAccounts) throw new Error("FAIL: Student can manage accounts!");
  if (teacherPerms.canManageAccounts) throw new Error("FAIL: Teacher can manage accounts!");
  if (crPerms.canManageAccounts) throw new Error("FAIL: CR can manage accounts!");

  if (!crPerms.canCreateSessions || !teacherPerms.canCreateSessions) {
    throw new Error("FAIL: CR or Teacher cannot create sessions!");
  }
  if (studentPerms.canCreateSessions) {
    throw new Error("FAIL: Student can create sessions!");
  }

  console.log("All RBAC permissions verified cleanly.");
  console.log("\n✨ ALL EMPIRICAL INTEGRITY CHECKS PASSED WITH ZERO VIOLATIONS!");
}

main().catch((err) => {
  console.error("❌ Integrity Verification Error:", err);
  process.exit(1);
});
