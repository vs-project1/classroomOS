import crypto from "node:crypto";
import { z } from "zod";
import { hashPassword, hashPasswordSync, verifyPassword, generateMemorablePassword } from "../src/lib/auth/password";
import { createSessionToken, verifySessionToken, verifySessionTokenEdge } from "../src/lib/auth/token";
import { ROLE_PERMISSIONS, hasPermission, getRolePermissions } from "../src/lib/auth/rbac";
import { db } from "../src/db/client";
import { users, studentProfiles, students, teachers } from "../src/db/schema";
import { eq } from "drizzle-orm";

interface TestResult {
  suite: string;
  name: string;
  passed: boolean;
  details?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, name: string, details?: string) {
  results.push({
    suite,
    name,
    passed: Boolean(condition),
    details: details || (condition ? "PASS" : "FAIL"),
  });
}

// Schemas mirrored from server actions for offline pure validation stress testing
const changePasswordSchema = z
  .object({
    currentPassword: z.string().optional(),
    newPassword: z.string().min(8, "Password must be at least 8 characters long"),
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match. Please re-enter your confirmation.",
    path: ["confirmPassword"],
  })
  .refine((data) => !data.currentPassword || data.newPassword !== data.currentPassword, {
    message: "New password must differ from temporary password.",
    path: ["newPassword"],
  });

const CreateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(255),
    email: z.string().trim().toLowerCase().email(),
    role: z.enum(["ADMIN", "TEACHER", "CR", "STUDENT"]),
    phone: z.string().trim().optional().nullable(),
    temporaryPassword: z.string().optional(),
    rollNumber: z.string().trim().optional(),
    faculty: z.string().trim().optional(),
    semester: z.string().trim().optional(),
    section: z.string().trim().optional(),
    batchYear: z.coerce.number().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "STUDENT" || data.role === "CR") {
      if (!data.rollNumber || data.rollNumber.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rollNumber"],
          message: "Roll number is required for students",
        });
      }
    }
  });

