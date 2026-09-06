"use server";

import { db } from "@/db";
import { classSessions, lectureLogs, subjects, students, homework, enrollments, studentProfiles, weeklyRoutine, attendance, type AttendanceStatus } from "@/db/schema";
import { toRoman } from "@/lib/utils/roman";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { and, asc, eq } from "drizzle-orm";
import { parseAndNormalizeTime } from "@/lib/timezone";
import { requireAuth } from "@/lib/auth/session";
import { resolveCurrentStudent } from "@/lib/auth";
import type { SessionUser } from "@/lib/auth/session";

export type SessionActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    subjectId?: string[];
    sessionDate?: string[];
    startTime?: string[];
    endTime?: string[];
    topicsCovered?: string[];
    homework?: string[];
    homeworkDueDate?: string[];
    notes?: string[];
  };
};

const SessionSchema = z.object({
  subjectId: z.string().trim().min(1, "Subject is required"),
  sessionDate: z
    .string()
    .refine((val) => !isNaN(Date.parse(val)), { message: "Invalid session date" })
    .refine(
      (val) => {
        const d = new Date(val);
        const today = new Date();
        today.setHours(23, 59, 59, 999);
        const min = new Date("2000-01-01");
        return d <= today && d >= min;
      },
      { message: "Session date cannot be in the future and must be after 2000", path: ["sessionDate"] }
    ),
  startTime: z.string().trim().min(1, "Start time is required"),
  endTime: z.string().trim().min(1, "End time is required"),
  topicsCovered: z.string().trim().min(1, "Topics covered is required"),
  homework: z.string().optional(),
  homeworkDueDate: z.string().optional(),
  notes: z.string().trim().min(1, "Notes are required"),
  routineId: z.string().optional(),
}).refine(data => data.endTime > data.startTime, {
  message: "End time must be after start time",
  path: ["endTime"],
}).refine(
  (data) => {
    const hasHomework = data.homework && data.homework.trim().length > 0;
    const hasDueDate = data.homeworkDueDate && data.homeworkDueDate.trim().length > 0;
    if (hasHomework && !hasDueDate) return false;
    if (!hasHomework && hasDueDate) return false;
    return true;
  },
  {
    message: "Homework description and due date must both be provided, or both be empty",
    path: ["homework"],
  }
).refine(
  (data) => {
    if (data.homeworkDueDate && data.sessionDate) {
      return new Date(data.homeworkDueDate) >= new Date(data.sessionDate);
    }
    return true;
  },
  {
    message: "Homework submission date cannot be before the session date",
    path: ["homeworkDueDate"],
  }
);

/**
 * Build a readable homework title from the topics covered text.
 * Uses the first topic (split on common list separators), capped at 60 chars.
 */
function buildHomeworkTitle(topicsCovered: string): string {
  const firstTopic = topicsCovered
    .split(/[,;\n•]+/)
    .map((t) => t.trim())
    .find((t) => t.length > 0) || topicsCovered.trim();
  const capped = firstTopic.slice(0, 60);
  return `Homework — ${capped}${firstTopic.length > 60 ? "…" : ""}`;
}

/**
 * Subject-ownership enforcement shared by session-writing paths.
 * Returns an error message when the caller may not touch subjectId, else null.
 * ADMIN bypasses unconditionally (ADMIN sessions carry no teacherId by design).
 */
async function getSubjectAccessError(
  user: SessionUser,
  subjectId: string,
  subjectTeacherId: string | null
): Promise<string | null> {
  if (user.role === "ADMIN") {
    return null;
  }

  if (user.role === "TEACHER") {
    if (user.teacherId && subjectTeacherId === user.teacherId) {
      return null;
    }
    return "You can only log sessions for subjects you teach.";
  }

  if (user.role === "CR") {
    const student = await resolveCurrentStudent();
    if (!student) {
      return "No student profile is linked to your account.";
    }
    const enrolled = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(and(eq(enrollments.studentId, student.id), eq(enrollments.subjectId, subjectId)))
      .limit(1);
    if (enrolled.length === 0) {
      return "You are not enrolled in this subject.";
    }
    return null;
  }

  return "You do not have permission to access this subject.";
}

