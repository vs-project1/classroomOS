"use server";

import { db } from "@/db";
import { weeklyRoutine, classSessions, attendance, enrollments, students, users, subjects } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { and, eq, ne, gte, lte, inArray } from "drizzle-orm";
import { parseAndNormalizeTime } from "@/lib/time";
import { requireAuth } from "@/lib/auth/session";
import { notifyMany } from "@/lib/notifications";

const routineSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  dayOfWeek: z.coerce.number().min(0).max(6, "Invalid day of week"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time"),
  teacherName: z.string().optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.startTime < data.endTime, {
  message: "End time must be after start time",
  path: ["endTime"]
});

async function checkOverlap(dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) {
  const existingRoutines = await db.query.weeklyRoutine.findMany({
    where: excludeId 
      ? and(eq(weeklyRoutine.dayOfWeek, dayOfWeek), ne(weeklyRoutine.id, excludeId))
      : eq(weeklyRoutine.dayOfWeek, dayOfWeek)
  });

  for (const r of existingRoutines) {
    if (startTime < r.endTime && endTime > r.startTime) {
      return r;
    }
  }
  return null;
}

// --- Routine Intelligence helpers (Task 18) ---

function getNptYmd(): { y: number; m: number; d: number; dateStr: string } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kathmandu",
    year: "numeric",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const y = parseInt(parts.find((p) => p.type === "year")?.value ?? "1970", 10);
  const m = parseInt(parts.find((p) => p.type === "month")?.value ?? "1", 10) - 1;
  const d = parseInt(parts.find((p) => p.type === "day")?.value ?? "1", 10);
  const mm = String(m + 1).padStart(2, "0");
  const dd = String(d).padStart(2, "0");
  return { y, m, d, dateStr: `${y}-${mm}-${dd}` };
}

async function notifyEnrolledStudents(subjectId: string, title: string, link: string) {
  try {
    const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, subjectId) });
    const subjectLabel = subject?.name ?? "a subject";
    const finalTitle = title.replace("{subject}", subjectLabel);
    // enrollments.studentId is legacy students.id — map via students.email = users.email
    const enrolledUsers = await db
      .selectDistinct({ userId: users.id })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .innerJoin(users, eq(users.email, students.email))
      .where(eq(enrollments.subjectId, subjectId));

    if (enrolledUsers.length === 0) return;

    await notifyMany(
      enrolledUsers.map((row) => ({
        userId: row.userId,
        type: "system" as const,
        title: finalTitle,
        link,
      }))
    );
  } catch (e) {
    console.error("[routine] failed to notify enrolled students", e);
  }
}

async function syncSessionsForRoutine(params: {
  routineId: string;
  subjectId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}) {
  const { routineId, subjectId, dayOfWeek, startTime, endTime } = params;
  const { y, m, d } = getNptYmd();

  // 14-day window: today inclusive
  const startDateStr = (() => {
    const mm = String(m + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    return `${y}-${mm}-${dd}`;
  })();

  const endDate = new Date(y, m, d);
  endDate.setDate(endDate.getDate() + 13);
  const endY = endDate.getFullYear();
  const endM = endDate.getMonth();
  const endD = endDate.getDate();
  const endDateStr = `${endY}-${String(endM + 1).padStart(2, "0")}-${String(endD).padStart(2, "0")}`;

  const windowStart = new Date(`${startDateStr}T00:00:00.000Z`);
  const windowEnd = new Date(`${endDateStr}T23:59:59.999Z`);

  // 1) Delete attendance for sessions that will be replaced (explicit, even though cascade would handle)
  const existing = await db.query.classSessions.findMany({
    where: and(eq(classSessions.routineId, routineId), gte(classSessions.sessionDate, windowStart), lte(classSessions.sessionDate, windowEnd)),
  });

  if (existing.length > 0) {
    const ids = existing.map((s) => s.id);
    // explicit attendance cleanup
    try {
      await db.delete(attendance).where(inArray(attendance.classSessionId, ids));
    } catch (e) {
      console.error("[routine] failed to delete attendance for regen", e);
    }
    await db.delete(classSessions).where(inArray(classSessions.id, ids));
  }

  // 2) Insert new sessions for each matching weekday in the 14-day window
  const toInsert: typeof classSessions.$inferInsert[] = [];
  for (let i = 0; i < 14; i++) {
    const cur = new Date(y, m, d);
    cur.setDate(cur.getDate() + i);
    if (cur.getDay() !== dayOfWeek) continue;
    const yy = cur.getFullYear();
    const mm2 = String(cur.getMonth() + 1).padStart(2, "0");
    const dd2 = String(cur.getDate()).padStart(2, "0");
    const dateStr = `${yy}-${mm2}-${dd2}`;
    const sessionDate = new Date(`${dateStr}T00:00:00.000Z`);
    toInsert.push({
      id: crypto.randomUUID(),
      subjectId,
      routineId,
      sessionDate,
      startTime,
      endTime,
    });
  }

  for (const row of toInsert) {
    try {
      await db.insert(classSessions).values(row);
    } catch (e: any) {
      // unique on (subjectId, sessionDate) — another routine may have created same slot; skip
      if (String(e?.message ?? "").includes("UNIQUE") || String(e?.cause ?? "").includes("UNIQUE")) {
        continue;
      }
      console.error("[routine] failed to insert classSession", row, e);
    }
  }

  // 3) Notify enrolled students (best-effort, never throws)
  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, subjectId) });
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek] ?? `${dayOfWeek}`;
  await notifyEnrolledStudents(subjectId, `Timetable updated: ${subject?.name ?? "A class"} on ${dayName} ${startTime}–${endTime}`, "/routine");
}

