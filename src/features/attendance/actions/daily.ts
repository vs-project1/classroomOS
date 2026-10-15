"use server";
import { db } from "@/db";
import { dailySessions, dailyAttendance, students, teachers, users } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { resolveCurrentStudent } from "@/lib/auth";
import crypto from "node:crypto";
import { eq, and, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { toOrdinalSemester, getSemesterVariants } from "@/lib/utils/roman";

/**
 * Coerce a Date to start-of-day in NPT (Asia/Kathmandu). The `daily_sessions`
 * unique constraint is on (date, semester, section), and the date column should mean
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

export async function getDailyAttendanceForDateAction(semester: string, date: Date | string, section?: string) {
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  let activeSemester = semester;
  let activeSection = section || "A";

  if (user.role === "CR") {
    const student = await db.query.students.findFirst({
      where: eq(students.userId, user.id),
    });
    const crStudent = student || (await resolveCurrentStudent());
    if (crStudent) {
      activeSemester = toOrdinalSemester(crStudent.semester);
      if (!section && crStudent.section) {
        activeSection = crStudent.section;
      }
    }
  }
  const targetDate = nptStartOfDay(typeof date === "string" ? new Date(date) : date);

  const semVariants = getSemesterVariants(activeSemester);
  const session = await db.query.dailySessions.findFirst({
    where: and(
      inArray(dailySessions.semester, semVariants),
      eq(dailySessions.section, activeSection),
      eq(dailySessions.date, targetDate)
    ),
  });

  if (!session) return null;

  const records = await db.select().from(dailyAttendance)
    .where(eq(dailyAttendance.dailySessionId, session.id));

  let markerName = "CR";
  if (session.markedBy) {
    const markerUser = await db.query.users.findFirst({
      where: eq(users.id, session.markedBy),
    });
    if (markerUser?.role === "CR") {
      const student = await db.query.students.findFirst({
        where: eq(students.userId, markerUser.id),
      });
      markerName = student?.name || "CR";
    } else if (markerUser?.role === "TEACHER") {
      const teacher = await db.query.teachers.findFirst({
        where: eq(teachers.userId, markerUser.id),
      });
      markerName = teacher?.name || "Teacher";
    } else if (markerUser?.role === "ADMIN") {
      markerName = "Admin";
    }
  }

  return {
    id: session.id,
    date: session.date,
    semester: session.semester,
    markedByName: markerName,
    records: records.map((a) => ({
      studentId: a.studentId,
      status: a.status as "present" | "absent" | "late" | "excused",
    })),
  };
}

export async function submitDailyAttendanceAction(
  semester: string,
  date: Date,
  records: { studentId: string; status: "present" | "absent" | "late" | "excused" }[],
  section?: string
) {
  const user = await requireAuth(["CR", "ADMIN", "TEACHER"]);
  let targetSemester = toOrdinalSemester(semester);
  let targetSection = section || "A";

  if (user.role === "CR") {
    const student = await db.query.students.findFirst({
      where: eq(students.userId, user.id),
    });
    const crStudent = student || (await resolveCurrentStudent());
    if (crStudent) {
      targetSemester = toOrdinalSemester(crStudent.semester);
      if (!section && crStudent.section) {
        targetSection = crStudent.section;
      }
    }
  }
  const normalizedDate = nptStartOfDay(date);
  const todayNpt = nptStartOfDay(new Date());

  // Strict Academic Domain Invariant: Cannot record attendance for future dates
  if (normalizedDate.getTime() > todayNpt.getTime()) {
    return {
      success: false,
      message: "Cannot record attendance for future dates. Please select today or a past date.",
    };
  }

  const semVariants = getSemesterVariants(targetSemester);

  try {
    let isUpdate = false;

    await db.transaction(async (tx) => {
      // Check if session already exists for this date + semester + section
      const existingSession = await tx.query.dailySessions.findFirst({
        where: and(
          inArray(dailySessions.semester, semVariants),
          eq(dailySessions.section, targetSection),
          eq(dailySessions.date, normalizedDate)
        ),
      });

      let sessionId: string;

      if (existingSession) {
        isUpdate = true;
        sessionId = existingSession.id;
        // Update markedBy to reflect current editor
        await tx.update(dailySessions).set({
          markedBy: user.id,
        }).where(eq(dailySessions.id, sessionId));
      } else {
        sessionId = `ds_${crypto.randomUUID()}`;
        await tx.insert(dailySessions).values({
          id: sessionId,
          date: normalizedDate,
          semester: targetSemester,
          section: targetSection,
          markedBy: user.id,
        });
      }

      // Atomic Upsert on unq_daily_attendance_session_student:
      // Preserves dailyAttendance.id so cascading attendanceCorrectionRequests remain intact.
      for (const record of records) {
        await tx.insert(dailyAttendance).values({
          id: `da_${crypto.randomUUID()}`,
          dailySessionId: sessionId,
          studentId: record.studentId,
          status: record.status,
        }).onConflictDoUpdate({
          target: [dailyAttendance.dailySessionId, dailyAttendance.studentId],
          set: {
            status: sql`excluded.status`,
          },
        });
      }
    });

    revalidatePath("/");
    revalidatePath("/today");
    revalidatePath("/teacher/attendance");
    revalidatePath("/teacher/attendance/roster");
    revalidatePath("/cr/take-attendance");
    revalidatePath("/cr/attendance");
    revalidatePath("/attendance/monthly");
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
