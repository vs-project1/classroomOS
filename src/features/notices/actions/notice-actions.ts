"use server";

import { db } from "@/db";
import { notices, users } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/session";
import { notifyMany } from "@/lib/notifications";

const noticeSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  content: z.string().trim().min(1, "Content is required"),
  expiresAt: z.string().optional().refine(val => !val || !isNaN(Date.parse(val)), { message: "Invalid date" }),
  isPinned: z.boolean().default(false),
  attachments: z.array(z.string().url()).optional().default([]),
});

export async function createNotice(prevState: any, formData: FormData) {
  await requireAuth(["ADMIN"]);

  let attachments: string[] = [];
  const rawAttachments = formData.get("attachments")?.toString();
  if (rawAttachments) {
    try {
      const parsed = JSON.parse(rawAttachments);
      if (Array.isArray(parsed)) attachments = parsed.filter((v) => typeof v === "string");
    } catch {
      // ignore malformed JSON — validation will catch invalid URLs
    }
  }

  const validatedFields = noticeSchema.safeParse({
    title: formData.get("title"),
    content: formData.get("content"),
    expiresAt: formData.get("expiresAt") ? String(formData.get("expiresAt")) : undefined,
    isPinned: formData.get("isPinned") === "on",
    attachments,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  const noticeId = crypto.randomUUID();
  try {
    await db.insert(notices).values({
      id: noticeId,
      title: data.title,
      content: data.content,
      expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
      isPinned: data.isPinned,
      attachments: data.attachments && data.attachments.length > 0 ? data.attachments : null,
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

  // Notifications fan-out: one per user (best-effort, never breaks the mutation)
  try {
    const allUsers = await db.select({ id: users.id }).from(users);
    if (allUsers.length > 0) {
      await notifyMany(
        allUsers.map((u) => ({
          userId: u.id,
          title: data.title,
          link: `/notices/${noticeId}`,
          type: "notice" as const,
        }))
      );
    }
  } catch (e) {
    console.error("[createNotice] fan-out failed:", e);
  }

  revalidatePath("/admin/notices");
  revalidatePath("/notices");
  revalidatePath("/");
  redirect("/admin/notices");
}

export async function deleteNotice(id: string) {
  await requireAuth(["ADMIN"]);

  try {
    await db.delete(notices).where(eq(notices.id, id));
    revalidatePath("/notices");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to delete notice:", error);
  }
}

export async function togglePinNotice(id: string, isPinned: boolean) {
  await requireAuth(["ADMIN"]);

  try {
    await db.update(notices).set({ isPinned, updatedAt: new Date() }).where(eq(notices.id, id));
    revalidatePath("/notices");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to pin notice:", error);
  }
}