async function runAdversarialChallenges() {
  console.log("===============================================================");
  console.log("  M2 EMPIRICAL ADVERSARIAL CHALLENGE & STRESS-TEST SUITE       ");
  console.log("===============================================================\n");

  const SECRET = "test-secret-key-32-chars-long-secure";
  const now = Date.now();
  const validPayload = {
    userId: "usr_student_001",
    role: "STUDENT" as const,
    mustChangePassword: true,
    expiresAt: now + 3600000,
  };

  const validToken = createSessionToken(validPayload, SECRET);

  // 1.1 Valid Token Node & Edge Verification
  const nodeDecoded = verifySessionToken(validToken, SECRET);
  assert(
    nodeDecoded !== null &&
    nodeDecoded.userId === validPayload.userId &&
    nodeDecoded.role === "STUDENT" &&
    nodeDecoded.mustChangePassword === true,
    "Token Security",
    "Valid Token Node.js HMAC Verification"
  );

  const edgeDecoded = await verifySessionTokenEdge(validToken, SECRET);
  assert(
    edgeDecoded !== null &&
    edgeDecoded.userId === validPayload.userId &&
    edgeDecoded.role === "STUDENT" &&
    edgeDecoded.mustChangePassword === true,
    "Token Security",
    "Valid Token WebCrypto (Edge) HMAC Verification Equivalence"
  );

  // 1.2 Privilege Escalation: Tamper Role in Token Payload (STUDENT -> ADMIN)
  const tamperedRoleToken = validToken.replace(".STUDENT.", ".ADMIN.");
  assert(
    verifySessionToken(tamperedRoleToken, SECRET) === null &&
    (await verifySessionTokenEdge(tamperedRoleToken, SECRET)) === null,
    "Token Security",
    "Privilege Escalation: Tampered Role Rejected (STUDENT -> ADMIN)"
  );

  // 1.3 Quarantine Bypass: Tamper Quarantine Flag (1 -> 0)
  const tamperedQuarantineToken = validToken.replace(".1.", ".0.");
  assert(
    verifySessionToken(tamperedQuarantineToken, SECRET) === null &&
    (await verifySessionTokenEdge(tamperedQuarantineToken, SECRET)) === null,
    "Token Security",
    "Quarantine Bypass: Tampered mustChangePassword Flag Rejected (1 -> 0)"
  );

  // 1.4 Expiration Boundary: Expired Token Rejection
  const expiredPayload = {
    userId: "usr_student_001",
    role: "STUDENT" as const,
    mustChangePassword: false,
    expiresAt: now - 5000,
  };
  const expiredToken = createSessionToken(expiredPayload, SECRET);
  assert(
    verifySessionToken(expiredToken, SECRET) === null &&
    (await verifySessionTokenEdge(expiredToken, SECRET)) === null,
    "Token Security",
    "Expiration Boundary: Expired Token Rejected"
  );

  // 1.5 Secret Key Guessing / Wrong Secret Rejection
  assert(
    verifySessionToken(validToken, "wrong-secret-key-1234567890123") === null &&
    (await verifySessionTokenEdge(validToken, "wrong-secret-key-1234567890123")) === null,
    "Token Security",
    "Cryptographic Integrity: Invalid Secret Signature Rejection"
  );

  // 1.6 Malformed Payloads & Boundary Stress
  const malformedTokens = [
    "",
    "not-a-token",
    "usr.ADMIN.0",
    "usr.ADMIN.0.12345",
    "usr.SUPERADMIN.0.9999999999999.signature",
    "usr.STUDENT.0.NaN.signature",
    "usr.STUDENT.0.9999999999999.",
    "usr.STUDENT.0.9999999999999.aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    "usr.STUDENT.0.9999999999999.gggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggggg",
  ];

  let allMalformedRejected = true;
  for (const mt of malformedTokens) {
    if (verifySessionToken(mt, SECRET) !== null) allMalformedRejected = false;
    const edgeRes = await verifySessionTokenEdge(mt, SECRET);
    if (edgeRes !== null) allMalformedRejected = false;
  }
  assert(
    allMalformedRejected,
    "Token Security",
    "Malformed / Adversarial Token Payloads Safely Rejected Without Crashes"
  );

  // SUITE 2: Password Cryptography & Timing Defense
  const testPassword = "Kathmandu#2026";
  const hash = await hashPassword(testPassword);

  const parts = hash.split(":");
  assert(
    parts.length === 2 && parts[0].length === 32 && parts[1].length === 128,
    "Password Security",
    "Scrypt Hash Format Standard (saltHex[32]:keyHex[128])"
  );

  assert(
    (await verifyPassword(testPassword, hash)) === true,
    "Password Security",
    "Valid Password Verification Match"
  );

  assert(
    (await verifyPassword("WrongPassword#2026", hash)) === false,
    "Password Security",
    "Wrong Password Rejection"
  );

  const malformedHashes = [
    "",
    "invalid",
    "salt_only_without_key",
    "short_salt:12345",
    parts[0] + ":invalid_hex_" + parts[1].slice(12),
    parts[0] + ":" + parts[1].slice(0, 64),
  ];
  let allMalformedHashesRejected = true;
  for (const mh of malformedHashes) {
    if ((await verifyPassword(testPassword, mh)) !== false) {
      allMalformedHashesRejected = false;
    }
  }
  assert(
    allMalformedHashesRejected,
    "Password Security",
    "Malformed Stored Hashes Safely Handled Without Throwing"
  );

  // SUITE 3: Password Change Quarantine & Policy Validation Stress
  assert(
    changePasswordSchema.safeParse({
      currentPassword: "OldPassword123!",
      newPassword: "Short7!",
      confirmPassword: "Short7!",
    }).success === false,
    "Quarantine Policy",
    "Reject New Password Shorter than 8 Characters"
  );

  assert(
    changePasswordSchema.safeParse({
      currentPassword: "OldPassword123!",
      newPassword: "NewSecurePassword123!",
      confirmPassword: "MismatchedPassword999!",
    }).success === false,
    "Quarantine Policy",
    "Reject Confirmation Mismatch"
  );

  assert(
    changePasswordSchema.safeParse({
      currentPassword: "SamePassword123!",
      newPassword: "SamePassword123!",
      confirmPassword: "SamePassword123!",
    }).success === false,
    "Quarantine Policy",
    "Reject New Password Identical to Current/Temporary Password"
  );

  assert(
    changePasswordSchema.safeParse({
      currentPassword: "OldTemporaryPass#2026",
      newPassword: "BrandNewSecurePassword#2026",
      confirmPassword: "BrandNewSecurePassword#2026",
    }).success === true,
    "Quarantine Policy",
    "Accept Valid Compliant Password Change"
  );

  // SUITE 4: Account Creation Validation & Schema Hardening
  assert(
    CreateAccountSchema.safeParse({
      name: "New Student",
      email: "invalid-email-address",
      role: "STUDENT",
      rollNumber: "BCA-100",
    }).success === false,
    "Account Provisioning",
    "Reject Malformed Email Address"
  );

  assert(
    CreateAccountSchema.safeParse({
      name: "Student Without Roll",
      email: "student@classroom.edu.np",
      role: "STUDENT",
      rollNumber: "",
    }).success === false,
    "Account Provisioning",
    "Reject Student / CR Creation Missing Mandatory Roll Number"
  );

  assert(
    CreateAccountSchema.safeParse({
      name: "Teacher Account",
      email: "teacher@classroom.edu.np",
      role: "TEACHER",
    }).success === true,
    "Account Provisioning",
    "Accept Teacher Creation Without Student Roll Number"
  );

  // SUITE 5: RBAC & Permission Boundaries
  assert(
    hasPermission("ADMIN", "canManageAccounts") === true &&
    hasPermission("TEACHER", "canManageAccounts") === false &&
    hasPermission("CR", "canManageAccounts") === false &&
    hasPermission("STUDENT", "canManageAccounts") === false,
    "RBAC Matrix",
    "Account Management Exclusively Restricted to ADMIN"
  );

  assert(
    hasPermission("ADMIN", "canGradeAssignments") === true &&
    hasPermission("TEACHER", "canGradeAssignments") === true &&
    hasPermission("CR", "canGradeAssignments") === false &&
    hasPermission("STUDENT", "canGradeAssignments") === false,
    "RBAC Matrix",
    "Grading Restricted to ADMIN & TEACHER"
  );

  assert(
    hasPermission("CR", "canCreateSessions") === true &&
    hasPermission("STUDENT", "canCreateSessions") === false,
    "RBAC Matrix",
    "CR Allowed Class Session Logging While Standard STUDENT Denied"
  );

  // SUITE 6: Database Seeding & User Integrity State
  const allUsers = await db.query.users.findMany();
  assert(allUsers.length >= 4, "Database Auth State", `Database contains >= 4 user accounts (${allUsers.length})`);

  const adminUser = allUsers.find((u) => u.role === "ADMIN");
  assert(Boolean(adminUser && adminUser.isActive), "Database Auth State", "Active ADMIN account present in database");

  const studentUser = allUsers.find((u) => u.role === "STUDENT" && !u.mustChangePassword);
  assert(Boolean(studentUser && studentUser.isActive), "Database Auth State", "Active standard STUDENT account present");

  const quarantinedStudent = allUsers.find((u) => Boolean(u.mustChangePassword));
  assert(Boolean(quarantinedStudent), "Database Auth State", "Quarantined student account (mustChangePassword=1) present");

  // SUITE 7: Database Constraint Integrity Testing
  let uniqueEmailTriggered = false;
  try {
    await db.insert(users).values({
      id: "usr_test_duplicate_email",
      email: adminUser?.email || "admin@classroom.edu.np",
      passwordHash: hash,
      role: "STUDENT",
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message.includes("UNIQUE constraint failed")) {
      uniqueEmailTriggered = true;
    }
  }
  assert(uniqueEmailTriggered, "Database Integrity", "SQLite Rejects Duplicate User Email (UNIQUE constraint)");

  // Print Summary
  console.log("\n===============================================================");
  console.log("  TEST RESULTS SUMMARY                                         ");
  console.log("===============================================================");
  let passCount = 0;
  let failCount = 0;
  for (const r of results) {
    const status = r.passed ? "PASS" : "FAIL";
    if (r.passed) passCount++;
    else failCount++;
    console.log(`[${status}] | [${r.suite}] ${r.name}`);
  }
  console.log(`\nTotal Tests: ${results.length} | Passed: ${passCount} | Failed: ${failCount}`);

  if (failCount > 0) {
    process.exit(1);
  }
}

runAdversarialChallenges().catch((err) => {
  console.error("Fatal challenge suite error:", err);
  process.exit(1);
});
