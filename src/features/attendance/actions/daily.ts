"use server";
import { db } from "@/db";
import { dailySessions, dailyAttendance, students, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import crypto from "node:crypto";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Coerce a Date to start-of-day in NPT (Asia/Kathmandu). The `daily_sessions`
 * unique constraint is on (date, semester), and the date column should mean
 * "this calendar day", not "this moment in time".
 */
function nptStartOfDay(d: Date): Date {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
  return new Date(`${ymd}T00:00:00Z`);
}

export async function getDailyAttendanceForDateAction(semester: string, date: Date | string) {
  await requireAuth(["CR", "ADMIN", "TEACHER"]);
  const targetDate = nptStartOfDay(typeof date === "string" ? new Date(date) : date);

  const session = await db.query.dailySessions.findFirst({
    where: and(
      eq(dailySessions.semester, semester),
      eq(dailySessions.date, targetDate)
    ),
  });

  if (!session) return null;

  const records = await db.select().from(dailyAttendance)
    .where(eq(dailyAttendance.dailySessionId, session.id));

  return {
    id: session.id,
    date: session.date,
    semester: session.semester,
    markedByName: "CR",
    records: records.map((a) => ({
      studentId: a.studentId,
      status: a.status as "present" | "absent" | "late" | "excused",
    })),
  };
}

export async function submitDailyAttendanceAction(
  semester: string,
  date: Date,
  records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[]
) {
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  const normalizedDate = nptStartOfDay(date);

  try {
    let isUpdate = false;

    await db.transaction(async (tx) => {
      // Check if session already exists for this date + semester
      const existingSession = await tx.query.dailySessions.findFirst({
        where: and(
          eq(dailySessions.semester, semester),
          eq(dailySessions.date, normalizedDate)
        ),
      });

      let sessionId: string;

      if (existingSession) {
        isUpdate = true;
        sessionId = existingSession.id;
        // Delete previous records for clean update
        await tx.delete(dailyAttendance).where(eq(dailyAttendance.dailySessionId, sessionId));
      } else {
        sessionId = `ds_${crypto.randomUUID()}`;
        await tx.insert(dailySessions).values({
          id: sessionId,
          date: normalizedDate,
          semester,
          markedBy: user.id,
        });
      }

      const attRecords = records.map((r) => ({
        id: `da_${crypto.randomUUID()}`,
        dailySessionId: sessionId,
        studentId: r.studentId,
        status: r.status,
      }));

      if (attRecords.length > 0) {
        await tx.insert(dailyAttendance).values(attRecords);
      }
    });

    revalidatePath("/");
    revalidatePath("/today");
    revalidatePath("/teacher/attendance");
    revalidatePath("/cr/take-attendance");
    revalidatePath("/attendance/monthly");
    revalidatePath("/cr/attendance/monthly");
    revalidatePath("/admin/attendance/monthly");
    revalidatePath("/attendance");
    revalidatePath("/cr");

    return {
      success: true,
      message: isUpdate
        ? "Daily attendance updated successfully."
        : "Daily attendance logged successfully.",
    };
  } catch (err: any) {
    console.error("[submitDailyAttendanceAction]", err);
    return {
      success: false,
      message: `Failed to save attendance. (${err?.message ?? String(err)})`,
    };
  }
}
