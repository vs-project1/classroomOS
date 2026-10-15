import "./mock-server-only.js";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

// Bypass Next.js 'server-only' guard for standalone verification runner
try {
  const serverOnlyPath = require.resolve("server-only");
  require.cache[serverOnlyPath] = {
    id: serverOnlyPath,
    filename: serverOnlyPath,
    loaded: true,
    exports: {},
  } as any;
} catch {}

import { db } from "@/db";
import { students, weeklyRoutine, dailySessions, dailyAttendance, users, enrollments } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { getCrDashboardData } from "@/app/(cr)/cr/queries";
import { getStudentCohort, getStudentWeeklyRoutine } from "@/features/routine/queries";
import { toOrdinalSemester } from "@/lib/utils/roman";

async function runCRVerification() {
  console.log("================================================================================");
  console.log("  Classroom OS — CR Workflow & Schema Verification Suite");
  console.log("================================================================================\n");

  let passes = 0;
  let fails = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✓ [PASS] ${msg}`);
      passes++;
    } else {
      console.error(`  ✗ [FAIL] ${msg}`);
      fails++;
    }
  }

  // 1. Verify CR Student Profile in Seeded DB
  console.log("👤 TEST 1: CR Student Profile & Schema Verification");
  const crStudent = await db.query.students.findFirst({
    where: eq(students.rollNumber, "2025-BCA-002"),
  });
  assert(!!crStudent, "CR student (Aashish Khatri) exists in database");
  assert(crStudent?.semester === 2, `CR student semester is integer 2 (got ${crStudent?.semester})`);
  assert(crStudent?.section === "A", `CR student section is 'A' (got '${crStudent?.section}')`);

  // 2. Verify Take-Attendance Roster Query (Section + Semester)
  console.log("\n📋 TEST 2: Take Attendance Roster Query");
  const semesterVal = crStudent?.semester ?? 2;
  const sectionVal = crStudent?.section || "A";

  const roster = await db.select({
    id: students.id,
    name: students.name,
    rollNumber: students.rollNumber
  }).from(students)
    .where(and(eq(students.semester, semesterVal), eq(students.section, sectionVal)))
    .orderBy(asc(students.rollNumber));

  assert(roster.length === 35, `Roster query for Semester 2 Section A returns exactly 35 students (got ${roster.length})`);
  assert(roster[0]?.rollNumber === "2025-BCA-001", `First student roll number is 2025-BCA-001 (got ${roster[0]?.rollNumber})`);
  assert(roster[34]?.rollNumber === "2025-BCA-035", `Last student roll number is 2025-BCA-035 (got ${roster[34]?.rollNumber})`);

  // 3. Verify CR Dashboard Schedule Query (Lecture + Non-Lecture Slots)
  console.log("\n📅 TEST 3: CR Dashboard Schedule Query (/cr)");
  // Test Friday (dayOfWeek = 5) which has 5 lectures and 1 ECA non-lecture slot (rt_sem2_fri_6)
  const fridayDate = new Date("2026-10-16T10:00:00Z"); // Friday
  const fridayData = await getCrDashboardData(crStudent!.id, fridayDate, 5);
  
  assert(fridayData.todaysClasses.length === 6, `Friday schedule returns 6 total slots (got ${fridayData.todaysClasses.length})`);
  
  const ecaSlot = fridayData.todaysClasses.find((c: any) => c.slotType === "ECA");
  assert(!!ecaSlot, "Non-lecture slot (ECA) is included in Friday schedule");
  assert(ecaSlot?.subjectId === null, "ECA slot has null subjectId");
  assert(ecaSlot?.customTitle === "Extracurricular Activities (ECA)", `ECA slot has customTitle '${ecaSlot?.customTitle}'`);
  assert(ecaSlot?.teacher?.name === "Sudeep Sir", `ECA slot has assigned teacher '${ecaSlot?.teacher?.name}'`);

  const lectureSlots = fridayData.todaysClasses.filter((c: any) => c.slotType === "LECTURE");
  assert(lectureSlots.length === 5, `Friday schedule contains 5 lecture slots (got ${lectureSlots.length})`);

  // Test Monday (dayOfWeek = 1) which has lectures and lab slots
  const mondayDate = new Date("2026-10-12T10:00:00Z"); // Monday
  const mondayData = await getCrDashboardData(crStudent!.id, mondayDate, 1);
  assert(mondayData.todaysClasses.length === 6, `Monday schedule returns 6 total slots (got ${mondayData.todaysClasses.length})`);
  const labSlots = mondayData.todaysClasses.filter((c: any) => c.slotType === "LAB");
  assert(labSlots.length === 2, `Monday schedule contains 2 LAB slots (got ${labSlots.length})`);

  // 4. Verify Routine View Query (/routine) for Student/CR
  console.log("\n📆 TEST 4: Student/CR Weekly Routine View (/routine)");
  const cohort = await getStudentCohort(crStudent!.id);
  assert(cohort.section === "A", `Cohort resolves section 'A' (got '${cohort.section}')`);
  const weeklyRoutines = await getStudentWeeklyRoutine(cohort.allowedSubjectIds, cohort.section);
  assert(weeklyRoutines.length === 30, `Weekly routine contains all 30 slots (6 slots x 5 days) (got ${weeklyRoutines.length})`);
  const routineEcaSlot = weeklyRoutines.find((r: any) => r.slotType === "ECA");
  assert(!!routineEcaSlot, "Weekly routine view includes non-lecture slot (ECA)");

  // 5. Verify Daily Attendance Submission and Retrieval for 35 Students
  console.log("\n✍️ TEST 5: Daily Attendance Submission for 35 Students");
  // Clean up any test session for our test date
  const testDate = new Date("2026-10-14T06:00:00.000Z");
  const testYmd = "2026-10-14";
  const normalizedTestDate = new Date(`${testYmd}T00:00:00Z`);

  const existingTestSessions = await db.select().from(dailySessions).where(
    and(
      eq(dailySessions.date, normalizedTestDate),
      eq(dailySessions.section, "A")
    )
  );
  for (const s of existingTestSessions) {
    await db.delete(dailySessions).where(eq(dailySessions.id, s.id));
  }

  // Construct attendance records for all 35 students:
  // 32 present, 2 absent, 1 late
  const testRecords: { studentId: string; status: "present" | "absent" | "late" | "excused" }[] = roster.map((s: { id: string }, idx: number) => {
    let status: "present" | "absent" | "late" | "excused" = "present";
    if (idx === 10) status = "absent";
    else if (idx === 11) status = "absent";
    else if (idx === 12) status = "late";
    return {
      studentId: s.id,
      status,
    };
  });

  // Insert via direct DB transaction mimicking submitDailyAttendanceAction
  const sessionId = `ds_verify_test_${Date.now()}`;
  await db.transaction(async (tx: any) => {
    await tx.insert(dailySessions).values({
      id: sessionId,
      date: normalizedTestDate,
      semester: 2,
      section: "A",
      markedBy: crStudent!.userId,
    });

    const attRecords = testRecords.map((r) => ({
      id: `da_verify_${r.studentId}`,
      dailySessionId: sessionId,
      studentId: r.studentId,
      status: r.status,
    }));

    await tx.insert(dailyAttendance).values(attRecords);
  });

  // Verify DB writes
  const savedSession = await db.query.dailySessions.findFirst({
    where: eq(dailySessions.id, sessionId),
    with: { attendance: true },
  });

  assert(!!savedSession, "daily_sessions row was created");
  assert(savedSession?.semester === 2, `daily_sessions semester is 2 (got '${savedSession?.semester}')`);
  assert(savedSession?.section === "A", `daily_sessions section is 'A' (got '${savedSession?.section}')`);
  assert(savedSession?.attendance.length === 35, `daily_attendance has exactly 35 records (got ${savedSession?.attendance.length})`);

  const presentCount = savedSession?.attendance.filter((a: any) => a.status === "present").length;
  const absentCount = savedSession?.attendance.filter((a: any) => a.status === "absent").length;
  const lateCount = savedSession?.attendance.filter((a: any) => a.status === "late").length;
  assert(presentCount === 32, `Present count is 32 (got ${presentCount})`);
  assert(absentCount === 2, `Absent count is 2 (got ${absentCount})`);
  assert(lateCount === 1, `Late count is 1 (got ${lateCount})`);

  // Verify Idempotent Update
  console.log("\n🔄 TEST 6: Idempotent Daily Attendance Update");
  const updatedRecords = testRecords.map((r) => ({
    ...r,
    status: (r.status === "absent" ? "excused" : r.status) as "present" | "absent" | "late" | "excused"
  }));

  await db.transaction(async (tx: any) => {
    // Delete existing attendance records for the session
    await tx.delete(dailyAttendance).where(eq(dailyAttendance.dailySessionId, sessionId));
    // Re-insert updated records
    const newAttRecords = updatedRecords.map((r) => ({
      id: `da_verify_upd_${r.studentId}`,
      dailySessionId: sessionId,
      studentId: r.studentId,
      status: r.status,
    }));
    await tx.insert(dailyAttendance).values(newAttRecords);
  });

  const reloadedSession = await db.query.dailySessions.findFirst({
    where: eq(dailySessions.id, sessionId),
    with: { attendance: true },
  });
  const excusedCount = reloadedSession?.attendance.filter((a: any) => a.status === "excused").length;
  assert(excusedCount === 2, `Updated attendance successfully converted 2 absent records to excused (got ${excusedCount})`);
  assert(reloadedSession?.attendance.length === 35, `Updated session maintains exactly 35 records (got ${reloadedSession?.attendance.length})`);

  // Cleanup test session
  await db.delete(dailySessions).where(eq(dailySessions.id, sessionId));
  const cleanupCheck = await db.query.dailySessions.findFirst({
    where: eq(dailySessions.id, sessionId),
  });
  assert(!cleanupCheck, "Test session and cascaded attendance cleaned up cleanly");

  console.log("\n================================================================================");
  console.log(`  VERIFICATION RESULTS: ${passes} Passed, ${fails} Failed`);
  console.log("================================================================================");

  if (fails > 0) {
    process.exit(1);
  }
}

runCRVerification().catch((err) => {
  console.error("FATAL ERROR during verification:", err);
  process.exit(1);
});
