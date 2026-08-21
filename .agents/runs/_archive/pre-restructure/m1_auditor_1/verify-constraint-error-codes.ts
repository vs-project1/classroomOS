import { config } from "dotenv";
config({ path: ".env.local" });
config();

import { db } from "../../src/db/client";
import {
  users,
  studentProfiles,
  assignmentSubmissions,
  exams,
  studyTasks,
  notifications,
  attendanceCorrectionRequests,
  attendance,
} from "../../src/db/schema";
import crypto from "crypto";

async function checkConstraintError(name: string, fn: () => Promise<any>) {
  try {
    await fn();
    console.error(`✗ [FAIL] ${name} did NOT throw!`);
  } catch (err: any) {
    const isSqliteConstraint =
      err.code === "SQLITE_CONSTRAINT" ||
      err.cause?.code === "SQLITE_CONSTRAINT" ||
      String(err.message).includes("CHECK constraint failed") ||
      String(err.message).includes("UNIQUE constraint failed") ||
      String(err.cause?.message).includes("CHECK constraint failed") ||
      String(err.cause?.message).includes("UNIQUE constraint failed");

    if (isSqliteConstraint) {
      console.log(`✓ [GENUINE SQLITE CONSTRAINT] ${name}: ${err.cause?.message || err.message}`);
    } else {
      console.error(`✗ [NON-SQLITE ERROR] ${name}:`, err);
    }
  }
}

async function main() {
  const prefix = `chk_${crypto.randomUUID().slice(0, 8)}`;

  console.log("Testing SQLite CHECK & UNIQUE Constraints for Real Engine Enforcement:\n");

  await checkConstraintError("User Invalid Role", () =>
    db.insert(users).values({
      id: `${prefix}_u1`,
      email: `${prefix}_u1@test.com`,
      passwordHash: "pass",
      role: "HACKER" as any,
    })
  );

  await checkConstraintError("Student Profile Semester Out of Range (0)", () =>
    db.insert(studentProfiles).values({
      id: `${prefix}_sp0`,
      userId: `${prefix}_u_nonexistent`,
      rollNumber: `ROLL-${prefix}-0`,
      faculty: "BCA",
      semester: 0,
      section: "A",
      batchYear: 2024,
    })
  );

  await checkConstraintError("Assignment Submission Invalid Status", () =>
    db.insert(assignmentSubmissions).values({
      id: `${prefix}_as1`,
      homeworkId: "non_existent_hw",
      studentId: "non_existent_std",
      status: "invalid_status" as any,
    })
  );

  await checkConstraintError("Assignment Submission Negative Score", () =>
    db.insert(assignmentSubmissions).values({
      id: `${prefix}_as2`,
      homeworkId: "non_existent_hw",
      studentId: "non_existent_std",
      score: -10,
    })
  );

  await checkConstraintError("Exam Marks Pass > Total", () =>
    db.insert(exams).values({
      id: `${prefix}_ex1`,
      subjectId: "non_existent_subj",
      title: "Bad Marks Exam",
      examType: "unit_test",
      totalMarks: 20,
      passMarks: 25,
      examDate: new Date(),
    })
  );

  await checkConstraintError("Exam Backwards Time", () =>
    db.insert(exams).values({
      id: `${prefix}_ex2`,
      subjectId: "non_existent_subj",
      title: "Bad Time Exam",
      examType: "unit_test",
      totalMarks: 20,
      passMarks: 8,
      examDate: new Date(),
      startTime: "11:00",
      endTime: "09:00",
    })
  );

  await checkConstraintError("Study Task Invalid Priority", () =>
    db.insert(studyTasks).values({
      id: `${prefix}_st1`,
      studentId: "non_existent_std",
      title: "Bad Prio Task",
      priority: "extreme" as any,
    })
  );

  await checkConstraintError("Notification Invalid Type", () =>
    db.insert(notifications).values({
      id: `${prefix}_notif1`,
      userId: "non_existent_user",
      title: "Bad Type",
      message: "Bad Type Msg",
      type: "invalid_type" as any,
    })
  );

  await checkConstraintError("Attendance Correction Invalid Requested Status", () =>
    db.insert(attendanceCorrectionRequests).values({
      id: `${prefix}_cr1`,
      attendanceId: "non_existent_att",
      studentId: "non_existent_std",
      requestedStatus: "absent" as any,
      reason: "test",
    })
  );
}

main().catch(console.error);
