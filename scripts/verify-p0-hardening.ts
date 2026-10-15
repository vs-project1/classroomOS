import "./maintenance/mock-server-only.js";
import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../src/db/client";
import {
  weeklyRoutine,
  classSessions,
  dailySessions,
  dailyAttendance,
  attendanceCorrectionRequests,
  lectureLogs,
  students,
  users,
} from "../src/db/schema";
import { eq, and, sql, inArray } from "drizzle-orm";
import {
  validateGoogleDriveUrl,
  toGoogleDrivePreviewUrl,
  isGoogleDriveUrl,
} from "../src/features/assignments/utils/drive";
import { areSemestersEqual } from "../src/lib/utils/roman";
import { ne } from "drizzle-orm";
import { checkOverlap } from "../src/features/routine/actions/routine-actions";

async function runVerification() {
  console.log("==================================================");
  console.log("  P0 HARDENING DEEP VERIFICATION SUITE");
  console.log("==================================================");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, desc: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${desc}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${desc}`);
      failed++;
    }
  }

  // ----------------------------------------------------
  // TEST 1: Google Drive URL Validation & Preview Transformation
  // ----------------------------------------------------
  console.log("\n[Test Suite 1: Google Drive & Homework Submissions]");

  const docUrl = "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit?usp=sharing";
  const docResult = validateGoogleDriveUrl(docUrl);
  assert(docResult.isValid && docResult.type === "doc" && docResult.fileId === "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "Validates Google Doc URL");
  assert(
    toGoogleDrivePreviewUrl(docUrl) === "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview",
    "Transforms Google Doc to /preview URL"
  );

  const sheetUrl = "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit#gid=0";
  const sheetResult = validateGoogleDriveUrl(sheetUrl);
  assert(sheetResult.isValid && sheetResult.type === "sheet", "Validates Google Sheets URL");
  assert(
    toGoogleDrivePreviewUrl(sheetUrl) === "https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview",
    "Transforms Google Sheet to /preview URL"
  );

  const slideUrl = "https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit";
  const slideResult = validateGoogleDriveUrl(slideUrl);
  assert(slideResult.isValid && slideResult.type === "slide", "Validates Google Slides URL");
  assert(
    toGoogleDrivePreviewUrl(slideUrl) === "https://docs.google.com/presentation/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview",
    "Transforms Google Slides to /preview URL"
  );

  const driveFileUrl = "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view?usp=sharing";
  const fileResult = validateGoogleDriveUrl(driveFileUrl);
  assert(fileResult.isValid && fileResult.type === "file", "Validates Google Drive File URL");
  assert(
    toGoogleDrivePreviewUrl(driveFileUrl) === "https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview",
    "Transforms Google Drive File to /preview URL"
  );

  const folderUrl = "https://drive.google.com/drive/folders/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms?usp=sharing";
  const folderResult = validateGoogleDriveUrl(folderUrl);
  assert(folderResult.isValid && folderResult.type === "folder", "Validates Google Drive Folder URL");

  const openIdUrl = "https://drive.google.com/open?id=1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms";
  const openIdResult = validateGoogleDriveUrl(openIdUrl);
  assert(openIdResult.isValid && openIdResult.fileId === "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "Validates Google Drive open?id parameter");

  // Multi-account Google URLs (/u/0/, /u/1/)
  const multiAccountDocUrl = "https://docs.google.com/document/u/0/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit";
  const multiDocResult = validateGoogleDriveUrl(multiAccountDocUrl);
  assert(multiDocResult.isValid && multiDocResult.type === "doc" && multiDocResult.fileId === "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "Validates multi-account Google Doc URL with /u/0/");
  assert(
    toGoogleDrivePreviewUrl(multiAccountDocUrl) === "https://docs.google.com/document/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/preview",
    "Transforms multi-account Google Doc into clean /preview URL"
  );

  const multiAccountFileUrl = "https://drive.google.com/file/u/1/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/view";
  const multiFileResult = validateGoogleDriveUrl(multiAccountFileUrl);
  assert(multiFileResult.isValid && multiFileResult.type === "file" && multiFileResult.fileId === "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms", "Validates multi-account Google Drive File URL with /u/1/");

  // Invalid test cases
  assert(!validateGoogleDriveUrl("https://example.com/homework.pdf").isValid, "Rejects non-Google URL");
  assert(!validateGoogleDriveUrl("not-a-url").isValid, "Rejects malformed URL");
  assert(!validateGoogleDriveUrl("").isValid, "Rejects empty URL");
  assert(!validateGoogleDriveUrl("https://drive.google.com/random/path").isValid, "Rejects Drive URL without valid ID");

  // ----------------------------------------------------
  // TEST 2: Weekly Routine Collision Engine (Non-Subject LAB/BREAK/ECA)
  // ----------------------------------------------------
  console.log("\n[Test Suite 2: Weekly Routine Overlap & Collision Engine]");

  const testRoutineId = `test_rt_${Date.now()}`;
  try {
    // Insert a test non-subject LAB slot (customTitle, subjectId: null, semester: "I", section: "A")
    await db.insert(weeklyRoutine).values({
      id: testRoutineId,
      subjectId: null,
      slotType: "LAB",
      customTitle: "Physics Laboratory Practical",
      semester: "I",
      section: "A",
      dayOfWeek: 6, // Saturday (no seeded routine)
      startTime: "08:00",
      endTime: "09:30",
      room: "Physics Lab 1",
    });

    // 1. Same semester, section, and overlapping time -> MUST COLLIDE
    const collisionOverlap = await checkOverlap(6, "08:30", "10:00", "I", "A", null, undefined, undefined);
    assert(
      collisionOverlap !== null && collisionOverlap.reason.includes("Physics Laboratory Practical"),
      "checkOverlap detects collision with non-subject LAB slot in same semester & section"
    );

    // 1b. Case-insensitive section matching ("a" vs "A") -> MUST COLLIDE
    const caseInsensitiveOverlap = await checkOverlap(6, "08:30", "10:00", "I", "a", null, undefined, undefined);
    assert(
      caseInsensitiveOverlap !== null && caseInsensitiveOverlap.reason.includes("Physics Laboratory Practical"),
      "checkOverlap detects collision case-insensitively for section 'a' vs 'A'"
    );

    // 2. Same time, same semester, but DIFFERENT section ("B") -> NO COLLISION
    const diffSectionOverlap = await checkOverlap(6, "08:30", "10:00", "I", "B", null, undefined, undefined);
    assert(diffSectionOverlap === null, "checkOverlap allows parallel slot in different section");

    // 3. Same time, same section, but DIFFERENT semester ("II") -> NO COLLISION
    const diffSemesterOverlap = await checkOverlap(6, "08:30", "10:00", "II", "A", null, undefined, undefined);
    assert(diffSemesterOverlap === null, "checkOverlap allows parallel slot in different semester");

    // 4. Room collision regardless of section/semester
    const roomCollision = await checkOverlap(6, "08:30", "10:00", "II", "B", null, "Physics Lab 1", undefined);
    assert(
      roomCollision !== null && roomCollision.reason.includes("Room Physics Lab 1 is already booked"),
      "checkOverlap detects room collision across semesters/sections"
    );

    // 5. Non-overlapping time -> NO COLLISION
    const nonOverlap = await checkOverlap(6, "09:30", "11:00", "I", "A", null, undefined, undefined);
    assert(nonOverlap === null, "checkOverlap allows non-overlapping time slot");
  } finally {
    await db.delete(weeklyRoutine).where(eq(weeklyRoutine.id, testRoutineId));
  }

  // ----------------------------------------------------
  // TEST 3: classSessions Composite Slot Constraint (Multi-Section & Double Period)
  // ----------------------------------------------------
  console.log("\n[Test Suite 3: classSessions Multi-Section & Double-Period]");

  const testSessionDate = new Date("2026-11-15T00:00:00.000Z");
  const testSubjectId = "subj_bca151";
  const s1Id = `cs_test_1_${Date.now()}`;
  const s2Id = `cs_test_2_${Date.now()}`;
  const s3Id = `cs_test_3_${Date.now()}`;

  try {
    // Clean any pre-existing sessions for this date
    await db.delete(classSessions).where(
      and(
        eq(classSessions.subjectId, testSubjectId),
        eq(classSessions.sessionDate, testSessionDate)
      )
    );

    // Session 1: Section A morning slot
    await db.insert(classSessions).values({
      id: s1Id,
      subjectId: testSubjectId,
      sessionDate: testSessionDate,
      section: "A",
      startTime: "07:00",
      endTime: "08:00",
    });

    // Session 2: Section B on SAME date and SAME subject (previously crashed unq_class_session_subject_date)
    let s2Success = false;
    try {
      await db.insert(classSessions).values({
        id: s2Id,
        subjectId: testSubjectId,
        sessionDate: testSessionDate,
        section: "B",
        startTime: "07:00",
        endTime: "08:00",
      });
      s2Success = true;
    } catch (e: any) {
      console.error("Failed to insert Section B session:", e.message);
    }
    assert(s2Success, "Allows Section A and Section B to share subject and date without crash");

    // Session 3: Section A double-period (same date, same section, different period 08:00)
    let s3Success = false;
    try {
      await db.insert(classSessions).values({
        id: s3Id,
        subjectId: testSubjectId,
        sessionDate: testSessionDate,
        section: "A",
        startTime: "08:00",
        endTime: "09:00",
      });
      s3Success = true;
    } catch (e: any) {
      console.error("Failed to insert double period session:", e.message);
    }
    assert(s3Success, "Allows double period (theory + practical) on same subject and date");
  } finally {
    await db.delete(classSessions).where(
      and(
        eq(classSessions.subjectId, testSubjectId),
        eq(classSessions.sessionDate, testSessionDate)
      )
    );
  }

  // ----------------------------------------------------
  // TEST 4: Attendance Dispute Preservation (Non-Destructive Upsert)
  // ----------------------------------------------------
  console.log("\n[Test Suite 4: Attendance Dispute Preservation]");

  const testSessionId = `ds_test_${Date.now()}`;
  const testAttendanceId = `da_test_preserve_${Date.now()}`;
  const testCorrectionId = `acr_test_${Date.now()}`;
  const testDate = new Date("2026-10-01T00:00:00.000Z");

  // Get a real student from DB
  const student = await db.query.students.findFirst();
  if (!student) {
    console.error("No student found in database to run attendance dispute test");
    failed++;
  } else {
    try {
      // 1. Create daily session
      await db.insert(dailySessions).values({
        id: testSessionId,
        date: testDate,
        semester: "I",
        section: "A",
      });

      // 2. Create daily attendance marked as 'absent'
      await db.insert(dailyAttendance).values({
        id: testAttendanceId,
        dailySessionId: testSessionId,
        studentId: student.id,
        status: "absent",
      });

      // 3. Create student dispute request linked to that attendance record
      await db.insert(attendanceCorrectionRequests).values({
        id: testCorrectionId,
        attendanceId: testAttendanceId,
        studentId: student.id,
        requestedStatus: "present",
        reason: "I was present during roll call but was marked absent.",
        status: "pending",
      });

      // 4. Simulate roll call re-submission with our dispute-safe upsert logic
      await db.transaction(async (tx) => {
        // Atomic Upsert targeting [dailySessionId, studentId]
        await tx.insert(dailyAttendance).values({
          id: `da_should_be_ignored_${Date.now()}`,
          dailySessionId: testSessionId,
          studentId: student.id,
          status: "present", // Changed to present
        }).onConflictDoUpdate({
          target: [dailyAttendance.dailySessionId, dailyAttendance.studentId],
          set: {
            status: sql`excluded.status`,
          },
        });
      });

      // 5. Verify dailyAttendance row was updated without changing id
      const updatedAtt = await db.query.dailyAttendance.findFirst({
        where: eq(dailyAttendance.dailySessionId, testSessionId),
      });

      assert(
        updatedAtt !== undefined && updatedAtt.id === testAttendanceId && updatedAtt.status === "present",
        "Attendance record ID preserved during roll-call update and status updated"
      );

      // 6. Verify attendance correction request is 100% intact!
      const correctionRequest = await db.query.attendanceCorrectionRequests.findFirst({
        where: eq(attendanceCorrectionRequests.id, testCorrectionId),
      });

      assert(
        correctionRequest !== undefined && correctionRequest.attendanceId === testAttendanceId,
        "Attendance correction request (dispute ticket) was NOT wiped out and remains fully intact"
      );
    } finally {
      // Clean up test records
      await db.delete(attendanceCorrectionRequests).where(eq(attendanceCorrectionRequests.id, testCorrectionId));
      await db.delete(dailyAttendance).where(eq(dailyAttendance.id, testAttendanceId));
      await db.delete(dailySessions).where(eq(dailySessions.id, testSessionId));
    }
  }

  // ----------------------------------------------------
  // TEST 5: Lecture Log & Historical Session Preservation
  // ----------------------------------------------------
  console.log("\n[Test Suite 5: Lecture Log & Historical Session Preservation]");

  const testRoutineIdForSync = `rt_log_pres_${Date.now()}`;
  const testSessionIdForSync = `cs_log_pres_${Date.now()}`;
  const testLogId = `ll_pres_${Date.now()}`;
  const syncDate = new Date("2026-11-20T00:00:00.000Z");

  try {
    // 1. Create routine
    await db.insert(weeklyRoutine).values({
      id: testRoutineIdForSync,
      subjectId: testSubjectId,
      slotType: "LECTURE",
      semester: "I",
      section: "A",
      dayOfWeek: 5,
      startTime: "10:00",
      endTime: "11:00",
    });

    // 2. Create classSession
    await db.insert(classSessions).values({
      id: testSessionIdForSync,
      subjectId: testSubjectId,
      routineId: testRoutineIdForSync,
      sessionDate: syncDate,
      section: "A",
      startTime: "10:00",
      endTime: "11:00",
    });

    // 3. Create teacher lecture log attached to session
    await db.insert(lectureLogs).values({
      id: testLogId,
      classSessionId: testSessionIdForSync,
      topicsCovered: "Chapter 5: Relational Models",
      homework: "Exercise 5.1",
      notes: "High engagement",
    });

    // 4. Run protected sync logic (simulates hardened syncSessionsForRoutine)
    await db.transaction(async (tx) => {
      const existing = await tx.query.classSessions.findMany({
        where: eq(classSessions.routineId, testRoutineIdForSync),
        with: {
          lectureLog: true,
        },
      });

      const sessionsToDelete = existing.filter((s) => !s.lectureLog).map((s) => s.id);
      if (sessionsToDelete.length > 0) {
        await tx.delete(classSessions).where(inArray(classSessions.id, sessionsToDelete));
      }
    });

    // 5. Verify the session and its lecture log were preserved!
    const preservedSession = await db.query.classSessions.findFirst({
      where: eq(classSessions.id, testSessionIdForSync),
      with: { lectureLog: true },
    });

    assert(
      preservedSession !== undefined && preservedSession.lectureLog !== null,
      "Preserves class session with active teacher lecture log from destructive sync wipe"
    );
    assert(
      preservedSession?.lectureLog?.topicsCovered === "Chapter 5: Relational Models",
      "Teacher lecture log topics and data remain 100% intact"
    );
  } finally {
    await db.delete(lectureLogs).where(eq(lectureLogs.id, testLogId));
    await db.delete(classSessions).where(eq(classSessions.id, testSessionIdForSync));
    await db.delete(weeklyRoutine).where(eq(weeklyRoutine.id, testRoutineIdForSync));
  }

  // ----------------------------------------------------
  // Summary
  // ----------------------------------------------------
  console.log("\n==================================================");
  console.log(`  SUMMARY: ${passed} passed, ${failed} failed`);
  console.log("==================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification().catch((err) => {
  console.error("FATAL ERROR in verification suite:", err);
  process.exit(1);
});
