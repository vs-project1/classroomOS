"use server";

import { db } from "@/db";
import {
  attendance,
  attendanceCorrectionRequests,
  classSessions,
  students,
  studentProfiles,
  subjects,
  teachers,
  users,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";
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
  const user = await requireAuth(["STUDENT", "CR"]);

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

  if (!targetAttendance || targetAttendance.studentId !== studentId) {
    return { success: false, message: "Attendance record not found" };
  }

  try {
    const correctionId = `att_corr_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;
    await db.insert(attendanceCorrectionRequests).values({
      id: correctionId,
      attendanceId: targetAttendance.id,
      studentId: targetAttendance.studentId,
      requestedStatus,
      reason,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Notify the subject teacher so the request isn't invisible.
    // notifications.userId references users.id; bridge legacy ids via email
    // (students/teachers tables have no userId column).
    try {
      const [recipient] = await db
        .select({ userId: users.id })
        .from(attendance)
        .innerJoin(classSessions, eq(classSessions.id, attendance.classSessionId))
        .innerJoin(subjects, eq(subjects.id, classSessions.subjectId))
        .innerJoin(teachers, eq(teachers.id, subjects.teacherId))
        .innerJoin(users, eq(users.email, teachers.email))
        .where(eq(attendance.id, targetAttendance.id))
        .limit(1);

      if (recipient) {
        await notify({
          userId: recipient.userId,
          type: "attendance",
          title: "New attendance correction request submitted",
          link: "/attendance",
        });
      }
    } catch (notifyError) {
      console.error("Failed to send dispute submission notification:", notifyError);
    }

    revalidatePath("/attendance");
    return {
      success: true,
      message: "Attendance correction request submitted successfully. Status: Pending review.",
    };
  } catch (err: unknown) {
    console.error("Failed to submit attendance correction:", err);
    return {
      success: false,
      message: "Failed to record dispute request.",
    };
  }
}
