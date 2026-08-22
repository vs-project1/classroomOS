"use server";

import { db } from "@/db";
import { courseChapters, courseUnits, subjects } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAuth } from "@/lib/auth/session";

const ChapterIdSchema = z.string().trim().min(1, "Chapter ID is required");

export type ToggleChapterCoveredResult =
  | { ok: true }
  | { ok: false; error: string };

export async function toggleChapterCoveredAction(
  formData: FormData
): Promise<ToggleChapterCoveredResult> {
  // Auth gate FIRST and OUTSIDE try/catch so redirect() NEXT_REDIRECT
  // digests propagate to Next.js untouched (see session-actions.ts).
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  const validatedFields = ChapterIdSchema.safeParse(formData.get("chapterId"));
  if (!validatedFields.success) {
    return { ok: false, error: "Chapter ID is required." };
  }
  const chapterId = validatedFields.data;

  try {
    const rows = await db
      .select({
        chapterId: courseChapters.id,
        coveredAt: courseChapters.coveredAt,
        subjectSlug: subjects.slug,
        subjectTeacherId: subjects.teacherId,
      })
      .from(courseChapters)
      .innerJoin(courseUnits, eq(courseChapters.unitId, courseUnits.id))
      .innerJoin(subjects, eq(courseUnits.subjectId, subjects.id))
      .where(eq(courseChapters.id, chapterId))
      .limit(1);

    const row = rows[0];
    if (!row) {
      return { ok: false, error: "Chapter not found." };
    }

    // Ownership check (audit: role != ownership). ADMIN bypasses
    // unconditionally; ADMIN sessions carry no teacherId by design.
    if (user.role === "TEACHER") {
      if (!user.teacherId || row.subjectTeacherId !== user.teacherId) {
        return { ok: false, error: "You can only update chapters for subjects you teach." };
      }
    }

    const now = new Date();
    await db
      .update(courseChapters)
      .set({
        coveredAt: row.coveredAt ? null : now,
        updatedAt: now,
      })
      .where(eq(courseChapters.id, chapterId));

    revalidatePath(`/subjects/${row.subjectSlug}`);
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
    console.error("Failed to toggle chapter coverage:", error);
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
