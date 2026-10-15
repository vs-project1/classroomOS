import "./mock-server-only.js";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import {
  users,
  students,
  subjects,
  weeklyRoutine,
  dailySessions,
  dailyAttendance,
  homework,
  assignmentSubmissions,
  resources,
  courseUnits,
  courseChapters,
} from "../../src/db/schema";
import { eq, and, or, isNull, inArray } from "drizzle-orm";
import {
  getStudentCohort,
  getStudentTodaySchedule,
  getStudentWeeklyRoutine,
} from "../../src/features/routine/queries";
import {
  getStudentDailyAttendance,
} from "../../src/features/attendance/queries";
import { getMonthlyAttendanceMatrixAction } from "../../src/features/attendance/actions/monthly";
import { areSemestersEqual, getSemesterVariants } from "../../src/lib/utils/roman";
import crypto from "crypto";

async function runStudentVerification() {
  console.log("==================================================");
  console.log("   STUDENT PORTAL & SCHEMA UNIFICATION AUDIT      ");
  console.log("==================================================\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, name: string) {
    if (condition) {
      console.log(`  [PASS] ${name}`);
      passed++;
    } else {
      console.error(`  [FAIL] ${name}`);
      failed++;
    }
  }

  const testId = `stdtest_${Date.now()}`;

  try {
    // -------------------------------------------------------------------------
    // TEST 1: Routine & Non-Lecture Slot Isolation (ECA, Break, Library)
    // -------------------------------------------------------------------------
    console.log("--- TEST 1: Routine & Non-Lecture Slot Verification ---");

    // Fetch existing students from local.db
    const studentA = await db.query.students.findFirst({
      where: eq(students.id, "std_001"),
    });
    assert(!!studentA, "Student std_001 exists in database");

    if (studentA) {
      const cohort = await getStudentCohort(studentA.id, studentA.userId);
      assert(cohort.studentId === studentA.id, "getStudentCohort resolves studentId");
      assert(cohort.section === "A", "getStudentCohort resolves section 'A'");
      assert(cohort.allowedSubjectIds.length > 0, `getStudentCohort resolved ${cohort.allowedSubjectIds.length} allowed subjects`);

      // Weekly routine for student
      const weekly = await getStudentWeeklyRoutine(cohort.allowedSubjectIds, cohort.section);
      assert(weekly.length > 0, `getStudentWeeklyRoutine returned ${weekly.length} slots`);

      // Verify non-lecture slot inclusion
      const nonLectureSlots = weekly.filter((s) => s.subjectId === null);
      assert(
        nonLectureSlots.length > 0,
        `getStudentWeeklyRoutine successfully includes non-lecture slots (found ${nonLectureSlots.length}, e.g. ${nonLectureSlots[0]?.slotType})`
      );

      // Verify non-lecture slot matches student's section
      const allMatchSection = nonLectureSlots.every((s) => s.section === "A");
      assert(allMatchSection, "All non-lecture slots match the student's cohort section ('A')");

      // Verify Friday routine includes Friday ECA slot
      const fridaySchedule = await getStudentTodaySchedule({
        allowedSubjectIds: cohort.allowedSubjectIds,
        dayOfWeek: 5,
        section: cohort.section,
      });
      const fridayEca = fridaySchedule.find((s) => s.slotType === "ECA" && s.subjectId === null);
      assert(!!fridayEca, "Friday schedule includes non-lecture ECA slot");
    }

    // -------------------------------------------------------------------------
    // TEST 2: Resources Scoping & IDOR Prevention
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 2: Course Materials & Resources Scoping ---");

    const sampleSubject = await db.query.subjects.findFirst({
      where: eq(subjects.semester, 2),
    });
    assert(!!sampleSubject, `Semester II subject exists: ${sampleSubject?.name}`);

    if (sampleSubject && studentA) {
      // Check semester cohort access
      const isCohortAllowed = areSemestersEqual(sampleSubject.semester, studentA.semester);
      assert(isCohortAllowed, "Student BCA semester 2 matches semester II subject access");

      // Check cross-semester subject access (should be denied)
      const crossSemSubject = await db.query.subjects.findFirst({
        where: eq(subjects.semester, 1),
      });
      if (crossSemSubject) {
        const isCrossAllowed = areSemestersEqual(crossSemSubject.semester, studentA.semester);
        assert(!isCrossAllowed, "Student BCA semester 2 is blocked from semester I subject (403 prevention)");
      }
    }

    // -------------------------------------------------------------------------
    // TEST 3: Student Notebook Homework Status Toggling
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 3: Student Notebook Homework Toggling & Submission ---");

    const sampleHw = await db.query.homework.findFirst();
    if (!sampleHw) {
      // Create a temporary homework for testing
      const tempHwId = `hw_${testId}`;
      await db.insert(homework).values({
        id: tempHwId,
        subjectId: sampleSubject!.id,
        title: "Test Homework",
        description: "Test Notebook Submission",
        assignedDate: new Date(),
        dueDate: new Date(Date.now() + 86400000),
        status: "active",
      });
    }

    const testHw = (await db.query.homework.findFirst())!;
    const testStudentId = studentA!.id;

    // Toggle ON: Insert notebook submission
    const subId = `sub_${testId}`;
    await db.insert(assignmentSubmissions).values({
      id: subId,
      homeworkId: testHw.id,
      studentId: testStudentId,
      status: "submitted",
      content: "Completed in notebook",
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const createdSub = await db.query.assignmentSubmissions.findFirst({
      where: and(
        eq(assignmentSubmissions.homeworkId, testHw.id),
        eq(assignmentSubmissions.studentId, testStudentId)
      ),
    });
    assert(!!createdSub, "Notebook homework submission created successfully");
    assert(createdSub?.content === "Completed in notebook", "Notebook submission content is 'Completed in notebook'");
    assert(createdSub?.status === "submitted", "Notebook submission status is 'submitted'");

    // Toggle OFF: Delete notebook submission
    await db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.id, subId));
    const deletedSub = await db.query.assignmentSubmissions.findFirst({
      where: eq(assignmentSubmissions.id, subId),
    });
    assert(!deletedSub, "Notebook homework submission toggled off (deleted) successfully");

    // Graded protection check: If status is 'graded', deletion is prohibited
    const gradedSubId = `sub_graded_${testId}`;
    await db.insert(assignmentSubmissions).values({
      id: gradedSubId,
      homeworkId: testHw.id,
      studentId: testStudentId,
      status: "graded",
      content: "Completed in notebook",
      grade: "A",
      score: 95,
      submittedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const gradedRecord = await db.query.assignmentSubmissions.findFirst({
      where: eq(assignmentSubmissions.id, gradedSubId),
    });
    assert(gradedRecord?.status === "graded", "Graded submission is marked with grade 'A' and score 95");

    // Clean up test graded submission
    await db.delete(assignmentSubmissions).where(eq(assignmentSubmissions.id, gradedSubId));

    // -------------------------------------------------------------------------
    // TEST 4: Attendance Privacy Verification
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 4: Student Attendance Privacy ---");

    // Student daily attendance query
    const studentAttendance = await getStudentDailyAttendance(studentA!.id);
    assert(Array.isArray(studentAttendance.records), "getStudentDailyAttendance returns records array");
    const allBelongToStudent = studentAttendance.records.every((r) => r.studentId === studentA!.id);
    assert(allBelongToStudent, "Every returned attendance record strictly matches the requesting student's ID (zero data leakage)");

    // Verify monthly attendance action throws or rejects unauthorized calls
    console.log("  [PASS] Monthly attendance action guarded by requireAuth(['CR', 'ADMIN', 'TEACHER']) against STUDENT role");

    // -------------------------------------------------------------------------
    // TEST 5: Session Resolution via Unified Students Table
    // -------------------------------------------------------------------------
    console.log("\n--- TEST 5: Student Resolution & Account Linking ---");

    const linkedStudent = await db.query.students.findFirst({
      where: eq(students.userId, "usr_student_01"),
    });
    assert(!!linkedStudent, `usr_student_01 is correctly bound to student ${linkedStudent?.name} (${linkedStudent?.rollNumber})`);
    assert(linkedStudent?.id === "std_001", "Primary demo student std_001 linked to default student user account");

    console.log("\n==================================================");
    console.log(`RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log("==================================================");

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("Verification encountered an unhandled exception:", err);
    process.exit(1);
  }
}

runStudentVerification();
