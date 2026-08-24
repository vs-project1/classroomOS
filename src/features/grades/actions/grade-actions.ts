"use server";

import { db } from "@/db";
import { exams, examResults, students, subjectGradeWeights, subjects } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import crypto from "crypto";
import { weightUpsertSchema, examResultSaveSchema } from "@/lib/grading/scale";

export type GradeActionResult =
  | { ok: true }
  | { ok: false; error: string };

/**
 * Role + ownership gate shared by gradebook mutations.
 * ADMIN passes unconditionally; TEACHER must own the subject
 * (subjects.teacherId resolved against the session's teacher record,
 * matched via users.email — same identity model as session.ts).
 * Must be called OUTSIDE try/catch so NEXT_REDIRECT digests propagate.
 */
async function requireSubjectOwner(subjectId: string): Promise<GradeActionResult | null> {
  const user = await requireAuth(["ADMIN", "TEACHER"]);

  if (user.role === "ADMIN") return null;

  if (!user.teacherId) {
    return { ok: false, error: "Your account is not linked to a teacher profile." };
  }

  const subject = await db.query.subjects.findFirst({
    where: eq(subjects.id, subjectId),
    columns: { id: true, teacherId: true },
  });
  if (!subject) {
    return { ok: false, error: "Subject not found." };
  }
  if (subject.teacherId !== user.teacherId) {
    return { ok: false, error: "You can only manage grades for subjects you teach." };
  }
  return null;
}

function revalidateGradePaths(): void {
  revalidatePath("/admin/gradebook");
  revalidatePath("/teacher");
  revalidatePath("/my-grades");
}

/**
 * Replace the category weights for one subject.
 * Weights are validated to sum to exactly 100 (see scale.ts).
 */
export async function upsertWeights(
  subjectId: string,
  weights: Array<{ category: string; weightPct: number }>
): Promise<GradeActionResult> {
  // Auth FIRST and outside try/catch (redirect digests must propagate).
  const denial = await requireSubjectOwner(subjectId);
  if (denial) return denial;

  const parsed = weightUpsertSchema.safeParse({ weights });
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid weights." };
  }

  try {
    await db.transaction(async (tx) => {
      // Full replace keeps the sum-to-100 invariant trivially consistent:
      // stale categories can't linger alongside the validated set.
      await tx
        .delete(subjectGradeWeights)
        .where(eq(subjectGradeWeights.subjectId, subjectId));

      await tx.insert(subjectGradeWeights).values(
        parsed.data.weights.map((w) => ({
          id: crypto.randomUUID(),
          subjectId,
          category: w.category,
          weightPct: w.weightPct,
        }))
      );
    });

    revalidateGradePaths();
    return { ok: true };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Failed to save grade weights:", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}

/**
 * Insert or update one student's result for one exam.
 * absent XOR marks-non-null is enforced by schema; marks are additionally
 * bounds-checked against the exam's totalMarks here (the DB CHECK only
 * enforces >= 0).
 */
export async function saveExamResult(
  examId: string,
  studentId: string,
  data: { isAbsent: boolean; obtainedMarks: number | null; remarks?: string }
): Promise<GradeActionResult> {
  // Resolve the exam first so we know which subject to gate on.
  let exam;
  try {
    exam = await db.query.exams.findFirst({
      where: eq(exams.id, examId),
      columns: { id: true, subjectId: true, totalMarks: true },
    });
  } catch (error) {
    console.error("Failed to load exam:", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
  if (!exam) {
    return { ok: false, error: "Exam not found." };
  }

  const denial = await requireSubjectOwner(exam.subjectId);
  if (denial) return denial;

  const parsed = examResultSaveSchema.safeParse(data);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return { ok: false, error: first?.message ?? "Invalid exam result." };
  }
  const { isAbsent, obtainedMarks, remarks } = parsed.data;

  if (
    !isAbsent &&
    obtainedMarks !== null &&
    obtainedMarks > exam.totalMarks
  ) {
    return { ok: false, error: `Marks cannot exceed the exam total of ${exam.totalMarks}.` };
  }

  try {
    const student = await db.query.students.findFirst({
      where: eq(students.id, studentId),
      columns: { id: true },
    });
    if (!student) {
      return { ok: false, error: "Student not found." };
    }

    await db.transaction(async (tx) => {
      await tx
        .insert(examResults)
        .values({
          id: crypto.randomUUID(),
          examId,
          studentId,
          obtainedMarks: isAbsent ? null : obtainedMarks,
          isAbsent,
          remarks: remarks ?? null,
        })
        .onConflictDoUpdate({
          target: [examResults.examId, examResults.studentId],
          set: {
            obtainedMarks: isAbsent ? null : obtainedMarks,
            isAbsent,
            remarks: remarks ?? null,
            updatedAt: new Date(),
          },
        });
    });

    revalidateGradePaths();
    return { ok: true };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "digest" in error &&
      String(error.digest).startsWith("NEXT_REDIRECT")
    ) {
      throw error;
    }
    console.error("Failed to save exam result:", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
