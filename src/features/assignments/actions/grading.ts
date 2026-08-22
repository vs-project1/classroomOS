"use server";

import { db } from "@/db";
import { assignmentSubmissions, homework, subjects } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { eq, and, isNull } from "drizzle-orm";
import { notify } from "@/lib/notifications";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface GradingActionResult {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

const gradingSchema = z.object({
  submissionId: z.string().min(1, "Submission ID is required"),
  score: z
    .number()
    .int("Score must be a whole number")
    .min(0, "Score must be at least 0")
    .max(100, "Score must be at most 100"),
  feedback: z.string().max(2000, "Feedback is too long").optional(),
});

export async function gradeSubmissionAction(
  prevState: any,
  formData: FormData
): Promise<GradingActionResult> {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  try {
    if (!user.teacherId && user.role !== "ADMIN") {
      return { success: false, message: "Your account is not linked to a teacher profile." };
    }

    const rawData = {
      submissionId: formData.get("submissionId")?.toString() || "",
      score: formData.get("score") ? Number(formData.get("score")) : 0,
      feedback: formData.get("feedback")?.toString() || undefined,
    };

    const parsed = gradingSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { submissionId, score, feedback } = parsed.data;

    const submission = await db.query.assignmentSubmissions.findFirst({
      where: eq(assignmentSubmissions.id, submissionId),
    });
    if (!submission) {
      return { success: false, message: "Submission not found." };
    }

    const hw = await db.query.homework.findFirst({
      where: eq(homework.id, submission.homeworkId),
    });
    if (!hw) {
      return { success: false, message: "Homework not found." };
    }

    if (user.role !== "ADMIN") {
      const subject = await db.query.subjects.findFirst({
        where: and(
          eq(subjects.id, hw.subjectId),
          eq(subjects.teacherId, user.teacherId!)
        ),
      });
      if (!subject) {
        return { success: false, message: "You are not authorized to grade this submission." };
      }
    }

    const graded = await db
      .update(assignmentSubmissions)
      .set({
        status: "graded",
        score,
        feedback: feedback || null,
        gradedBy: user.teacherId || user.id,
        gradedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(assignmentSubmissions.id, submissionId),
          isNull(assignmentSubmissions.gradedAt)
        )
      )
      .returning({ id: assignmentSubmissions.id });

    if (graded.length === 0) {
      return { success: false, message: "This submission has already been graded by someone else." };
    }

    await notify({
      userId: submission.studentId,
      type: "assignment",
      title: `Your submission for "${hw.title}" has been graded: ${score}/100`,
      link: `/homework/submissions/${submissionId}`,
    });

    revalidatePath("/teacher/grading");
    return { success: true, message: "Submission graded successfully." };
  } catch (error: any) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to grade submission:", error);
    return { success: false, message: error.message || "Failed to grade submission." };
  }
}
