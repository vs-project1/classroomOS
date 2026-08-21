"use server";

import { db } from "@/db";
import { classSessions, lectureLogs, attendance, subjects, students, homework } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { parseAndNormalizeTime } from "@/lib/time";

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
  homework: z.string().trim().min(1, "Homework description is required"),
  homeworkDueDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Invalid homework submission date",
  }),
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
}).refine(data => new Date(data.homeworkDueDate) >= new Date(data.sessionDate), {
  message: "Homework submission date cannot be before the session date",
  path: ["homeworkDueDate"],
});

export async function createSession(prevState: SessionActionState, formData: FormData): Promise<SessionActionState> {
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

    // 2. Fetch all current students
    const allStudents = await db.select().from(students);
    const dbStudentIds = new Set(allStudents.map(s => s.id));
    
    // 3. Confirm submitted students match exactly
    const submittedStudentIds = new Set(submittedAttendance.map(a => a.studentId));

    if (submittedStudentIds.size !== submittedAttendance.length) {
      return { success: false, message: "Duplicate student entries found in attendance." };
    }

    for (const submittedId of submittedStudentIds) {
      if (!dbStudentIds.has(submittedId)) {
        return { success: false, message: `Student ID ${submittedId} does not exist.` };
      }
    }

    if (submittedStudentIds.size !== dbStudentIds.size) {
      return { success: false, message: "Missing or extra students in attendance submission." };
    }

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
        homework: homeworkDesc,
        notes,
      });

      // Insert Homework Assignment
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