export async function saveRoutine(prevState: any, formData: FormData) {
  await requireAuth(["TEACHER", "ADMIN"]);

  const id = formData.get("id")?.toString();
  const rawStartTime = formData.get("startTime")?.toString() || "";
  const rawEndTime = formData.get("endTime")?.toString() || "";
  const normalizedStartTime = parseAndNormalizeTime(rawStartTime) || rawStartTime;
  const normalizedEndTime = parseAndNormalizeTime(rawEndTime) || rawEndTime;

  const rawData = {
    subjectId: formData.get("subjectId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
    teacherName: formData.get("teacherName") || undefined,
    room: formData.get("room") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const validatedFields = routineSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  // Check overlap
  const overlap = await checkOverlap(data.dayOfWeek, data.startTime, data.endTime, id);
  if (overlap) {
    const subject = await db.query.subjects.findFirst({ where: (s, { eq }) => eq(s.id, overlap.subjectId) });
    return {
      success: false,
      message: `This routine overlaps with ${subject?.name || "another class"} from ${overlap.startTime} to ${overlap.endTime}.`
    };
  }

  // For update we need the routineId to sync; for insert generate upfront
  const routineId = id ?? crypto.randomUUID();

  try {
    if (id) {
      await db.update(weeklyRoutine)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(weeklyRoutine.id, id));
    } else {
      await db.insert(weeklyRoutine).values({
        id: routineId,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to save routine:", error);
    return {
      success: false,
      message: "Database error. Failed to save routine.",
    };
  }

  // Routine Intelligence: regen classSessions for next 14 days + notify
  try {
    await syncSessionsForRoutine({
      routineId,
      subjectId: data.subjectId,
      dayOfWeek: data.dayOfWeek,
      startTime: data.startTime,
      endTime: data.endTime,
    });
  } catch (e) {
    console.error("[routine] syncSessionsForRoutine failed", e);
  }

  revalidatePath("/routine");
  revalidatePath("/teacher/routine");
  revalidatePath("/admin/routine");
  revalidatePath("/");
  revalidatePath("/today");
  redirect("/routine");
}

export async function deleteRoutine(id: string) {
  await requireAuth(["TEACHER", "ADMIN"]);

  // Capture routine for notification + session cleanup before delete
  let routineForNotify: { subjectId: string; dayOfWeek: number } | null = null;
  try {
    const found = await db.query.weeklyRoutine.findFirst({ where: eq(weeklyRoutine.id, id) });
    if (found) routineForNotify = { subjectId: found.subjectId, dayOfWeek: found.dayOfWeek };
  } catch {}

  try {
    // Delete future classSessions for this routine (next 14 days window) + attendance
    try {
      const { y, m, d } = getNptYmd();
      const startDateStr = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const endDate = new Date(y, m, d);
      endDate.setDate(endDate.getDate() + 13);
      const endDateStr = `${endDate.getFullYear()}-${String(endDate.getMonth() + 1).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
      const windowStart = new Date(`${startDateStr}T00:00:00.000Z`);
      const windowEnd = new Date(`${endDateStr}T23:59:59.999Z`);
      const sessions = await db.query.classSessions.findMany({
        where: and(eq(classSessions.routineId, id), gte(classSessions.sessionDate, windowStart), lte(classSessions.sessionDate, windowEnd)),
      });
      if (sessions.length > 0) {
        const ids = sessions.map((s) => s.id);
        try {
          await db.delete(attendance).where(inArray(attendance.classSessionId, ids));
        } catch {}
        await db.delete(classSessions).where(inArray(classSessions.id, ids));
      }
    } catch (e) {
      console.error("[routine] failed to clean sessions on delete", e);
    }

    await db.delete(weeklyRoutine).where(eq(weeklyRoutine.id, id));

    if (routineForNotify) {
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][routineForNotify.dayOfWeek] ?? "";
      await notifyEnrolledStudents(
        routineForNotify.subjectId,
        `Class cancelled: {subject} on ${dayName} has been removed`,
        "/routine"
      );
    }

    revalidatePath("/routine");
    revalidatePath("/teacher/routine");
    revalidatePath("/admin/routine");
    revalidatePath("/today");
    revalidatePath("/");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete routine:", error);
  }
  redirect("/routine");
}
