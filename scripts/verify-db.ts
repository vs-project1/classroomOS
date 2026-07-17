import "dotenv/config";
import { db } from "../src/db/client";
import { subjects, students, classSessions, lectureLogs, attendance } from "../src/db/schema";
import { eq } from "drizzle-orm";
import crypto from "crypto";

async function verify() {
  console.log("⏳ Starting Phase 2 database verification test...");

  const testId = crypto.randomUUID();
  const subjectId = `subj_${testId.slice(0, 8)}`;
  const studentId = `stud_${testId.slice(0, 8)}`;
  const sessionId = `sess_${testId.slice(0, 8)}`;
  const logId = `log_${testId.slice(0, 8)}`;
  const attId = `att_${testId.slice(0, 8)}`;

  try {
    console.log("1. Inserting Subject and Student...");
    await db.insert(subjects).values({
      id: subjectId,
      name: `Advanced Database Design ${testId.slice(0, 4)}`,
      code: `CS-${testId.slice(0, 4)}`,
    });

    await db.insert(students).values({
      id: studentId,
      name: "Test Student",
      rollNumber: `ROLL-${testId.slice(0, 6)}`,
    });

    console.log("2. Inserting Class Session...");
    const now = new Date();
    await db.insert(classSessions).values({
      id: sessionId,
      subjectId,
      sessionDate: now,
      startTime: "10:00",
      endTime: "11:30",
    });

    console.log("3. Inserting Lecture Log and Attendance...");
    await db.insert(lectureLogs).values({
      id: logId,
      classSessionId: sessionId,
      topicsCovered: "Relational Modeling",
      homework: "Read Chapter 4",
      notes: "Focus on BCNF",
    });

    await db.insert(attendance).values({
      id: attId,
      classSessionId: sessionId,
      studentId,
      status: "present",
    });

    console.log("4. Verifying Drizzle Relations query...");
    const sessionWithRelations = await db.query.classSessions.findFirst({
      where: eq(classSessions.id, sessionId),
      with: {
        subject: true,
        lectureLog: true,
        attendance: {
          with: {
            student: true
          }
        }
      }
    });

    if (!sessionWithRelations) {
      throw new Error("Failed to fetch session via relations.");
    }
    if (sessionWithRelations.subject.id !== subjectId) {
      throw new Error("Subject relation mismatch.");
    }
    if (sessionWithRelations.lectureLog?.topicsCovered !== "Relational Modeling") {
      throw new Error("Lecture Log relation mismatch.");
    }
    if (sessionWithRelations.attendance.length !== 1 || sessionWithRelations.attendance[0].student.id !== studentId) {
      throw new Error("Attendance/Student relation mismatch.");
    }

    console.log("5. Testing Constraints: Duplicate Attendance Rejection...");
    let caughtDuplicate = false;
    try {
      await db.insert(attendance).values({
        id: `att_dup_${testId.slice(0, 8)}`,
        classSessionId: sessionId,
        studentId,
        status: "absent",
      });
    } catch {
      caughtDuplicate = true;
    }
    if (!caughtDuplicate) {
      throw new Error("Constraint Failed: Allowed duplicate attendance for the same student and session.");
    }

    console.log("6. Testing Constraints: Invalid Status Rejection...");
    let caughtInvalidStatus = false;
    try {
      await db.insert(attendance).values({
        id: `att_inv_${testId.slice(0, 8)}`,
        classSessionId: sessionId,
        studentId,
        status: "sleeping", // Not in the CHECK constraint
      });
    } catch {
      caughtInvalidStatus = true;
    }
    if (!caughtInvalidStatus) {
      throw new Error("Constraint Failed: Allowed invalid attendance status 'sleeping'.");
    }

    console.log("7. Testing Cascading Deletes...");
    await db.delete(subjects).where(eq(subjects.id, subjectId));

    // Verify session, lecture log, and attendance are gone
    const checkSession = await db.select().from(classSessions).where(eq(classSessions.id, sessionId)).get();
    const checkLog = await db.select().from(lectureLogs).where(eq(lectureLogs.id, logId)).get();
    const checkAtt = await db.select().from(attendance).where(eq(attendance.id, attId)).get();

    if (checkSession || checkLog || checkAtt) {
      throw new Error("Cascade Delete Failed: Child records still exist after deleting subject.");
    }

    console.log("8. Cleaning up remaining test student...");
    await db.delete(students).where(eq(students.id, studentId));

    console.log("✅ All Database constraints and relations verified successfully!");
    process.exit(0);
  } catch (error) {
    console.error("❌ Database verification failed with error:", error);
    process.exit(1);
  }
}

verify();
