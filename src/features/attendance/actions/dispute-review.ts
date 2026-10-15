"use server";

import { db } from "@/db";
import {
  dailyAttendance,
  dailySessions,
  attendanceCorrectionRequests,
  students,
  subjects,
  users,
  weeklyRoutine,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";
import { toSemesterNumber } from "@/lib/semester";
import { z } from "zod";

const ReviewSchema = z.object({
  disputeId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().optional(),
});

export async function reviewDisputeAction(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  const user = await requireAuth(["ADMIN", "TEACHER"]);

  const validated = ReviewSchema.safeParse({
    disputeId: formData.get("disputeId"),
    action: formData.get("action"),
    reviewNote: formData.get("reviewNote") || undefined,
  });

  if (!validated.success) {
    return { success: false, message: "Invalid input." };
  }

  const { disputeId, action, reviewNote } = validated.data;

  try {
    const [row] = await db
      .select({
        dispute: attendanceCorrectionRequests,
        dailyAttendance: dailyAttendance,
        dailySession: dailySessions,
      })
      .from(attendanceCorrectionRequests)
      .innerJoin(dailyAttendance, eq(attendanceCorrectionRequests.attendanceId, dailyAttendance.id))
      .innerJoin(dailySessions, eq(dailyAttendance.dailySessionId, dailySessions.id))
      .where(eq(attendanceCorrectionRequests.id, disputeId))
      .limit(1);

    if (!row) {
      return { success: false, message: "Dispute not found." };
    }

    const { dispute, dailySession } = row;

    if (dispute.status !== "pending") {
      return { success: false, message: "This dispute has already been reviewed." };
    }

    // Ownership check: non-ADMIN teachers may only review disputes for
    // sessions belonging to semesters they teach.
    let reviewerTeacherId: string | null = null;
    if (user.role !== "ADMIN") {
      if (!user.teacherId) {
        return { success: false, message: "Your account is not linked to a teacher profile." };
      }
      reviewerTeacherId = user.teacherId;

      const teacherSubjects = await db
        .select({ semester: subjects.semester })
        .from(subjects)
        .where(eq(subjects.teacherId, user.teacherId));

      const routineSubjects = await db
        .select({ semester: subjects.semester })
        .from(weeklyRoutine)
        .innerJoin(subjects, eq(weeklyRoutine.subjectId, subjects.id))
        .where(eq(weeklyRoutine.teacherId, user.teacherId));

      const allTeacherSemesters = [...teacherSubjects, ...routineSubjects].map((s) => s.semester);

      const isTeacherOfSemester = allTeacherSemesters.some(
        (subSem) => toSemesterNumber(subSem) === toSemesterNumber(dailySession.semester)
      );

      if (!isTeacherOfSemester) {
        return { success: false, message: "You are not authorized to review this dispute." };
      }
    } else {
      reviewerTeacherId = user.teacherId ?? null;
    }

    const now = new Date();
    const nextStatus = action === "approve" ? "approved" : "rejected";

    // Conditional UPDATE guards against a TOCTOU race: if the dispute was
    // already reviewed between the pre-check above and this statement, the
    // WHERE clause matches nothing and we report "already reviewed".
    // Atomic transaction: dispute status + daily attendance correction together
    const updated = await db.transaction(async (tx) => {
      const [updatedRequest] = await tx
        .update(attendanceCorrectionRequests)
        .set({
          status: nextStatus,
          reviewNote: reviewNote || null,
          reviewedBy: reviewerTeacherId,
          reviewedAt: now,
          updatedAt: now,
        })
        .where(
          and(
            eq(attendanceCorrectionRequests.id, disputeId),
            eq(attendanceCorrectionRequests.status, "pending")
          )
        )
        .returning({ id: attendanceCorrectionRequests.id });

      if (!updatedRequest) return null;

      if (action === "approve") {
        await tx
          .update(dailyAttendance)
          .set({ status: dispute.requestedStatus })
          .where(eq(dailyAttendance.id, dispute.attendanceId));
      }
      return updatedRequest;
    });

    if (!updated) {
      return { success: false, message: "This dispute has already been reviewed." };
    }

    // Notify the requesting student of the outcome using unified students.userId
    try {
      const [recipient] = await db
        .select({ userId: students.userId })
        .from(students)
        .where(eq(students.id, dispute.studentId))
        .limit(1);

      if (recipient?.userId) {
        await notify({
          userId: recipient.userId,
          type: "attendance",
          title:
            action === "approve"
              ? `Your attendance correction request was approved${reviewNote ? `: ${reviewNote}` : "."}`
              : `Your attendance correction request was rejected${reviewNote ? `: ${reviewNote}` : "."}`,
          link: "/attendance",
        });
      }
    } catch (notifyError) {
      console.error("Failed to send dispute outcome notification:", notifyError);
    }

    revalidatePath("/teacher/attendance");
    revalidatePath("/teacher/attendance/roster");
    revalidatePath("/attendance");
    revalidatePath("/attendance/monthly");
    revalidatePath("/cr/attendance");
    revalidatePath("/admin/attendance");
    revalidatePath("/admin/attendance/monthly");

    return {
      success: true,
      message: `Dispute ${action === "approve" ? "approved" : "rejected"}.`,
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Failed to review dispute:", error);
    return { success: false, message: "Something went wrong." };
  }
}
