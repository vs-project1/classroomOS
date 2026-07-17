"use server";

import { db } from "@/db";
import { notices } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";

const noticeSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
  expiresAt: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: "Invalid date" }),
  isPinned: z.boolean().default(false),
});

export async function createNotice(prevState: any, formData: FormData) {
  const validatedFields = noticeSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    expiresAt: formData.get("expiresAt"),
    isPinned: formData.get("isPinned") === "on",
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  try {
    await db.insert(notices).values({
      id: crypto.randomUUID(),
      title: data.title,
      content: data.content,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isPinned: data.isPinned,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    console.error("Failed to create notice:", error);
    return {
      success: false,
      message: "Database error. Failed to create notice.",
    };
  }

  revalidatePath("/notices");
  revalidatePath("/");
  redirect("/notices");
}

export async function deleteNotice(id: string) {
  try {
    await db.delete(notices).where(eq(notices.id, id));
    revalidatePath("/notices");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to delete notice:", error);
  }
}

export async function togglePinNotice(id: string, isPinned: boolean) {
  try {
    await db.update(notices).set({ isPinned, updatedAt: new Date() }).where(eq(notices.id, id));
    revalidatePath("/notices");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to pin notice:", error);
  }
}
