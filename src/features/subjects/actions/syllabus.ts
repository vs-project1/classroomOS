"use server";

import { db } from "@/db";
import { courseUnits, courseChapters, courseMaterials } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export type ActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
};

const UnitSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
});

export async function addCourseUnit(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const subjectId = formData.get("subjectId") as string;
  const validatedFields = UnitSchema.safeParse({
    title: formData.get("title"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const existingUnits = await db.query.courseUnits.findMany({
      where: (units, { eq }) => eq(units.subjectId, subjectId),
      orderBy: (units, { desc }) => [desc(units.order)],
      limit: 1,
    });
    const newOrder = existingUnits.length > 0 ? existingUnits[0].order + 1 : 0;

    await db.insert(courseUnits).values({
      id: crypto.randomUUID(),
      subjectId,
      title: validatedFields.data.title,
      order: newOrder,
    });

    revalidatePath("/subjects", "layout");
    return { success: true, message: "Course unit added successfully!" };
  } catch (error) {
    console.error("Failed to add course unit:", error);
    return { success: false, message: "Database error. Failed to add unit." };
  }
}

const ChapterSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
});

export async function addCourseChapter(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const unitId = formData.get("unitId") as string;
  const validatedFields = ChapterSchema.safeParse({
    title: formData.get("title"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    const existingChapters = await db.query.courseChapters.findMany({
      where: (chapters, { eq }) => eq(chapters.unitId, unitId),
      orderBy: (chapters, { desc }) => [desc(chapters.order)],
      limit: 1,
    });
    const newOrder = existingChapters.length > 0 ? existingChapters[0].order + 1 : 0;

    await db.insert(courseChapters).values({
      id: crypto.randomUUID(),
      unitId,
      title: validatedFields.data.title,
      order: newOrder,
    });

    revalidatePath("/subjects", "layout");
    return { success: true, message: "Chapter added successfully!" };
  } catch (error) {
    console.error("Failed to add course chapter:", error);
    return { success: false, message: "Database error. Failed to add chapter." };
  }
}

const MaterialSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  fileUrl: z.string().trim().min(1, "File URL is required"),
  fileType: z.string().trim().min(1, "File type is required"),
});

export async function addCourseMaterial(
  prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const chapterId = formData.get("chapterId") as string;
  const validatedFields = MaterialSchema.safeParse({
    title: formData.get("title"),
    fileUrl: formData.get("fileUrl"),
    fileType: formData.get("fileType"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  try {
    await db.insert(courseMaterials).values({
      id: crypto.randomUUID(),
      chapterId,
      title: validatedFields.data.title,
      fileUrl: validatedFields.data.fileUrl,
      fileType: validatedFields.data.fileType,
    });

    revalidatePath("/subjects", "layout");
    return { success: true, message: "Material added successfully!" };
  } catch (error) {
    console.error("Failed to add course material:", error);
    return { success: false, message: "Database error. Failed to add material." };
  }
}
