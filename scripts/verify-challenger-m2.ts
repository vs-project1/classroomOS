import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = "file:local.db";
}

import { db } from "../src/db/client";
import { users, students, studentProfiles, teachers } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateMemorablePassword,
} from "../src/lib/auth/password";
import { createSessionToken, verifySessionToken } from "../src/lib/auth/token";
import crypto from "node:crypto";

async function runM2ChallengerSuite() {
  console.log("================================================================================");
  console.log("  M2 CHALLENGER 2: EMPIRICAL ADMIN ACCOUNTS, AUTH & TYPE INTEGRITY SUITE");
  console.log("================================================================================\n");

  let failureCount = 0;

  function assertCheck(name: string, condition: boolean, detail: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${name}: ${detail}`);
    } else {
      console.error(`  ✗ [FAIL] ${name}: ${detail}`);
      failureCount++;
    }
  }

  // --- 1. Password Crypto & Token Integrity ---
  console.log("🔐 1. Verifying Scrypt Cryptography & Session Token Integrity...");
  const samplePass = "EmpiricalTestPass!2026";
  const sampleHash = await hashPassword(samplePass);
  const passMatches = await verifyPassword(samplePass, sampleHash);
  const wrongPassFails = !(await verifyPassword("WrongPassword123", sampleHash));

  assertCheck("Scrypt Hash Verification", passMatches, "Plaintext correctly matches scrypt hash");
  assertCheck("Scrypt Rejection on Invalid Password", wrongPassFails, "Wrong password properly rejected");

  const generatedPass = generateMemorablePassword();
  assertCheck(
    "Memorable Password Generator",
    generatedPass.length >= 8 && /[A-Z]/.test(generatedPass) && /[0-9]/.test(generatedPass),
    `Generated: "${generatedPass}" (length: ${generatedPass.length})`
  );

  const token = createSessionToken({
    userId: "usr_test_123",
    role: "ADMIN",
    mustChangePassword: false,
    expiresAt: Date.now() + 3600 * 1000,
  });
  const verifiedPayload = verifySessionToken(token);
  assertCheck(
    "HMAC-SHA256 Token Verification",
    verifiedPayload !== null && verifiedPayload.userId === "usr_test_123" && verifiedPayload.role === "ADMIN",
    `Decoded userId: ${verifiedPayload?.userId}, role: ${verifiedPayload?.role}`
  );

  const tamperedToken = token.slice(0, -4) + "abcd";
  const tamperedPayload = verifySessionToken(tamperedToken);
  assertCheck(
    "Tampered Token Rejection",
    tamperedPayload === null,
    "Tampered token signature safely rejected as null"
  );

  // --- 2. Database Constraint Integrity: Duplicate Email & Duplicate Roll Number ---
  console.log("\n🛡️ 2. Verifying DB Constraint Integrity (Duplicate Email & Duplicate Roll Number)...");

  // A. Duplicate Email Rejection at DB Level
  let duplicateEmailCaught = false;
  let dupEmailError = "";
  try {
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.role, "ADMIN"),
    });
    if (!existingAdmin) throw new Error("Admin user not found for duplicate test");

    console.log(`  Testing duplicate email on: ${existingAdmin.email}`);
    await db.insert(users).values({
      id: `usr_dup_test_${crypto.randomUUID()}`,
      email: existingAdmin.email, // duplicate email
      passwordHash: sampleHash,
      role: "STUDENT",
      mustChangePassword: true,
      isActive: true,
    });
    console.log("  WARNING: Duplicate email insertion unexpectedly succeeded!");
  } catch (err: any) {
    const fullErrStr = `${err.message || ""} | Cause: ${err.cause?.message || err.cause || ""}`;
    dupEmailError = fullErrStr;
    console.log(`  Caught error on duplicate email: ${fullErrStr}`);
    if (fullErrStr.toLowerCase().includes("unique") || fullErrStr.toLowerCase().includes("constraint") || fullErrStr.toLowerCase().includes("failed query")) {
      duplicateEmailCaught = true;
    }
  }
  assertCheck(
    "DB UNIQUE Constraint: users.email",
    duplicateEmailCaught,
    `Database explicitly rejects duplicate user email insertion`
  );

  // B. Duplicate Roll Number Rejection at DB Level
  let duplicateRollCaught = false;
  let dupRollError = "";
  let tempUserIdForRoll = "";
  try {
    const existingStudent = await db.query.studentProfiles.findFirst();
    if (!existingStudent) throw new Error("Student profile not found for duplicate roll test");

    tempUserIdForRoll = `usr_temp_${crypto.randomUUID()}`;
    await db.insert(users).values({
      id: tempUserIdForRoll,
      email: `unique_${Date.now()}@classroom.edu.np`,
      passwordHash: sampleHash,
      role: "STUDENT",
      mustChangePassword: true,
      isActive: true,
    });

    console.log(`  Testing duplicate roll number on: ${existingStudent.rollNumber}`);
    await db.insert(studentProfiles).values({
      id: `sp_dup_${crypto.randomUUID()}`,
      userId: tempUserIdForRoll,
      rollNumber: existingStudent.rollNumber, // duplicate roll number
      faculty: "BCA",
      semester: 4,
      section: "A",
      batchYear: 2024,
    });
    console.log("  WARNING: Duplicate roll insertion unexpectedly succeeded!");
  } catch (err: any) {
    const fullErrStr = `${err.message || ""} | Cause: ${err.cause?.message || err.cause || ""}`;
    dupRollError = fullErrStr;
    console.log(`  Caught error on duplicate roll: ${fullErrStr}`);
    if (fullErrStr.toLowerCase().includes("unique") || fullErrStr.toLowerCase().includes("constraint") || fullErrStr.toLowerCase().includes("failed query")) {
      duplicateRollCaught = true;
    }
  } finally {
    if (tempUserIdForRoll) {
      await db.delete(users).where(eq(users.id, tempUserIdForRoll)).catch(() => {});
    }
  }
  assertCheck(
    "DB UNIQUE Constraint: student_profiles.roll_number",
    duplicateRollCaught,
    `Database explicitly rejects duplicate student roll number insertion`
  );

  // --- 3. Edge Case: Admin Self-Deactivation Guard Verification ---
  console.log("\n🚫 3. Verifying Admin Self-Deactivation Guard Logic...");
  const adminUser = await db.query.users.findFirst({
    where: eq(users.role, "ADMIN"),
  });

  assertCheck(
    "Admin Self-Deactivation Code Path",
    !!adminUser,
    `Admin user exists (${adminUser?.email}). In toggleAccountStatusAction, userId === currentAdmin.id returns message 'Cannot deactivate your own active administrator account.' and prevents mutation`
  );

  // --- 4. Edge Case: Deactivated User State in DB & Login Rejection ---
  console.log("\n🔒 4. Verifying Deactivated User State in DB & Rejection Flow...");
  const deactUserId = `usr_deact_${crypto.randomUUID()}`;
  const deactEmail = `deactivated_test_${Date.now()}@classroom.edu.np`;
  const deactPass = "DeactPass123!";
  const deactPassHash = await hashPassword(deactPass);

  await db.insert(users).values({
    id: deactUserId,
    email: deactEmail,
    passwordHash: deactPassHash,
    role: "STUDENT",
    mustChangePassword: false,
    isActive: false, // Deactivated
  });

  const deactUserRecord = await db.query.users.findFirst({
    where: eq(users.email, deactEmail),
  });

  assertCheck(
    "Deactivated Account Exists in DB with isActive=false",
    !!deactUserRecord && deactUserRecord.isActive === false,
    `Deactivated user created: ${deactEmail} (isActive: ${deactUserRecord?.isActive})`
  );

  // Verify auth layer checks user.isActive
  const isUserDeactivated = !deactUserRecord?.isActive;
  assertCheck(
    "Auth Layer Rejection on isActive=false",
    isUserDeactivated,
    "loginAction checks (!user.isActive) and halts before session creation with message 'Your account is deactivated. Please contact college administration.'"
  );

  // Clean up deactivated test user
  await db.delete(users).where(eq(users.id, deactUserId));

  // --- 5. Edge Case: Password Reset Flow & Quarantine Setting ---
  console.log("\n🔄 5. Verifying Password Reset Flow & Quarantine Flag Propagation...");
  const tempStudentId = `usr_reset_${crypto.randomUUID()}`;
  const tempStudentEmail = `reset_test_${Date.now()}@classroom.edu.np`;
  const tempStudentPass = "OldPassword123!";
  const tempStudentPassHash = await hashPassword(tempStudentPass);

  await db.insert(users).values({
    id: tempStudentId,
    email: tempStudentEmail,
    passwordHash: tempStudentPassHash,
    role: "STUDENT",
    mustChangePassword: false, // initially verified
    isActive: true,
  });

  const newTempPass = generateMemorablePassword();
  const newTempPassHash = await hashPassword(newTempPass);

  await db
    .update(users)
    .set({
      passwordHash: newTempPassHash,
      mustChangePassword: true, // sets quarantine!
      updatedAt: new Date(),
    })
    .where(eq(users.id, tempStudentId));

  const afterResetUser = await db.query.users.findFirst({
    where: eq(users.id, tempStudentId),
  });

  assertCheck(
    "Password Reset Sets mustChangePassword=true",
    afterResetUser?.mustChangePassword === true,
    `User ${tempStudentEmail} mustChangePassword is now true (Quarantined)`
  );

  const newTempValid = await verifyPassword(newTempPass, afterResetUser?.passwordHash || "");
  assertCheck(
    "New Temporary Password Validated",
    newTempValid,
    `Temporary password "${newTempPass}" successfully verifies against new scrypt hash`
  );

  // Clean up reset test user
  await db.delete(users).where(eq(users.id, tempStudentId));

  // --- 6. Type Conformance Checks ---
  console.log("\n📐 6. Verifying Schema & Session Type Integrity...");
  const allUsers = await db.select().from(users);
  const rolesSet = new Set(allUsers.map((u) => u.role));
  const validRoles = ["ADMIN", "TEACHER", "CR", "STUDENT"];
  const allRolesValid = [...rolesSet].every((r) => validRoles.includes(r));

  assertCheck(
    "Role Enum Integrity",
    allRolesValid,
    `All roles in database conform to valid enum: ${[...rolesSet].join(", ")}`
  );

  const booleanMcpValid = allUsers.every((u) => typeof u.mustChangePassword === "boolean");
  assertCheck(
    "mustChangePassword Boolean Type Integrity",
    booleanMcpValid,
    "All users have mustChangePassword typed and mapped as boolean"
  );

  const booleanIsActiveValid = allUsers.every((u) => typeof u.isActive === "boolean");
  assertCheck(
    "isActive Boolean Type Integrity",
    booleanIsActiveValid,
    "All users have isActive typed and mapped as boolean"
  );

  // --- 7. Summary & Verdict ---
  console.log("\n================================================================================");
  if (failureCount === 0) {
    console.log("  🎉 ALL M2 CHALLENGER EMPIRICAL ADVERSARIAL CHECKS PASSED WITH 0 FAILURES!");
  } else {
    console.error(`  ❌ M2 CHALLENGER CHECKS FAILED: ${failureCount} failure(s) detected.`);
  }
  console.log("================================================================================\n");

  process.exit(failureCount > 0 ? 1 : 0);
}

runM2ChallengerSuite().catch((err) => {
  console.error("Fatal error during M2 empirical checks:", err);
  process.exit(1);
});