export async function createSession(prevState: SessionActionState, formData: FormData): Promise<SessionActionState> {
  const user = await requireAuth(["CR", "TEACHER", "ADMIN"]);

  const rawStartTime = formData.get("startTime")?.toString() || "";
  const rawEndTime = formData.get("endTime")?.toString() || "";
  const normalizedStartTime = parseAndNormalizeTime(rawStartTime) || rawStartTime;
  const normalizedEndTime = parseAndNormalizeTime(rawEndTime) || rawEndTime;

  const validatedFields = SessionSchema.safeParse({
    subjectId: formData.get("subjectId"),
    sessionDate: formData.get("sessionDate"),
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
    routineId: formData.get("routineId") || undefined,
    topicsCovered: formData.get("topicsCovered"),
    homework: formData.get("homework"),
    homeworkDueDate: formData.get("homeworkDueDate"),
    notes: formData.get("notes"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { subjectId, sessionDate, startTime, endTime, routineId, topicsCovered, homework: homeworkDesc, homeworkDueDate, notes } = validatedFields.data;

  // Server-side Integrity Checks
  const sessionId = crypto.randomUUID();
  const logId = crypto.randomUUID();

  try {
    // 1. Confirm subject exists
    const subjectRows = await db.select().from(subjects).where(eq(subjects.id, subjectId));
    if (subjectRows.length === 0) {
      return { success: false, message: "The selected subject does not exist." };
    }

    // 1b. Enforce subject ownership before any INSERT (audit: role != ownership)
    const accessError = await getSubjectAccessError(user, subjectId, subjectRows[0].teacherId);
    if (accessError) {
      return { success: false, message: accessError };
    }

    // 1c. If TEACHER, enforce that they have a scheduled class on that day of week
    if (user.role === "TEACHER") {
      const sessionDay = new Date(sessionDate).getDay();
      const matchingRoutine = await db.query.weeklyRoutine.findFirst({
        where: and(
          eq(weeklyRoutine.subjectId, subjectId),
          eq(weeklyRoutine.dayOfWeek, sessionDay)
        ),
      });
      if (!matchingRoutine) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        return {
          success: false,
          message: `You do not have a scheduled class for this subject on ${days[sessionDay]}.`,
        };
      }
    }

    // Determine if homework is provided
    const hasHomework = homeworkDesc && homeworkDesc.trim().length > 0;

    // Parse lecture attendance records
    type AttendanceEntry = { studentId: string; status: AttendanceStatus };
    let attendanceList: AttendanceEntry[] = [];
    const rawAttendance = formData.get("attendanceRecords")?.toString();

    if (rawAttendance) {
      try {
        const parsed = JSON.parse(rawAttendance);
        if (Array.isArray(parsed)) {
          attendanceList = parsed.filter(
            (item): item is AttendanceEntry =>
              Boolean(item) &&
              typeof item.studentId === "string" &&
              ["present", "absent", "late", "excused"].includes(item.status)
          );
        }
      } catch {
        // ignore malformed JSON
      }
    }

    // Auto-populate roster with default 'present' if no explicit records were submitted
    if (attendanceList.length === 0) {
      const enrolled = await db
        .select({ studentId: enrollments.studentId })
        .from(enrollments)
        .where(eq(enrollments.subjectId, subjectId));

      if (enrolled.length > 0) {
        attendanceList = enrolled.map((e) => ({
          studentId: e.studentId,
          status: "present" as AttendanceStatus,
        }));
      } else {
        const allStudents = await db.select({ id: students.id }).from(students);
        attendanceList = allStudents.map((s) => ({
          studentId: s.id,
          status: "present" as AttendanceStatus,
        }));
      }
    }

    // Execution: Database Transaction
    await db.transaction(async (tx) => {
      // 1. Insert Session
      await tx.insert(classSessions).values({
        id: sessionId,
        subjectId,
        routineId,
        sessionDate: new Date(sessionDate),
        startTime,
        endTime,
      });

      // 2. Insert Lecture Log
      await tx.insert(lectureLogs).values({
        id: logId,
        classSessionId: sessionId,
        topicsCovered,
        homework: homeworkDesc || "",
        notes,
      });

      // 3. Batch Insert Lecture Attendance Records
      if (attendanceList.length > 0) {
        await tx.insert(attendance).values(
          attendanceList.map((att) => ({
            id: crypto.randomUUID(),
            classSessionId: sessionId,
            studentId: att.studentId,
            status: att.status,
          }))
        );
      }

      // 4. Insert Homework Assignment (only if homework is provided)
      if (hasHomework && homeworkDueDate) {
        await tx.insert(homework).values({
          id: crypto.randomUUID(),
          subjectId,
          title: buildHomeworkTitle(topicsCovered),
          description: homeworkDesc,
          assignedDate: new Date(sessionDate),
          dueDate: new Date(homeworkDueDate),
          sessionId: sessionId,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    });

  } catch (error: unknown) {
    if ((error as { digest?: string })?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Transaction failed:", error);
    if (error instanceof Error && error.message.includes("UNIQUE constraint failed")) {
      return { success: false, message: "A session for this subject has already been logged for this date." };
    }
    return { success: false, message: "Something went wrong. Please try again." };
  }

  // Cross-role cache revalidation across Student, Teacher, CR, and Admin portals
  revalidatePath("/sessions");
  revalidatePath("/lecture-logs");
  revalidatePath("/teacher/lecture-logs");
  revalidatePath("/teacher/attendance");
  revalidatePath("/teacher/attendance/roster");
  revalidatePath("/attendance");
  revalidatePath("/attendance/monthly");
  revalidatePath("/cr/attendance/monthly");
  revalidatePath("/admin/attendance/monthly");
  revalidatePath("/admin/attendance");
  revalidatePath("/cr");
  revalidatePath("/");
  revalidatePath("/today");
  redirect(`/sessions/${sessionId}`);
}
