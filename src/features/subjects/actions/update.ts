"use server";

import { db } from "@/db";
import { subjects } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuth } from "@/lib/auth";
import { slugify, uniqueSlugify } from "@/utils/slug";
import type { SubjectActionState } from "./create";

const UpdateSubjectSchema = z.object({
  id: z.string().min(1, "ID is required"),
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  semester: z.string().trim().min(1, "Semester is required"),
  teacherId: z.string().optional().or(z.literal("")),
});

export async function updateSubject(prevState: SubjectActionState, formData: FormData): Promise<SubjectActionState> {
  await requireAuth(["ADMIN"]);

  const validatedFields = UpdateSubjectSchema.safeParse({
    id: formData.get("id"),
    name: formData.get("name"),
    code: formData.get("code"),
    semester: formData.get("semester"),
    teacherId: formData.get("teacherId"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { id, name, code, semester, teacherId } = validatedFields.data;

  try {
    const existing = await db.query.subjects.findFirst({
      where: eq(subjects.id, id),
    });

    if (!existing) {
      return { success: false, message: "Subject not found." };
    }

    let slug = existing.slug;
    if (existing.name !== name) {
      const baseSlug = slugify(name);
      const allOtherSubjects = await db.select({ slug: subjects.slug, id: subjects.id }).from(subjects);
      slug = uniqueSlugify(baseSlug, allOtherSubjects.filter(s => s.id !== id).map(s => s.slug));
    }

    await db.update(subjects)
      .set({
        name,
        code,
        semester,
        slug,
        teacherId: teacherId || null,
      })
      .where(eq(subjects.id, id));

    revalidatePath("/admin/subjects");
    revalidatePath("/admin/teachers");
    revalidatePath("/subjects");
    revalidatePath("/teacher/routine");
    return { success: true, message: "Subject updated successfully!" };
  } catch (error: unknown) {
    console.error("Failed to update subject:", error);
    return { success: false, message: "Failed to update subject. Please try again." };
  }
}
