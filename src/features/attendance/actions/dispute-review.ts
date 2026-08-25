"use server";

import { db } from "@/db";
import {
  attendance,
  attendanceCorrectionRequests,
  classSessions,
  students,
  subjects,
  users,
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { notify } from "@/lib/notifications";
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
    const [dispute] = await db
      .select()
      .from(attendanceCorrectionRequests)
      .where(eq(attendanceCorrectionRequests.id, disputeId))
      .limit(1);

    if (!dispute) {
      return { success: false, message: "Dispute not found." };
    }

    if (dispute.status !== "pending") {
      return { success: false, message: "This dispute has already been reviewed." };
    }

    // Ownership check: teachers may only review disputes for sessions
    // belonging to subjects they teach.
    let reviewerTeacherId: string | null = null;
    if (user.role !== "ADMIN") {
      if (!user.teacherId) {
        return { success: false, message: "Your account is not linked to a teacher profile." };
      }
      reviewerTeacherId = user.teacherId;

      const [row] = await db
        .select({ subjectTeacherId: subjects.teacherId })
        .from(classSessions)
        .innerJoin(subjects, eq(subjects.id, classSessions.subjectId))
        .innerJoin(attendance, eq(attendance.classSessionId, classSessions.id))
        .where(eq(attendance.id, dispute.attendanceId))
        .limit(1);

      if (!row || row.subjectTeacherId !== user.teacherId) {
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
    // Atomic transaction: dispute status + attendance correction together
    const updated = await db.transaction(async (tx) => {
      const [row] = await tx
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

      if (!row) return null;

      if (action === "approve") {
        await tx
          .update(attendance)
          .set({ status: dispute.requestedStatus })
          .where(eq(attendance.id, dispute.attendanceId));
      }
      return row;
    });

    if (!updated) {
      return { success: false, message: "This dispute has already been reviewed." };
    }

    // Notify the requesting student of the outcome. notifications.userId
    // references users.id while the request stores a legacy students-table id
    // without a userId column — bridge via students.email = users.email.
    try {
      const [recipient] = await db
        .select({ userId: users.id })
        .from(students)
        .innerJoin(users, eq(users.email, students.email))
        .where(eq(students.id, dispute.studentId))
        .limit(1);

      if (recipient) {
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

    revalidatePath("/admin/attendance");
    revalidatePath("/attendance");
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
