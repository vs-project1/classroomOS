"use server";

import { db } from "@/db";
import {
  courseChapters,
  courseUnits,
  enrollments,
  resources,
  students,
  subjects,
  users,
} from "@/db/schema";
import { requireAuth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";
import { z } from "zod";
import { and, asc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { UTApi } from "uploadthing/server";

const createResourceSchema = z.object({
  title: z.string().min(1, "Title is required"),
  subjectId: z.string().min(1, "Subject is required"),
  chapterId: z
    .string()
    .optional()
    .transform((value) => (value ? value : null)),
  fileUrl: z.url("Must be a valid URL"),
  fileType: z.enum(["pdf", "slides", "link", "zip", "code", "doc", "image", "text"]),
  description: z.string().optional(),
  fileSize: z.coerce.number().int().positive().optional(),
  fileKey: z.string().optional(),
});

export type ChapterTreeNode = {
  id: string;
  title: string;
  chapters: { id: string; title: string }[];
};

export async function getChapterTreeAction(
  subjectId: string,
): Promise<{ success: true; units: ChapterTreeNode[] } | { success: false; message: string }> {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  try {
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.id, subjectId),
    });

    if (!subject || (user.role !== "ADMIN" && subject.teacherId !== user.teacherId)) {
      return { success: false, message: "You don't have access to this subject." };
    }

    const units = await db.query.courseUnits.findMany({
      where: eq(courseUnits.subjectId, subjectId),
      orderBy: [asc(courseUnits.order)],
      with: {
        courseChapters: {
          columns: { id: true, title: true },
          orderBy: [asc(courseChapters.order)],
        },
      },
    });

    return {
      success: true,
      units: units.map((unit) => ({
        id: unit.id,
        title: unit.title,
        chapters: unit.courseChapters.map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
        })),
      })),
    };
  } catch (error) {
    console.error("Failed to load chapters:", error);
    return { success: false, message: "Unable to load chapters" };
  }
}

