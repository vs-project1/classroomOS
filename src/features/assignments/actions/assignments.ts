"use server";

import { db } from "@/db";
import { homework, assignmentSubmissions, studentProfiles, students, enrollments, users } from "@/db/schema";
import { getCurrentUser, requireAuth } from "@/lib/auth";
import { notifyMany } from "@/lib/notifications";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "node:crypto";

const submissionSchema = z.object({
  homeworkId: z.string().min(1, "Homework ID is required"),
  content: z.string().optional().nullable(),
  fileUrl: z.string().url().optional().nullable(),
  fileName: z.string().optional().nullable(),
  fileSize: z.number().int().nonnegative().optional().nullable(),
});

const createHomeworkSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  assignedDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  sessionId: z.string().trim().optional().nullable(),
}).refine((data) => new Date(data.dueDate) >= new Date(data.assignedDate), {
  message: "Due date cannot be before assigned date",
  path: ["dueDate"],
});

export interface SubmissionActionResult {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
}

/**
 * Resolves the Student record (students.id) from the authenticated SessionUser.
 */
async function resolveCurrentStudentId(): Promise<string> {
  const user = await requireAuth(["STUDENT", "CR", "ADMIN", "TEACHER"]);

  // 1. If studentProfileId exists, resolve rollNumber -> students.id
  if (user.studentProfileId) {
    const profile = await db.query.studentProfiles.findFirst({
      where: eq(studentProfiles.id, user.studentProfileId),
    });
    if (profile) {
      const student = await db.query.students.findFirst({
        where: eq(students.rollNumber, profile.rollNumber),
      });
      if (student) return student.id;
    }
  }

  // 2. Direct lookup by user email in students table
  if (user.email) {
    const studentByEmail = await db.query.students.findFirst({
      where: eq(students.email, user.email),
    });
    if (studentByEmail) return studentByEmail.id;
  }

  // 3. Fallback to user ID if student ID matches
  const directStudent = await db.query.students.findFirst({
    where: eq(students.id, user.id),
  });
  if (directStudent) return directStudent.id;

  throw new Error("Student academic profile not found for this account.");
}

/**
 * Saves or updates a draft submission (status: "draft").
 */
