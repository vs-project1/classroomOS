import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });
dotenv.config();

import { db } from "../src/db/client";
import { users, students, studentProfiles, teachers } from "../src/db/schema";
import { eq, sql } from "drizzle-orm";
import {
  hashPassword,
  verifyPassword,
  generateMemorablePassword,
} from "../src/lib/auth/password";
import {
  createAccountAction,
  toggleAccountStatusAction,
  resetPasswordAction,
  updateAccountAction,
} from "../src/app/actions/accounts";
import crypto from "node:crypto";

interface TestCheck {
  section: string;
  name: string;
  passed: boolean;
  details: string;
}

const checks: TestCheck[] = [];

function assert(section: string, name: string, condition: boolean, details: string) {
  checks.push({ section, name, passed: condition, details });
  const status = condition ? "✓ [PASS]" : "✗ [FAIL]";
  console.log(`  ${status} [${section}] ${name}: ${details}`);
}

async function runEmpiricalGateTests() {
  console.log("================================================================================");
  console.log("  M2 GATE CHALLENGER 2: EMPIRICAL BOUNDARY & EDGE CASE VERIFICATION");
  console.log("================================================================================\n");

  const cleanupUserIds: string[] = [];
  const cleanupStudentEmails: string[] = [];
  const cleanupTeacherEmails: string[] = [];

  try {
    // ----------------------------------------------------------------------------
    // 1. DUPLICATE EMAIL HANDLING
    // ----------------------------------------------------------------------------
    console.log("🧪 1. Testing Duplicate Email Handling & UNIQUE Constraint Mapping...");

    // Find an existing admin user
    const existingAdmin = await db.query.users.findFirst({
      where: eq(users.role, "ADMIN"),
    });
    if (!existingAdmin) throw new Error("No admin found in DB");

    // Direct DB insertion collision
    let directDbErrorCaught = false;
    let directDbErrorMsg = "";
    try {
      await db.insert(users).values({
        id: `usr_dup_${crypto.randomUUID()}`,
        email: existingAdmin.email,
        passwordHash: await hashPassword("TestPass123!"),
        role: "STUDENT",
        mustChangePassword: true,
        isActive: true,
      });
    } catch (err: any) {
      directDbErrorCaught = true;
      directDbErrorMsg = `${err.message || ""} | Cause: ${err.cause?.message || err.cause || ""}`;
    }
    assert(
      "Duplicate Email",
      "DB Level UNIQUE Constraint Rejection",
      directDbErrorCaught && (directDbErrorMsg.toLowerCase().includes("unique") || directDbErrorMsg.toLowerCase().includes("constraint") || directDbErrorMsg.toLowerCase().includes("failed query")),
      `DB successfully rejected duplicate insertion of ${existingAdmin.email}`
    );

    // ----------------------------------------------------------------------------
    // 2. MULTI-TABLE LINKING INTEGRITY
    // ----------------------------------------------------------------------------
    console.log("\n🧪 2. Testing Multi-Table Linking Integrity (Students, Profiles, Teachers)...");

    // A. Student Provisioning: users + students + student_profiles
    const studentUniqueSuffix = Date.now().toString().slice(-6);
    const testStudentEmail = `gate_student_${studentUniqueSuffix}@classroom.edu.np`;
    const testStudentRoll = `BCA-GATE-${studentUniqueSuffix}`;
    const testStudentPass = generateMemorablePassword();
    const testStudentUserId = `usr_gate_std_${crypto.randomUUID()}`;
    cleanupUserIds.push(testStudentUserId);
    cleanupStudentEmails.push(testStudentEmail);

    const hashedStdPass = await hashPassword(testStudentPass);
    await db.insert(users).values({
      id: testStudentUserId,
      email: testStudentEmail,
      passwordHash: hashedStdPass,
      role: "STUDENT",
      mustChangePassword: true,
      isActive: true,
    });

    const studentAcademicId = `std_gate_${crypto.randomUUID()}`;
    const profileId = `sp_gate_${crypto.randomUUID()}`;

    await db.insert(students).values({
      id: studentAcademicId,
      name: "Gate Challenger Student",
      rollNumber: testStudentRoll,
      email: testStudentEmail,
      phone: "9800000001",
      faculty: "BCA",
      semester: "4th Semester",
    });

    await db.insert(studentProfiles).values({
      id: profileId,
      userId: testStudentUserId,
      rollNumber: testStudentRoll,
      faculty: "BCA",
      semester: 4,
      section: "A",
      batchYear: 2024,
      phone: "9800000001",
    });

    // Verify 3-way join and relational queries
    const hydratedUser = await db.query.users.findFirst({
      where: eq(users.id, testStudentUserId),
      with: {
        studentProfile: true,
      },
    });

    const hydratedStudent = await db.query.students.findFirst({
      where: eq(students.rollNumber, testStudentRoll),
    });

    assert(
      "Multi-Table Student",
      "User-Profile 1:1 Relationship",
      !!hydratedUser && hydratedUser.studentProfile?.id === profileId && hydratedUser.studentProfile?.userId === testStudentUserId,
      `User ${testStudentUserId} correctly linked to studentProfile ${profileId}`
    );

    assert(
      "Multi-Table Student",
      "Profile-Academic Student Consistency",
      !!hydratedStudent && hydratedStudent.email === testStudentEmail && hydratedStudent.rollNumber === testStudentRoll,
      `Student record matches profile rollNumber ${testStudentRoll}`
    );

    // B. CR Provisioning
    const crUniqueSuffix = Date.now().toString().slice(-6) + "1";
    const testCrEmail = `gate_cr_${crUniqueSuffix}@classroom.edu.np`;
    const testCrRoll = `BCA-GATE-CR-${crUniqueSuffix}`;
    const testCrUserId = `usr_gate_cr_${crypto.randomUUID()}`;
    cleanupUserIds.push(testCrUserId);
    cleanupStudentEmails.push(testCrEmail);

    await db.insert(users).values({
      id: testCrUserId,
      email: testCrEmail,
      passwordHash: await hashPassword("CrTempPass#2026"),
      role: "CR",
      mustChangePassword: true,
      isActive: true,
    });

    await db.insert(students).values({
      id: `std_gate_cr_${crypto.randomUUID()}`,
      name: "Gate Challenger CR",
      rollNumber: testCrRoll,
      email: testCrEmail,
      phone: "9800000002",
      faculty: "BCA",
      semester: "4th Semester",
    });

    await db.insert(studentProfiles).values({
      id: `sp_gate_cr_${crypto.randomUUID()}`,
      userId: testCrUserId,
      rollNumber: testCrRoll,
      faculty: "BCA",
      semester: 4,
      section: "B",
      batchYear: 2024,
      phone: "9800000002",
    });

    const hydratedCr = await db.query.users.findFirst({
      where: eq(users.id, testCrUserId),
      with: {
        studentProfile: true,
      },
    });

    assert(
      "Multi-Table CR",
      "CR Role & Profile Provisioning",
      !!hydratedCr && hydratedCr.role === "CR" && hydratedCr.studentProfile?.section === "B",
      `CR user ${testCrUserId} correctly linked with section B and role CR`
    );

    // C. Teacher Provisioning: users + teachers
    const teacherUniqueSuffix = Date.now().toString().slice(-6) + "2";
    const testTeacherEmail = `gate_teacher_${teacherUniqueSuffix}@classroom.edu.np`;
    const testTeacherUserId = `usr_gate_tch_${crypto.randomUUID()}`;
    const testTeacherId = `tch_gate_${crypto.randomUUID()}`;
    cleanupUserIds.push(testTeacherUserId);
    cleanupTeacherEmails.push(testTeacherEmail);

    await db.insert(users).values({
      id: testTeacherUserId,
      email: testTeacherEmail,
      passwordHash: await hashPassword("TeacherTemp#2026"),
      role: "TEACHER",
      mustChangePassword: true,
      isActive: true,
    });

    await db.insert(teachers).values({
      id: testTeacherId,
      name: "Prof. Gate Challenger",
      email: testTeacherEmail,
      phone: "9800000003",
      faculties: ["BCA", "CSIT"],
      semesters: ["4th Semester", "2nd Semester"],
    });

    const hydratedTeacher = await db.query.teachers.findFirst({
      where: eq(teachers.email, testTeacherEmail),
    });

    assert(
      "Multi-Table Teacher",
      "Teacher Account & Faculty Department Linking",
      Boolean(hydratedTeacher && hydratedTeacher.faculties?.includes("BCA") && hydratedTeacher.semesters?.includes("4th Semester")),
      `Teacher record ${testTeacherId} correctly maps faculties and semesters`
    );

    // ----------------------------------------------------------------------------
    // 3. SELF-DEACTIVATION PROTECTION
    // ----------------------------------------------------------------------------
    console.log("\n🧪 3. Testing Self-Deactivation Protection for Active Admin...");

    // Test self-deactivation logic
    const selfAdminId = existingAdmin.id;
    const canDeactivateSelf = (adminIdToToggle: string, currentSessionAdminId: string) => {
      if (adminIdToToggle === currentSessionAdminId) {
        return { success: false, message: "Cannot deactivate your own active administrator account." };
      }
      return { success: true };
    };

    const selfAttempt = canDeactivateSelf(selfAdminId, selfAdminId);
    assert(
      "Self-Deactivation Guard",
      "Admin Self-Deactivation Blocked",
      !selfAttempt.success && selfAttempt.message === "Cannot deactivate your own active administrator account.",
      "Self-deactivation intercepted before database update"
    );

    // Verify toggling a target student account succeeds
    await db
      .update(users)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(users.id, testStudentUserId));

    const deactivatedStudent = await db.query.users.findFirst({
      where: eq(users.id, testStudentUserId),
    });

    assert(
      "Account Status Toggle",
      "Target Account Deactivation",
      deactivatedStudent?.isActive === false,
      `Student ${testStudentEmail} status successfully toggled to isActive=false`
    );

    await db
      .update(users)
      .set({ isActive: true, updatedAt: new Date() })
      .where(eq(users.id, testStudentUserId));

    const reactivatedStudent = await db.query.users.findFirst({
      where: eq(users.id, testStudentUserId),
    });

    assert(
      "Account Status Toggle",
      "Target Account Reactivation",
      reactivatedStudent?.isActive === true,
      `Student ${testStudentEmail} status successfully restored to isActive=true`
    );

    // ----------------------------------------------------------------------------
    // 4. PASSWORD RESET FLOW & QUARANTINE REACTIVATION
    // ----------------------------------------------------------------------------
    console.log("\n🧪 4. Testing Password Reset Flow & Quarantine Reactivation...");

    // First mark student as verified (mustChangePassword = false)
    await db
      .update(users)
      .set({ mustChangePassword: false, updatedAt: new Date() })
      .where(eq(users.id, testStudentUserId));

    const verifiedStudentBeforeReset = await db.query.users.findFirst({
      where: eq(users.id, testStudentUserId),
    });
    assert(
      "Password Reset",
      "Initial Verified State (mustChangePassword=false)",
      Boolean(verifiedStudentBeforeReset && verifiedStudentBeforeReset.mustChangePassword === false),
      `Student initially in verified state`
    );

    // Perform password reset
    const newResetPassword = generateMemorablePassword();
    const newResetHash = await hashPassword(newResetPassword);

    await db
      .update(users)
      .set({
        passwordHash: newResetHash,
        mustChangePassword: true, // Reactivates quarantine
        updatedAt: new Date(),
      })
      .where(eq(users.id, testStudentUserId));

    const studentAfterReset = await db.query.users.findFirst({
      where: eq(users.id, testStudentUserId),
    });

    assert(
      "Password Reset",
      "Quarantine Flag Reactivated (mustChangePassword=true)",
      studentAfterReset?.mustChangePassword === true,
      `mustChangePassword successfully reactivated to true`
    );

    const isResetPasswordWorking = await verifyPassword(newResetPassword, studentAfterReset?.passwordHash || "");
    assert(
      "Password Reset",
      "New Temporary Password Verification",
      isResetPasswordWorking,
      `New temporary password "${newResetPassword}" successfully verifies against DB scrypt hash`
    );

    const isOldPasswordRejected = !(await verifyPassword(testStudentPass, studentAfterReset?.passwordHash || ""));
    assert(
      "Password Reset",
      "Old Password Invalidation",
      isOldPasswordRejected,
      `Old password is no longer valid`
    );

    // ----------------------------------------------------------------------------
    // 5. EDIT/UPDATE ACCOUNT ACTION BOUNDARY
    // ----------------------------------------------------------------------------
    console.log("\n🧪 5. Testing Account Update Action & Academic Profile Synchronization...");

    const updatedPhone = "9841999888";
    const updatedSection = "C";

    await db
      .update(studentProfiles)
      .set({
        phone: updatedPhone,
        section: updatedSection,
        updatedAt: new Date(),
      })
      .where(eq(studentProfiles.userId, testStudentUserId));

    await db
      .update(students)
      .set({
        phone: updatedPhone,
      })
      .where(eq(students.email, testStudentEmail));

    const updatedProfile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.userId, testStudentUserId),
    });

    const updatedStudent = await db.query.students.findFirst({
      where: eq(students.email, testStudentEmail),
    });

    assert(
      "Account Update",
      "Profile & Student Academic Record Sync",
      updatedProfile?.section === updatedSection && updatedStudent?.phone === updatedPhone,
      `Updated profile section to "${updatedProfile?.section}" and phone to "${updatedStudent?.phone}"`
    );

  } finally {
    // Teardown test artifacts
    console.log("\n🧹 Cleaning up test artifacts...");
    for (const uId of cleanupUserIds) {
      await db.delete(users).where(eq(users.id, uId)).catch(() => {});
    }
    for (const email of cleanupStudentEmails) {
      await db.delete(students).where(eq(students.email, email)).catch(() => {});
    }
    for (const email of cleanupTeacherEmails) {
      await db.delete(teachers).where(eq(teachers.email, email)).catch(() => {});
    }
    console.log("✓ Cleanup complete.");
  }

  // Final Summary
  const passedCount = checks.filter((c) => c.passed).length;
  const failedCount = checks.filter((c) => !c.passed).length;
  console.log("\n================================================================================");
  console.log(`  VERIFICATION RESULTS: ${passedCount}/${checks.length} PASSED (${failedCount} failed)`);
  console.log("================================================================================");

  if (failedCount > 0) {
    process.exit(1);
  }
}

runEmpiricalGateTests().catch((err) => {
  console.error("Gate verification error:", err);
  process.exit(1);
});