export async function createResourceAction(prevState: any, formData: FormData) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);
  let uploadedFileKey: string | undefined;

  try {
    if (user.role !== "ADMIN" && !user.teacherId) {
      return { success: false, message: "Only teachers and administrators can upload resources." };
    }

    const rawFileSize = formData.get("fileSize");
    const data = {
      title: formData.get("title"),
      subjectId: formData.get("subjectId"),
      chapterId: formData.get("chapterId"),
      fileUrl: formData.get("fileUrl"),
      fileType: formData.get("fileType"),
      description: formData.get("description") || undefined,
      fileSize:
        typeof rawFileSize === "string" && rawFileSize !== ""
          ? Number(rawFileSize)
          : undefined,
      fileKey: formData.get("fileKey") || undefined,
    };

    const parsed = createResourceSchema.safeParse(data);
    if (!parsed.success) {
      return {
        success: false,
        message: "Invalid form data",
        fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
      };
    }

    uploadedFileKey = parsed.data.fileKey;

    // Verify teacher owns this subject
    const subject = await db.query.subjects.findFirst({
      where: eq(subjects.id, parsed.data.subjectId),
    });

    if (!subject || (user.role !== "ADMIN" && subject.teacherId !== user.teacherId)) {
      return { success: false, message: "You don't have permission to add resources to this subject." };
    }

    let resolvedChapterId: string | null = parsed.data.chapterId ?? null;

    if (parsed.data.chapterId) {
      if (parsed.data.chapterId.startsWith("unit:")) {
        const unitId = parsed.data.chapterId.replace("unit:", "");
        const unit = await db.query.courseUnits.findFirst({
          where: and(eq(courseUnits.id, unitId), eq(courseUnits.subjectId, parsed.data.subjectId)),
          with: {
            courseChapters: {
              orderBy: [asc(courseChapters.order)],
              limit: 1,
            },
          },
        });

        if (!unit) {
          return { success: false, message: "Selected unit does not belong to this subject." };
        }

        if (unit.courseChapters.length > 0) {
          resolvedChapterId = unit.courseChapters[0].id;
        } else {
          // Auto-anchor an initial chapter so the unit has an entity for resources
          const newChapId = `chap_${Date.now()}`;
          await db.insert(courseChapters).values({
            id: newChapId,
            unitId: unit.id,
            title: unit.title,
            order: 1,
          });
          resolvedChapterId = newChapId;
        }
      } else {
        const chapter = await db
          .select({ id: courseChapters.id })
          .from(courseChapters)
          .innerJoin(courseUnits, eq(courseChapters.unitId, courseUnits.id))
          .where(
            and(
              eq(courseChapters.id, parsed.data.chapterId),
              eq(courseUnits.subjectId, parsed.data.subjectId)
            )
          )
          .limit(1);

        if (chapter.length === 0) {
          return { success: false, message: "Selected chapter does not belong to this subject." };
        }
        resolvedChapterId = parsed.data.chapterId;
      }
    }

    const resourceId = `res_${Date.now()}`;
    await db.insert(resources).values({
      id: resourceId,
      subjectId: parsed.data.subjectId,
      chapterId: resolvedChapterId,
      title: parsed.data.title,
      fileUrl: parsed.data.fileUrl,
      fileType: parsed.data.fileType,
      fileSize: parsed.data.fileSize ?? null,
      description: parsed.data.description || null,
      uploadedBy: user.teacherId ?? null,
    });

    // Notify enrolled students (best-effort — notifyMany never throws).
    try {
      const enrolledUsers = await db
        .selectDistinct({ userId: users.id })
        .from(enrollments)
        .innerJoin(students, eq(students.id, enrollments.studentId))
        .innerJoin(users, eq(users.email, students.email))
        .where(eq(enrollments.subjectId, parsed.data.subjectId));

      if (enrolledUsers.length > 0) {
        await notifyMany(
          enrolledUsers.map((row) => ({
            userId: row.userId,
            type: "resource" as const,
            title: `New resource "${parsed.data.title}" was posted in ${subject.name}`,
            link: `/subjects/${subject.slug}`,
          }))
        );
      }
    } catch (notifyError) {
      console.error("Failed to queue resource notifications:", notifyError);
    }

    revalidatePath("/admin/resources");
    revalidatePath("/teacher/resources");
    revalidatePath("/resources");
    revalidatePath("/cr");
    revalidatePath("/subjects");
    return { success: true, message: "Resource uploaded successfully" };
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      throw error;
    }
    console.error("Failed to create resource:", error);

    // Avoid orphaned uploads: the DB row failed but the file already exists
    // in UploadThing storage, so clean it up best-effort.
    if (uploadedFileKey) {
      try {
        await new UTApi().deleteFiles(uploadedFileKey);
      } catch (deleteError) {
        console.error("Failed to delete orphaned upload:", deleteError);
      }
    }

    return { success: false, message: "Unable to save resource" };
  }
}



export async function deleteResourceAction(resourceId: string) {
  const user = await requireAuth(["TEACHER", "ADMIN"]);

  try {
    const resource = await db.query.resources.findFirst({
      where: eq(resources.id, resourceId),
      with: { subject: true },
    });

    if (!resource) {
      return { success: false, message: "Resource not found" };
    }

    if (user.role !== "ADMIN" && resource.uploadedBy !== user.teacherId && resource.subject.teacherId !== user.teacherId) {
      return { success: false, message: "You do not have permission to delete this resource" };
    }

    await db.delete(resources).where(eq(resources.id, resourceId));

    revalidatePath("/admin/resources");
    revalidatePath("/teacher/resources");
    revalidatePath("/resources");
    revalidatePath("/cr");
    revalidatePath("/subjects");

    return { success: true, message: "Resource deleted successfully" };
  } catch (error) {
    console.error("Failed to delete resource:", error);
    return { success: false, message: "Failed to delete resource" };
  }
}
