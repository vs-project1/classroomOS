"use server";

import { db } from "@/db";
import {
  dailyAttendance,
  dailySessions,
  attendanceCorrectionRequests,
  students,
  studentProfiles,
  subjects,
  teachers,
  users,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";
import { toRoman } from "@/lib/utils/roman";
import { eq, and, or } from "drizzle-orm";
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

  // Verify attendance record against dailyAttendance
  const targetAttendance = await db.query.dailyAttendance.findFirst({
    where: and(
      eq(dailyAttendance.id, attendanceId),
      eq(dailyAttendance.studentId, studentId)
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

    // Notify teachers who teach subjects in the student's semester
    try {
      const session = await db.query.dailySessions.findFirst({
        where: eq(dailySessions.id, targetAttendance.dailySessionId),
      });

      if (session) {
        let semRoman = "I";
        const numMatch = session.semester.match(/\d+/);
        if (numMatch) {
          semRoman = toRoman(parseInt(numMatch[0], 10));
        } else {
          const upper = session.semester.trim().toUpperCase();
          if (/^(VIII|VII|VI|IV|V|III|II|I)$/.test(upper)) {
            semRoman = upper;
          }
        }

        const teacherUsers = await db
          .selectDistinct({ userId: users.id })
          .from(subjects)
          .innerJoin(teachers, eq(teachers.id, subjects.teacherId))
          .innerJoin(users, or(eq(users.id, teachers.userId), eq(users.email, teachers.email)))
          .where(
            or(
              eq(subjects.semester, semRoman),
              eq(subjects.semester, session.semester)
            )
          );

        for (const t of teacherUsers) {
          if (t.userId) {
            await notify({
              userId: t.userId,
              type: "attendance",
              title: "New attendance correction request submitted",
              link: "/teacher/attendance",
            });
          }
        }
      }
    } catch (notifyError) {
      console.error("Failed to send dispute submission notification:", notifyError);
    }

    revalidatePath("/attendance");
    revalidatePath("/teacher/attendance");
    revalidatePath("/admin/attendance");
    revalidatePath("/missed");
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
