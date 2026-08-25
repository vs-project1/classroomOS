"use server";

import { db } from "@/db";
import { subjects } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "crypto";
import { requireAuth } from "@/lib/auth";
import { slugify, uniqueSlugify } from "@/utils/slug";

export type SubjectActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    name?: string[];
    code?: string[];
    semester?: string[];
  };
};

const SubjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  semester: z.string().trim().min(1, "Semester is required"),
  teacherId: z.string().optional().or(z.literal("")),
});

export async function createSubject(prevState: SubjectActionState, formData: FormData): Promise<SubjectActionState> {
  const user = await requireAuth(["ADMIN"]);
  
  const validatedFields = SubjectSchema.safeParse({
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

  const { name, code, semester, teacherId } = validatedFields.data;

  const baseSlug = slugify(name);
  const existingSubjects = await db.select({ slug: subjects.slug }).from(subjects);
  const slug = uniqueSlugify(baseSlug, existingSubjects.map((s) => s.slug));

  try {
    await db.insert(subjects).values({
      id: crypto.randomUUID(),
      name,
      code,
      semester,
      slug,
      teacherId: teacherId || null,
    });

    revalidatePath("/admin/subjects");
    revalidatePath("/subjects");
    return { success: true, message: "Subject created successfully!" };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      return { success: false, message: "A subject with this code already exists." };
    }
    console.error("Failed to create subject:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
