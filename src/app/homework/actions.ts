"use server";

import { db } from "@/db";
import { homework } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";

const homeworkSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  assignedDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  dueDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
}).refine(data => new Date(data.dueDate) >= new Date(data.assignedDate), {
  message: "Due date cannot be before assigned date",
  path: ["dueDate"],
});

export async function createHomework(prevState: any, formData: FormData) {
  const validatedFields = homeworkSchema.safeParse({
    subjectId: formData.get("subjectId"),
    title: formData.get("title"),
    description: formData.get("description"),
    assignedDate: formData.get("assignedDate"),
    dueDate: formData.get("dueDate"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  try {
    await db.insert(homework).values({
      id: crypto.randomUUID(),
      subjectId: data.subjectId,
      title: data.title,
      description: data.description,
      assignedDate: new Date(data.assignedDate),
      dueDate: new Date(data.dueDate),
      status: "active",
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to create homework:", error);
    return {
      success: false,
      message: "Database error. Failed to create homework.",
    };
  }

  revalidatePath("/homework");
  revalidatePath("/");
  redirect("/homework");
}

export async function updateHomeworkStatus(id: string, status: "active" | "completed" | "archived") {
  try {
    await db.update(homework).set({ status, updatedAt: new Date() }).where(eq(homework.id, id));
    revalidatePath("/homework");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to update status:", error);
  }
}
