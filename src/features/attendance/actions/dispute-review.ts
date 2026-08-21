"use server";

import { db } from "@/db";
import { attendance, attendanceCorrectionRequests } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/session";
import { z } from "zod";

const ReviewSchema = z.object({
  disputeId: z.string().min(1),
  action: z.enum(["approve", "reject"]),
  reviewNote: z.string().optional(),
});

export async function reviewDisputeAction(
  formData: FormData
): Promise<{ success: boolean; message: string }> {
  await requireAuth(["ADMIN"]);

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

    const now = new Date();

    if (action === "approve") {
      await db
        .update(attendance)
        .set({ status: dispute.requestedStatus })
        .where(eq(attendance.id, dispute.attendanceId));
    }

    await db
      .update(attendanceCorrectionRequests)
      .set({
        status: action === "approve" ? "approved" : "rejected",
        reviewNote: reviewNote || null,
        reviewedAt: now,
        updatedAt: now,
      })
      .where(eq(attendanceCorrectionRequests.id, disputeId));

    revalidatePath("/admin/attendance");
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
