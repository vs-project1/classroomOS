"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { requireAuth } from "@/lib/auth";

const NOTIFICATION_ROLES = ["STUDENT", "CR", "TEACHER", "ADMIN"] as const;

const NotificationIdSchema = z.string().trim().min(1, "Notification id is required");

export async function markNotificationRead(notificationId: string): Promise<void> {
  const user = await requireAuth([...NOTIFICATION_ROLES]);

  const parsed = NotificationIdSchema.safeParse(notificationId);
  if (!parsed.success) {
    return;
  }

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.id, parsed.data), eq(notifications.userId, user.id)));

  revalidatePath("/notifications");
}

export async function markAllNotificationsRead(): Promise<void> {
  const user = await requireAuth([...NOTIFICATION_ROLES]);

  await db
    .update(notifications)
    .set({ isRead: true })
    .where(and(eq(notifications.userId, user.id), eq(notifications.isRead, false)));

  revalidatePath("/notifications");
}
