import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import {
  teachers,
  subjects,
  students,
  dailySessions,
  dailyAttendance,
  attendanceCorrectionRequests,
} from "../../src/db/schema";
import { eq, and, inArray, desc, count } from "drizzle-orm";
import {
  toRoman,
  fromRoman,
  toOrdinalSemester,
  getSemesterVariants,
  areSemestersEqual,
} from "../../src/lib/utils/roman";
import crypto from "crypto";

async function runTests() {
  console.log("==================================================");
  console.log("   TASK 5 VERIFICATION: ATTENDANCE & DISPUTES    ");
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

  // --- 1. Roman & Semester Utilities ---
  console.log("--- 1. Testing Roman & Semester Normalization ---");
  assert(toRoman(2) === "II", "toRoman(2) === 'II'");
  assert(toRoman("2nd Semester") === "II", "toRoman('2nd Semester') === 'II'");
  assert(toRoman("II") === "II", "toRoman('II') === 'II'");
  assert(fromRoman("II") === 2, "fromRoman('II') === 2");
  assert(toOrdinalSemester("II") === "2nd Semester", "toOrdinalSemester('II') === '2nd Semester'");
  assert(toOrdinalSemester(2) === "2nd Semester", "toOrdinalSemester(2) === '2nd Semester'");
  assert(areSemestersEqual("II", "2nd Semester"), "areSemestersEqual('II', '2nd Semester')");
  assert(areSemestersEqual("II", "2nd"), "areSemestersEqual('II', '2nd')");
  assert(!areSemestersEqual("I", "2nd Semester"), "!areSemestersEqual('I', '2nd Semester')");

  const variants = getSemesterVariants("II");
  assert(variants.includes("II") && variants.includes("2nd Semester") && variants.includes("2nd"), "getSemesterVariants contains II, 2nd Semester, 2nd");

  // --- 2. Teacher & Subject Queries ---
  console.log("\n--- 2. Testing Teacher Attendance Dashboard Logic ---");
  // Find a teacher
  const teacher = await db.query.teachers.findFirst({
    where: eq(teachers.id, "tch_ashish_06"),
  });
  assert(Boolean(teacher), "Found teacher tch_ashish_06 (Er. Ashish Sir)");

  const teacherSubjects = await db.query.subjects.findMany({
    where: eq(subjects.teacherId, teacher!.id),
  });
  const distinctSemesters = [...new Set(teacherSubjects.map((s) => s.semester))];
  assert(distinctSemesters.length > 0, `Teacher teaches in semesters: ${distinctSemesters.join(", ")}`);

  // Query enrolled students for distinctSemesters[0]
  for (const sem of distinctSemesters) {
    const semVars = getSemesterVariants(sem);
    const [countRow] = await db
      .select({ value: count() })
      .from(students)
      .where(inArray(students.semester, semVars));
    const enrolled = Number(countRow?.value ?? 0);
    console.log(`    Semester ${sem} (${toOrdinalSemester(sem)}): ${enrolled} students enrolled`);
    if (sem === "II") {
      assert(enrolled === 35, `Semester II has 35 enrolled students (matched via variants)`);
    }
  }

  // --- 3. Daily Attendance Session & Roster Calculation ---
  console.log("\n--- 3. Testing Daily Session Logging & Roster Ledger ---");
  const now = new Date();
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
  const todayStartNpt = new Date(`${ymd}T00:00:00Z`);

  // Clean up any test session from today
  const existingTodaySession = await db.query.dailySessions.findFirst({
    where: and(
      eq(dailySessions.semester, "2nd Semester"),
      eq(dailySessions.date, todayStartNpt)
    ),
  });
  if (existingTodaySession) {
    await db.delete(dailySessions).where(eq(dailySessions.id, existingTodaySession.id));
  }

  // Check today's session status before logging
  const preCheckSession = await db.query.dailySessions.findFirst({
    where: and(
      inArray(dailySessions.semester, getSemesterVariants("II")),
      eq(dailySessions.date, todayStartNpt)
    ),
  });
  assert(!preCheckSession, "Pre-check: No attendance session logged today yet");

  // Create a daily session for today
  const testSessionId = `test_ds_${Date.now()}`;
  await db.insert(dailySessions).values({
    id: testSessionId,
    date: todayStartNpt,
    semester: "2nd Semester",
    markedBy: teacher!.userId,
  });

  // Verify today session query now finds it
  const postCheckSession = await db.query.dailySessions.findFirst({
    where: and(
      inArray(dailySessions.semester, getSemesterVariants("II")),
      eq(dailySessions.date, todayStartNpt)
    ),
  });
  assert(Boolean(postCheckSession), "Post-check: Session successfully logged today (hasLoggedToday = true)");

  // Seed attendance for 3 test students:
  // std_001: present
  // std_002: late (counts as attended)
  // std_003: absent
  const att1Id = `test_da_01_${Date.now()}`;
  const att2Id = `test_da_02_${Date.now()}`;
  const att3Id = `test_da_03_${Date.now()}`;

  await db.insert(dailyAttendance).values([
    { id: att1Id, dailySessionId: testSessionId, studentId: "std_001", status: "present" },
    { id: att2Id, dailySessionId: testSessionId, studentId: "std_002", status: "late" },
    { id: att3Id, dailySessionId: testSessionId, studentId: "std_003", status: "absent" },
  ]);

  // Query roster metrics
  const sessions = await db
    .select()
    .from(dailySessions)
    .where(inArray(dailySessions.semester, getSemesterVariants("II")));
  const totalDays = sessions.length;
  assert(totalDays >= 1, `Total days logged for Semester II: ${totalDays}`);

  const sessionIds = sessions.map((s) => s.id);
  const attendanceRecords = await db
    .select()
    .from(dailyAttendance)
    .where(inArray(dailyAttendance.dailySessionId, sessionIds));

  // Verify student 1: present -> attendedDays = 1, percentage = 100%
  const std1Records = attendanceRecords.filter((a) => a.studentId === "std_001");
  const std1Attended = std1Records.filter((r) => r.status === "present" || r.status === "late").length;
  const std1Pct = totalDays > 0 ? (std1Attended / totalDays) * 100 : 100;
  assert(std1Pct === 100, `Student 1 attendance is 100% (green >= 80%)`);

  // Verify student 2: late -> attendedDays = 1, percentage = 100%
  const std2Records = attendanceRecords.filter((a) => a.studentId === "std_002");
  const std2Attended = std2Records.filter((r) => r.status === "present" || r.status === "late").length;
  const std2Pct = totalDays > 0 ? (std2Attended / totalDays) * 100 : 100;
  assert(std2Pct === 100, `Student 2 (late) attendedDays counts as attended (100%)`);

  // Verify student 3: absent -> attendedDays = 0, percentage = 0%
  const std3Records = attendanceRecords.filter((a) => a.studentId === "std_003");
  const std3Attended = std3Records.filter((r) => r.status === "present" || r.status === "late").length;
  const std3Pct = totalDays > 0 ? (std3Attended / totalDays) * 100 : 100;
  assert(std3Pct === 0, `Student 3 (absent) attendance is 0% (red < 80%)`);

  // --- 4. Dispute Submission and Review Pipeline ---
  console.log("\n--- 4. Testing Attendance Dispute Submission & Review Pipeline ---");
  // Student 3 disputes absence, requesting 'present'
  const disputeId = `test_disp_${Date.now()}`;
  await db.insert(attendanceCorrectionRequests).values({
    id: disputeId,
    attendanceId: att3Id,
    studentId: "std_003",
    requestedStatus: "present",
    reason: "I was present during roll call but my network disconnected.",
    status: "pending",
  });

  // Query pending disputes joined with dailyAttendance and dailySessions
  const teacherSemesterVariants = distinctSemesters.flatMap((s) => getSemesterVariants(s));
  const pendingDisputes = await db
    .select({
      id: attendanceCorrectionRequests.id,
      requestedStatus: attendanceCorrectionRequests.requestedStatus,
      reason: attendanceCorrectionRequests.reason,
      status: attendanceCorrectionRequests.status,
      studentName: students.name,
      studentRoll: students.rollNumber,
      semester: dailySessions.semester,
      sessionDate: dailySessions.date,
    })
    .from(attendanceCorrectionRequests)
    .innerJoin(dailyAttendance, eq(attendanceCorrectionRequests.attendanceId, dailyAttendance.id))
    .innerJoin(dailySessions, eq(dailyAttendance.dailySessionId, dailySessions.id))
    .innerJoin(students, eq(attendanceCorrectionRequests.studentId, students.id))
    .where(
      and(
        eq(attendanceCorrectionRequests.status, "pending"),
        inArray(dailySessions.semester, teacherSemesterVariants)
      )
    );

  const foundDispute = pendingDisputes.find((d) => d.id === disputeId);
  assert(Boolean(foundDispute), "Teacher can see student 3's pending dispute for their semester");
  assert(foundDispute?.studentRoll === "2025-BCA-003", `Dispute shows student roll: ${foundDispute?.studentRoll}`);

  // Test Approve action:
  // Transaction logic matching reviewDisputeAction:
  const reviewNow = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(attendanceCorrectionRequests)
      .set({
        status: "approved",
        reviewNote: "Verified with classroom logs.",
        reviewedBy: teacher!.id,
        reviewedAt: reviewNow,
      })
      .where(eq(attendanceCorrectionRequests.id, disputeId));

    await tx
      .update(dailyAttendance)
      .set({ status: "present" })
      .where(eq(dailyAttendance.id, att3Id));
  });

  // Verify dispute status changed to approved
  const updatedDispute = await db.query.attendanceCorrectionRequests.findFirst({
    where: eq(attendanceCorrectionRequests.id, disputeId),
  });
  assert(updatedDispute?.status === "approved", "Dispute status updated to 'approved'");

  // Verify daily attendance was corrected to 'present'
  const updatedAttendance = await db.query.dailyAttendance.findFirst({
    where: eq(dailyAttendance.id, att3Id),
  });
  assert(updatedAttendance?.status === "present", "Daily attendance record corrected to 'present'");

  // Clean up test data
  await db.delete(attendanceCorrectionRequests).where(eq(attendanceCorrectionRequests.id, disputeId));
  await db.delete(dailyAttendance).where(eq(dailyAttendance.dailySessionId, testSessionId));
  await db.delete(dailySessions).where(eq(dailySessions.id, testSessionId));
  console.log("\n  Test artifacts cleaned up successfully.");

  console.log("\n==================================================");
  console.log(`   TOTAL TESTS: ${passed + failed} | PASSED: ${passed} | FAILED: ${failed}`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
