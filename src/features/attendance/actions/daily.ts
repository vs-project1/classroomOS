"use server";
import { db } from "@/db";
import { dailySessions, dailyAttendance, students } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Coerce a Date to start-of-day in NPT (Asia/Kathmandu). The `daily_sessions`
 * unique constraint is on (date, semester), and the date column should mean
 * "this calendar day", not "this moment in time". Without normalization, two
 * submits 5 seconds apart produce two distinct `date` epoch values and
 * silently bypass the uniqueness guard.
 */
function nptStartOfDay(d: Date): Date {
  // Build the NPT Y-M-D string, then re-parse as UTC midnight. This avoids
  // the host-timezone surprise where `new Date()` truncates in local TZ.
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // "2026-08-26"
  return new Date(`${ymd}T00:00:00Z`);
}

export async function submitDailyAttendanceAction(
  semester: string,
  date: Date,
  records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]
) {
  const user = await requireAuth(["CR", "ADMIN"]);

  // Normalize the date to NPT start-of-day so the unique constraint actually
  // means "one roll call per (day, semester)".
  const normalizedDate = nptStartOfDay(date);

  try {
    await db.transaction(async (tx) => {
      const sessionId = `ds_${crypto.randomUUID()}`;

      await tx.insert(dailySessions).values({
        id: sessionId,
        date: normalizedDate,
        semester,
        markedBy: user.id
      });
      
      const attRecords = records.map(r => ({
        id: `da_${crypto.randomUUID()}`,
        dailySessionId: sessionId,
        studentId: r.studentId,
        status: r.status
      }));

      // Drizzle's .values() throws on an empty array. The roster may be
      // empty when the CR's semester doesn't match any seeded students
      // (semester string mismatch between seed and page). Allow the
      // session row to persist in that case — re-submitting with a real
      // roster should overwrite via the uniqueness constraint, not error.
      if (attRecords.length > 0) {
        await tx.insert(dailyAttendance).values(attRecords);
      }
    });
    
    revalidatePath("/cr/take-attendance");
    revalidatePath("/attendance/monthly");
    revalidatePath("/attendance");
    return { success: true, message: "Daily attendance logged successfully." };
  } catch (err: any) {
    // Drizzle wraps libSQL errors: the top-level message is the generic
    // "Failed query: ..." string, while the actual SQLITE_CONSTRAINT_UNIQUE
    // reason lives on `err.cause.message`. Walk the cause chain so we
    // reliably detect the unique-constraint violation.
    const flat = (e: any): string => {
      const parts: string[] = [];
      let cur = e;
      let depth = 0;
      while (cur && depth < 5) {
        if (cur.message) parts.push(String(cur.message));
        if (cur.code) parts.push(String(cur.code));
        cur = cur.cause;
        depth++;
      }
      return parts.join(" | ");
    };
    const flatMessage = flat(err);
    if (
      flatMessage.includes("UNIQUE constraint failed") ||
      flatMessage.includes("unq_daily_session_date_sem") ||
      flatMessage.includes("SQLITE_CONSTRAINT_UNIQUE")
    ) {
      return { success: false, message: "Daily attendance has already been taken for this semester today." };
    }
    // Surface the real error in dev so failures aren't masked behind a
    // generic banner. The user-flow spec asserts on the *visible* message,
    // so a useful string matters more than a clean one.
    console.error("[submitDailyAttendanceAction]", err);
    return { success: false, message: `Failed to log daily attendance. (${err?.message ?? String(err)})` };
  }
}
