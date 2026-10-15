"use server";

import { db } from "@/db";
import { weeklyRoutine, classSessions, enrollments, students, users, subjects } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { and, eq, ne, gte, lte, inArray } from "drizzle-orm";
import { parseAndNormalizeTime } from "@/lib/timezone";
import { areSemestersEqual } from "@/lib/utils/roman";
import { requireAuth } from "@/lib/auth/session";
import { notifyMany } from "@/lib/notifications";
import { markSemesterRoutineModified } from "@/features/telegram/actions/telegram-actions";
import type { ActionResult } from "@/lib/types/action-result";

const routineSchema = z.object({
  subjectId: z.string().optional().nullable(),
  teacherId: z.string().optional().nullable(),
  semester: z.string().default("I"),
  section: z.string().default("A"),
  slotType: z.enum(["LECTURE", "LAB", "BREAK", "ECA", "LIBRARY"]).default("LECTURE"),
  customTitle: z.string().optional().nullable(),
  dayOfWeek: z.coerce.number().min(0).max(6, "Invalid day of week"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time"),
  room: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.startTime < data.endTime, {
  message: "End time must be after start time",
  path: ["endTime"]
}).refine(data => {
  if (data.slotType === "LECTURE" || data.slotType === "LAB") {
    return Boolean(data.subjectId || data.customTitle);
  }
  return true;
}, {
  message: "Subject or custom title is required for lecture/lab slots",
  path: ["subjectId"]
});

export async function checkOverlap(
  dayOfWeek: number, 
  startTime: string, 
  endTime: string, 
  semester: string,
  section: string = "A",
  subjectId?: string | null,
  room?: string,
  teacherId?: string | null,
  excludeId?: string
) {
  const existingRoutines = await db.query.weeklyRoutine.findMany({
    where: excludeId 
      ? and(eq(weeklyRoutine.dayOfWeek, dayOfWeek), ne(weeklyRoutine.id, excludeId))
      : eq(weeklyRoutine.dayOfWeek, dayOfWeek),
    with: {
      subject: true
    }
  });

  const newSubject = subjectId ? await db.query.subjects.findFirst({ where: eq(subjects.id, subjectId) }) : null;
  const effectiveTeacherId = teacherId || newSubject?.teacherId || null;

  for (const r of existingRoutines) {
    if (startTime < r.endTime && endTime > r.startTime) {
      // 1. Room overlap
      if (room && r.room && room.trim().toLowerCase() === r.room.trim().toLowerCase()) {
         return { reason: `Room ${room} is already booked for ${r.subject?.name ?? r.customTitle ?? "another class"}` };
      }
      // 2. Teacher overlap
      const existingTeacherId = r.teacherId || r.subject?.teacherId || null;
      if (effectiveTeacherId && existingTeacherId && effectiveTeacherId === existingTeacherId) {
         return { reason: `The assigned teacher is already teaching ${r.subject?.name ?? r.customTitle ?? "another slot"} at this time` };
      }
      // 3. Semester + section overlap:
      // Validates across ALL slot types (including BREAK, LAB, ECA with customTitle)
      const existingSemester = r.semester || r.subject?.semester;
      if (
        existingSemester &&
        areSemestersEqual(semester, existingSemester) &&
        (r.section?.trim().toUpperCase() === section?.trim().toUpperCase())
      ) {
         const slotName = r.subject?.name ?? r.customTitle ?? r.slotType ?? "another slot";
         return { reason: `Semester ${semester} (Section ${section}) already has ${slotName} scheduled at this time` };
      }
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
    // Canonical foreign key join: students.userId = users.id
    const enrolledUsers = await db
      .selectDistinct({ userId: users.id })
      .from(enrollments)
      .innerJoin(students, eq(students.id, enrollments.studentId))
      .innerJoin(users, eq(users.id, students.userId))
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
  section?: string;
}) {
  const { routineId, subjectId, dayOfWeek, startTime, endTime, section = "A" } = params;
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

  // Insert new sessions for each matching weekday in the 14-day window
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
      section,
      startTime,
      endTime,
    });
  }

  // Wrap entire 14-day session wipe & rebuild in an atomic transaction:
  await db.transaction(async (tx) => {
    const existing = await tx.query.classSessions.findMany({
      where: and(
        eq(classSessions.routineId, routineId),
        gte(classSessions.sessionDate, windowStart),
        lte(classSessions.sessionDate, windowEnd)
      ),
      with: {
        lectureLog: true,
      },
    });

    // Protect historical lecture logs: only purge sessions that don't have recorded lecture logs
    const sessionsToDelete = existing.filter((s) => !s.lectureLog).map((s) => s.id);
    if (sessionsToDelete.length > 0) {
      await tx.delete(classSessions).where(inArray(classSessions.id, sessionsToDelete));
    }

    if (toInsert.length > 0) {
      await tx.insert(classSessions).values(toInsert).onConflictDoNothing();
    }
  });

  // Notify enrolled students (best-effort, never throws)
  const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, subjectId) });
  const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][dayOfWeek] ?? `${dayOfWeek}`;
  await notifyEnrolledStudents(subjectId, `Timetable updated: ${subject?.name ?? "A class"} on ${dayName} ${startTime}–${endTime}`, "/routine");
}

