"use server";

import { db } from "@/db";
import { classSessions, lectureLogs, attendance, subjects, students, homework, enrollments } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { parseAndNormalizeTime } from "@/lib/time";
import { requireAuth } from "@/lib/auth/session";

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
    attendance?: string[];
  };
};

const AttendanceSchema = z.array(
  z.object({
    studentId: z.string().min(1, "Student ID is required"),
    status: z.enum(["present", "absent", "late", "excused"]),
  })
).min(1, "Attendance must have at least one student");

const SessionSchema = z.object({
  subjectId: z.string().trim().min(1, "Subject is required"),
  sessionDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid session date",
  }),
  startTime: z.string().trim().min(1, "Start time is required"),
  endTime: z.string().trim().min(1, "End time is required"),
  topicsCovered: z.string().trim().min(1, "Topics covered is required"),
  homework: z.string().optional(),
  homeworkDueDate: z.string().optional(),
  notes: z.string().trim().min(1, "Notes are required"),
  routineId: z.string().optional(),
  attendanceJson: z.string().refine(
    (val) => {
      try {
        JSON.parse(val);
        return true;
      } catch {
        return false;
      }
    },
    { message: "Invalid JSON format for attendance" }
  ),
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

export async function getStudentsBySubject(subjectId: string) {
  const enrolledStudents = await db
    .select({
      id: students.id,
      name: students.name,
      rollNumber: students.rollNumber,
    })
    .from(enrollments)
    .innerJoin(students, eq(enrollments.studentId, students.id))
    .where(eq(enrollments.subjectId, subjectId));

  return enrolledStudents;
}

export async function createSession(prevState: SessionActionState, formData: FormData): Promise<SessionActionState> {
  await requireAuth(["CR", "TEACHER", "ADMIN"]);

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
    attendanceJson: formData.get("attendanceJson"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { subjectId, sessionDate, startTime, endTime, routineId, topicsCovered, homework: homeworkDesc, homeworkDueDate, notes, attendanceJson } = validatedFields.data;

  // Validate the parsed JSON attendance array
  let parsedAttendance: unknown;
  try {
    parsedAttendance = JSON.parse(attendanceJson);
  } catch {
    return { success: false, message: "Attendance data is corrupted." };
  }

  const validatedAttendance = AttendanceSchema.safeParse(parsedAttendance);
  if (!validatedAttendance.success) {
    return { success: false, message: "Attendance data is invalid." };
  }

  const submittedAttendance = validatedAttendance.data;

  // Server-side Integrity Checks
  const sessionId = crypto.randomUUID();
  const logId = crypto.randomUUID();

  try {
    // 1. Confirm subject exists
    const subjectExists = await db.select().from(subjects).where(eq(subjects.id, subjectId));
    if (subjectExists.length === 0) {
      return { success: false, message: "The selected subject does not exist." };
    }

    // 2. Fetch enrolled students for this subject
    const enrolledStudents = await db
      .select({ studentId: enrollments.studentId })
      .from(enrollments)
      .where(eq(enrollments.subjectId, subjectId));
    const enrolledStudentIds = new Set(enrolledStudents.map(s => s.studentId));
    
    // 3. Confirm submitted students match exactly
    const submittedStudentIds = new Set(submittedAttendance.map(a => a.studentId));

    if (submittedStudentIds.size !== submittedAttendance.length) {
      return { success: false, message: "Duplicate student entries found in attendance." };
    }

    for (const submittedId of submittedStudentIds) {
      if (!enrolledStudentIds.has(submittedId)) {
        return { success: false, message: `Student ID ${submittedId} is not enrolled in this subject.` };
      }
    }

    if (submittedStudentIds.size !== enrolledStudentIds.size) {
      return { success: false, message: "Missing or extra students in attendance submission." };
    }

    // Determine if homework is provided
    const hasHomework = homeworkDesc && homeworkDesc.trim().length > 0;

    // Execution: Database Transaction
    await db.transaction(async (tx) => {
      // Insert Session
      await tx.insert(classSessions).values({
        id: sessionId,
        subjectId,
        routineId,
        sessionDate: new Date(sessionDate),
        startTime,
        endTime,
      });

      // Insert Lecture Log
      await tx.insert(lectureLogs).values({
        id: logId,
        classSessionId: sessionId,
        topicsCovered,
        homework: homeworkDesc || "",
        notes,
      });

      // Insert Homework Assignment (only if homework is provided)
      if (hasHomework && homeworkDueDate) {
        await tx.insert(homework).values({
          id: crypto.randomUUID(),
          subjectId,
          title: `Homework: ${topicsCovered.slice(0, 30)}${topicsCovered.length > 30 ? "..." : ""}`,
          description: homeworkDesc,
          assignedDate: new Date(sessionDate),
          dueDate: new Date(homeworkDueDate),
          sessionId: sessionId,
          status: "active",
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }

      // Insert Attendance Records
      const attendanceValues = submittedAttendance.map(a => ({
        id: crypto.randomUUID(),
        classSessionId: sessionId,
        studentId: a.studentId,
        status: a.status,
      }));

      await tx.insert(attendance).values(attendanceValues);
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

  revalidatePath("/sessions");
  revalidatePath("/");
  redirect(`/sessions/${sessionId}`);
}
