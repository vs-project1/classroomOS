"use server";

import { db } from "@/db";
import { resources, subjects } from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const createResourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: z.string().min(1, "Subject is required"),
  fileUrl: z.string().url("Must be a valid URL"),
  fileType: z.enum(["pdf", "slides", "link", "zip", "code", "doc"]),
  description: z.string().optional(),
});

export async function createResourceAction(prevState: any, formData: FormData) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  try {
    if (!user.teacherId) {
      return { success: false, message: "Only teachers can upload resources." };
    }

    const data = {
      title: formData.get("title"),
      subjectId: formData.get("subjectId"),
      fileUrl: formData.get("fileUrl"),
      fileType: formData.get("fileType"),
      description: formData.get("description"),
    };

    const parsed = createResourceSchema.safeParse(data);
    if (!parsed.success) {
      return { 
        success: false, 
        message: "Invalid form data", 
        fieldErrors: parsed.error.flatten().fieldErrors 
      };
    }

    // Verify teacher owns this subject
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.id, parsed.data.subjectId),
    });

    if (!subject || subject.teacherId !== user.teacherId) {
      return { success: false, message: "You don't have permission to add resources to this subject." };
    }

    const resourceId = `res_${Date.now()}`;
    await db.insert(resources).values({
      id: resourceId,
      subjectId: parsed.data.subjectId,
      title: parsed.data.title,
      fileUrl: parsed.data.fileUrl,
      fileType: parsed.data.fileType,
      description: parsed.data.description || null,
      uploadedBy: user.teacherId,
    });

    revalidatePath("/teacher/resources");
    return { success: true, message: "Resource uploaded successfully" };
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Failed to create resource:", error);
    return { success: false, message: "Unable to save resource" };
  }
}
