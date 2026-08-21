import { drizzle } from "drizzle-orm/libsql";
import { createClient } from "@libsql/client";
import { classSessions, lectureLogs, attendance, subjects, students } from "../src/db/schema";
import { sql } from "drizzle-orm";
import crypto from "crypto";
import { slugify } from "../src/utils/slug";

const client = createClient({
  url: process.env.DATABASE_URL!,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});
const db = drizzle(client);

async function run() {
  console.log("=== Verifying Database Transaction Rollback ===\n");

  // 1. Get initial row counts
  const [{ count: initialSessions }] = await db.select({ count: sql`count(*)` }).from(classSessions);
  const [{ count: initialLogs }] = await db.select({ count: sql`count(*)` }).from(lectureLogs);
  const [{ count: initialAttendance }] = await db.select({ count: sql`count(*)` }).from(attendance);

  console.log(`Initial Counts:`);
  console.log(`- Sessions: ${initialSessions}`);
  console.log(`- Logs: ${initialLogs}`);
  console.log(`- Attendance: ${initialAttendance}\n`);

  // 2. We need at least one subject to satisfy FK constraints
  const subjectList = await db.select().from(subjects);
  let testSubjectId = subjectList[0]?.id;

  if (!testSubjectId) {
    testSubjectId = crypto.randomUUID();
    await db.insert(subjects).values({ id: testSubjectId, name: "Rollback Test Subject", slug: slugify("Rollback Test Subject"), code: "RB101" });
  }

  // 3. Attempt a transaction that intentionally fails at the last step
  const sessionId = crypto.randomUUID();
  const logId = crypto.randomUUID();

  try {
    await db.transaction(async (tx) => {
      console.log("-> Starting Transaction...");
      
      // Step A: Insert Session (should succeed)
      console.log("   -> Inserting Session...");
      await tx.insert(classSessions).values({
        id: sessionId,
        subjectId: testSubjectId,
        sessionDate: new Date(),
        startTime: "10:00",
        endTime: "11:00",
      });

      // Step B: Insert Log (should succeed)
      console.log("   -> Inserting Lecture Log...");
      await tx.insert(lectureLogs).values({
        id: logId,
        classSessionId: sessionId,
        topicsCovered: "Testing Rollbacks",
        homework: "Read source code",
        notes: "Verify log output",
      });

      // Step C: Intentional Failure!
      // We will insert an attendance record with a studentId that definitely does not exist.
      // This violates the FK constraint `attendance.studentId -> students.id`.
      console.log("   -> Inserting invalid attendance (triggering FK violation)...");
      await tx.insert(attendance).values({
        id: crypto.randomUUID(),
        classSessionId: sessionId,
        studentId: "non-existent-student-id-123", // WILL FAIL
        status: "present",
      });

      // This line should never be reached
      console.log("❌ Transaction unexpectedly succeeded!");
    });
  } catch (error: unknown) {
    const err = error as Error;
    console.log(`\n✅ Transaction caught expected error: ${err.message}`);
  }

  // 4. Verify counts are unchanged (Transaction completely rolled back)
  const [{ count: finalSessions }] = await db.select({ count: sql`count(*)` }).from(classSessions);
  const [{ count: finalLogs }] = await db.select({ count: sql`count(*)` }).from(lectureLogs);
  const [{ count: finalAttendance }] = await db.select({ count: sql`count(*)` }).from(attendance);

  console.log(`\nFinal Counts (Should match initial):`);
  console.log(`- Sessions: ${finalSessions}`);
  console.log(`- Logs: ${finalLogs}`);
  console.log(`- Attendance: ${finalAttendance}\n`);

  let allPassed = true;
  if (initialSessions !== finalSessions) {
    console.error("❌ Session count changed! Rollback failed.");
    allPassed = false;
  }
  if (initialLogs !== finalLogs) {
    console.error("❌ Lecture Log count changed! Rollback failed.");
    allPassed = false;
  }
  if (initialAttendance !== finalAttendance) {
    console.error("❌ Attendance count changed! Rollback failed.");
    allPassed = false;
  }

  if (allPassed) {
    console.log("🎉 ALL TESTS PASSED: Transaction rollback successfully prevented partial inserts.");
  } else {
    process.exit(1);
  }
}

run().catch(console.error);