export async function saveRoutine(
  prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const id = formData.get("id")?.toString();
  const rawStartTime = formData.get("startTime")?.toString() || "";
  const rawEndTime = formData.get("endTime")?.toString() || "";
  const normalizedStartTime = parseAndNormalizeTime(rawStartTime) || rawStartTime;
  const normalizedEndTime = parseAndNormalizeTime(rawEndTime) || rawEndTime;

  const rawData = {
    subjectId: formData.get("subjectId") ? formData.get("subjectId")?.toString() : null,
    teacherId: formData.get("teacherId") ? formData.get("teacherId")?.toString() : null,
    semester: formData.get("semester")?.toString() || "I",
    section: formData.get("section")?.toString() || "A",
    slotType: (formData.get("slotType")?.toString() || "LECTURE") as any,
    customTitle: formData.get("customTitle") ? formData.get("customTitle")?.toString() : null,
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
    room: formData.get("room")?.toString() || undefined,
    notes: formData.get("notes")?.toString() || undefined,
  };

  const validatedFields = routineSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  // Resolve effective semester: if subject is selected, match subject's semester
  let effectiveSemester = data.semester;
  if (data.subjectId) {
    const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, data.subjectId) });
    if (subject?.semester) {
      effectiveSemester = subject.semester;
    }
  }

  // Check overlap
  const overlap = await checkOverlap(
    data.dayOfWeek,
    data.startTime,
    data.endTime,
    effectiveSemester,
    data.section,
    data.subjectId,
    data.room,
    data.teacherId,
    id
  );
  if (overlap) {
    return {
      success: false,
      message: overlap.reason
    };
  }

  // Track previous semester if editing
  let previousSemester: string | null = null;
  if (id) {
    try {
      const existingRoutine = await db.query.weeklyRoutine.findFirst({
        where: eq(weeklyRoutine.id, id),
        with: { subject: true },
      });
      previousSemester = existingRoutine?.semester || existingRoutine?.subject?.semester || null;
    } catch {}
  }

  // For update we need the routineId to sync; for insert generate upfront
  const routineId = id ?? crypto.randomUUID();

  try {
    if (id) {
      await db.update(weeklyRoutine)
        .set({
          ...data,
          semester: effectiveSemester,
          updatedAt: new Date(),
        })
        .where(eq(weeklyRoutine.id, id));
    } else {
      await db.insert(weeklyRoutine).values({
        id: routineId,
        ...data,
        semester: effectiveSemester,
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
  if (data.subjectId) {
    try {
      await syncSessionsForRoutine({
        routineId,
        subjectId: data.subjectId,
        dayOfWeek: data.dayOfWeek,
        startTime: data.startTime,
        endTime: data.endTime,
        section: data.section,
      });
    } catch (e) {
      console.error("[routine] syncSessionsForRoutine failed", e);
    }

    // Routine Intelligence: mark routine modified for Telegram change detection
    try {
      if (effectiveSemester) {
        await markSemesterRoutineModified(effectiveSemester);
      }
      if (previousSemester && previousSemester !== effectiveSemester) {
        await markSemesterRoutineModified(previousSemester);
      }
    } catch (e) {
      console.error("[routine] markSemesterRoutineModified failed", e);
    }
  }

  revalidatePath("/routine");
  revalidatePath("/teacher/routine");
  revalidatePath("/admin/routine");
  revalidatePath("/admin/settings/telegram");
  revalidatePath("/");
  revalidatePath("/today");
  const redirectTo = user.role === "ADMIN" ? "/admin/routine" : user.role === "TEACHER" ? "/teacher/routine" : "/routine";
  redirect(redirectTo);
}

export async function deleteRoutine(id: string) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  // Capture routine for notification + session cleanup before delete
  let routineForNotify: { subjectId: string | null; dayOfWeek: number; semester?: string | null } | null = null;
  try {
    const found = await db.query.weeklyRoutine.findFirst({
      where: eq(weeklyRoutine.id, id),
      with: { subject: true },
    });
    if (found) {
      routineForNotify = {
        subjectId: found.subjectId,
        dayOfWeek: found.dayOfWeek,
        semester: found.semester || found.subject?.semester || null,
      };
    }
  } catch {}

  try {
    // Delete future classSessions for this routine (next 14 days window)
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
        with: {
          lectureLog: true,
        },
      });
      const unloggedSessions = sessions.filter((s) => !s.lectureLog).map((s) => s.id);
      if (unloggedSessions.length > 0) {
        await db.delete(classSessions).where(inArray(classSessions.id, unloggedSessions));
      }
    } catch (e) {
      console.error("[routine] failed to clean sessions on delete", e);
    }

    await db.delete(weeklyRoutine).where(eq(weeklyRoutine.id, id));

    if (routineForNotify && routineForNotify.subjectId) {
      const dayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][routineForNotify.dayOfWeek] ?? "";
      await notifyEnrolledStudents(
        routineForNotify.subjectId,
        `Class cancelled: {subject} on ${dayName} has been removed`,
        "/routine"
      );
    }

    // Mark routine modified for Telegram change detection
    try {
      if (routineForNotify?.semester) {
        await markSemesterRoutineModified(routineForNotify.semester);
      } else if (routineForNotify?.subjectId) {
        const subject = await db.query.subjects.findFirst({ where: eq(subjects.id, routineForNotify.subjectId) });
        if (subject?.semester) {
          await markSemesterRoutineModified(subject.semester);
        }
      }
    } catch (e) {
      console.error("[routine] markSemesterRoutineModified failed on delete", e);
    }

    revalidatePath("/routine");
    revalidatePath("/teacher/routine");
    revalidatePath("/admin/routine");
    revalidatePath("/admin/settings/telegram");
    revalidatePath("/today");
    revalidatePath("/");
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to delete routine:", error);
    return {
      success: false,
      error: "Failed to delete routine.",
      message: "Failed to delete routine.",
    };
  }
  const redirectTo = user.role === "ADMIN" ? "/admin/routine" : user.role === "TEACHER" ? "/teacher/routine" : "/routine";
  redirect(redirectTo);
}

export async function deleteRoutineAction(
  id: string,
  prevState?: ActionResult | null,
  formData?: FormData
): Promise<ActionResult> {
  return deleteRoutine(id);
}