export async function saveSubmissionDraftAction(
  prevState: any,
  formData: FormData
): Promise<SubmissionActionResult> {
  await requireAuth(["STUDENT", "CR"]);

  try {
    const studentId = await resolveCurrentStudentId();
    const rawData = {
      homeworkId: formData.get("homeworkId")?.toString() || "",
      content: formData.get("content")?.toString() || null,
      fileUrl: formData.get("fileUrl")?.toString() || null,
      fileName: formData.get("fileName")?.toString() || null,
      fileSize: formData.get("fileSize") ? Number(formData.get("fileSize")) : null,
    };

    const parsed = submissionSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { homeworkId, content, fileUrl, fileName, fileSize } = parsed.data;

    // Check existing submission
    const existing = await db.query.assignmentSubmissions.findFirst({
      where: and(
        eq(assignmentSubmissions.homeworkId, homeworkId),
        eq(assignmentSubmissions.studentId, studentId)
      ),
    });

    if (existing) {
      await db
        .update(assignmentSubmissions)
        .set({
          content: content ?? existing.content,
          fileUrl: fileUrl ?? existing.fileUrl,
          fileName: fileName ?? existing.fileName,
          fileSize: fileSize ?? existing.fileSize,
          status: existing.status === "graded" ? "graded" : "draft",
          updatedAt: new Date(),
        })
        .where(eq(assignmentSubmissions.id, existing.id));
    } else {
      await db.insert(assignmentSubmissions).values({
        id: `sub_${crypto.randomUUID()}`,
        homeworkId,
        studentId,
        content,
        fileUrl,
        fileName,
        fileSize,
        status: "draft",
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    revalidatePath("/homework");
    revalidatePath("/");
    return { success: true, message: "Draft saved successfully." };
  } catch (error: any) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to save submission draft:", error);
    return { success: false, message: error.message || "Failed to save draft." };
  }
}

/**
 * Submits assignment work (status: "submitted" or "late").
 */
export async function submitAssignmentAction(
  prevState: any,
  formData: FormData
): Promise<SubmissionActionResult> {
  await requireAuth(["STUDENT", "CR"]);

  try {
    const studentId = await resolveCurrentStudentId();
    const rawData = {
      homeworkId: formData.get("homeworkId")?.toString() || "",
      content: formData.get("content")?.toString() || null,
      fileUrl: formData.get("fileUrl")?.toString() || null,
      fileName: formData.get("fileName")?.toString() || null,
      fileSize: formData.get("fileSize") ? Number(formData.get("fileSize")) : null,
    };

    const parsed = submissionSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { homeworkId, content, fileUrl, fileName, fileSize } = parsed.data;

    if (!content && !fileUrl) {
      return {
        success: false,
        message: "Please provide either a written solution or an attached file.",
      };
    }

    const hw = await db.query.homework.findFirst({
      where: eq(homework.id, homeworkId),
    });
    if (!hw) {
      return { success: false, message: "Assignment not found." };
    }

    const isLate = new Date() > new Date(hw.dueDate);
    const finalStatus = isLate ? "late" : "submitted";

    const existing = await db.query.assignmentSubmissions.findFirst({
      where: and(
        eq(assignmentSubmissions.homeworkId, homeworkId),
        eq(assignmentSubmissions.studentId, studentId)
      ),
    });

    if (existing?.status === "graded") {
      return {
        success: false,
        message: "This assignment has already been graded and cannot be resubmitted.",
      };
    }

    // Idempotent upsert on unq_assignment_submissions_homework_student —
    // double-submits update the existing row instead of crashing.
    await db
      .insert(assignmentSubmissions)
      .values({
        id: `sub_${crypto.randomUUID()}`,
        homeworkId,
        studentId,
        content,
        fileUrl,
        fileName,
        fileSize,
        status: finalStatus,
        submittedAt: new Date(),
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [assignmentSubmissions.homeworkId, assignmentSubmissions.studentId],
        set: {
          content: content ?? existing?.content ?? null,
          fileUrl: fileUrl ?? existing?.fileUrl ?? null,
          fileName: fileName ?? existing?.fileName ?? null,
          fileSize: fileSize ?? existing?.fileSize ?? null,
          status: finalStatus,
          submittedAt: new Date(),
          updatedAt: new Date(),
        },
      });

    revalidatePath("/homework");
    revalidatePath("/");
    return { success: true, message: "Assignment submitted successfully!" };
  } catch (error: any) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to submit assignment:", error);
    return { success: false, message: error.message || "Failed to submit assignment." };
  }
}

/**
 * Creates homework assignment (for teacher / CR admin forms).
 */
export async function createHomework(prevState: any, formData: FormData) {
  await requireAuth(["TEACHER", "CR", "ADMIN"]);

  const validatedFields = createHomeworkSchema.safeParse({
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    description: formData.get("description"),
    assignedDate: formData.get("assignedDate"),
    dueDate: formData.get("dueDate"),
    sessionId: formData.get("sessionId")?.toString() || null,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  try {
    const homeworkId = crypto.randomUUID();
    await db.insert(homework).values({
      id: homeworkId,
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      assignedDate: new Date(data.assignedDate),
      dueDate: new Date(data.dueDate),
      sessionId: data.sessionId || null,
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Notify enrolled students (best-effort — notifyMany never throws).
    try {
      // notifications.userId references users.id, but enrollments.studentId is a
      // legacy students-table id — map via students.email = users.email.
      const enrolledUsers = await db
        .selectDistinct({ userId: users.id })
        .from(enrollments)
        .innerJoin(students, eq(students.id, enrollments.studentId))
        .innerJoin(users, eq(users.email, students.email))
        .where(eq(enrollments.subjectId, data.subjectId));

      if (enrolledUsers.length > 0) {
        await notifyMany(
          enrolledUsers.map((row) => ({
            userId: row.userId,
            type: "assignment" as const,
            title: `New assignment "${data.title}" was posted`,
            link: "/homework",
          }))
        );
      }
    } catch (notifyError) {
      console.error("Failed to queue homework notifications:", notifyError);
    }
  } catch (error) {
    console.error("Failed to create homework:", error);
    return {
      success: false,
      message: "Database error. Failed to create homework.",
    };
  }

  revalidatePath("/homework");
  revalidatePath("/admin/homework");
  revalidatePath("/");
  redirect("/admin/homework");
}

/**
 * Updates homework assignment status.
 */
export async function updateHomeworkStatus(
  id: string,
  status: "active" | "completed" | "archived"
) {
  await requireAuth(["TEACHER", "CR", "ADMIN"]);

  try {
    await db
      .update(homework)
      .set({ status, updatedAt: new Date() })
      .where(eq(homework.id, id));
    revalidatePath("/homework");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to update status:", error);
  }
}
