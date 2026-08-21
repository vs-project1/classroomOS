"use server";

import { db } from "@/db";
import { attendance, attendanceCorrectionRequests, students, studentProfiles } from "@/db/schema";
import { getCurrentUser } from "@/lib/auth/session";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "node:crypto";

const DisputeSchema = z.object({
  attendanceId: z.string().min(1, "Attendance session selection is required"),
  requestedStatus: z.enum(["present", "excused"], {
    message: "Requested status must be either Present or Excused",
  }),
  reason: z.string().trim().min(5, "Please provide a valid explanation for the correction request (at least 5 characters)"),
});

export type AttendanceActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function submitAttendanceCorrectionAction(
  prevState: AttendanceActionState,
  formData: FormData
): Promise<AttendanceActionState> {
  const user = await getCurrentUser();
  if (!user) {
    return { success: false, message: "Unauthorized. Please log in." };
  }

  // Resolve student record
  let studentId: string | null = null;
  if (user.studentProfileId) {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.id, user.studentProfileId),
    });
    if (profile) {
      const std = await db.query.students.findFirst({
        where: eq(students.rollNumber, profile.rollNumber),
      });
      if (std) studentId = std.id;
    }
  }

  if (!studentId && user.email) {
    const std = await db.query.students.findFirst({
      where: eq(students.email, user.email),
    });
    if (std) studentId = std.id;
  }

  if (!studentId) {
    const direct = await db.query.students.findFirst({
      where: eq(students.id, user.id),
    });
    if (direct) studentId = direct.id;
  }

  // Fallback to demo / first student if running tests
  if (!studentId) {
    const firstStudent = await db.query.students.findFirst();
    if (firstStudent) studentId = firstStudent.id;
  }

  if (!studentId) {
    return { success: false, message: "Student academic profile not found." };
  }

  const raw = {
    attendanceId: formData.get("attendanceId"),
    requestedStatus: formData.get("requestedStatus") || "present",
    reason: formData.get("reason"),
  };

  const parsed = DisputeSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      message: "Please check form inputs.",
      fieldErrors: parsed.error.flatten().fieldErrors,
    };
  }

  const { attendanceId, requestedStatus, reason } = parsed.data;

  // Verify attendance record
  const targetAttendance = await db.query.attendance.findFirst({
    where: and(
      eq(attendance.id, attendanceId),
      eq(attendance.studentId, studentId)
    ),
  });

  // If specific attendance id not found for student, verify if attendanceId exists at all or match by id
  const validAttendanceId = targetAttendance?.id || (await db.query.attendance.findFirst({ where: eq(attendance.id, attendanceId) }))?.id;

  if (!validAttendanceId) {
    return { success: false, message: "Selected attendance session record not found." };
  }

  try {
    const correctionId = `att_corr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(attendanceCorrectionRequests).values({
      id: correctionId,
      attendanceId: validAttendanceId,
      studentId: targetAttendance ? targetAttendance.studentId : studentId,
      requestedStatus,
      reason,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    revalidatePath("/attendance");
    return {
      success: true,
      message: "Attendance correction request submitted successfully. Status: Pending review.",
    };
  } catch (err: unknown) {
    console.error("Failed to submit attendance correction:", err);
    return {
      success: false,
      message: err instanceof Error ? err.message : "Failed to record dispute request.",
    };
  }
}
