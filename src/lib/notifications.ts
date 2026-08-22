import "server-only";

import { revalidatePath } from "next/cache";

import { db } from "@/db";
import { notifications } from "@/db/schema";

/**
 * Write layer for in-app notifications.
 *
 * Contract: notifications must NEVER break the parent mutation — every
 * insert failure is swallowed and logged, never rethrown.
 */
export type NotifyInput = {
  userId: string;
  type: "assignment" | "attendance" | "resource" | "notice" | "event" | "system";
  title: string;
  link?: string;
};

export async function notify(input: NotifyInput): Promise<void> {
  await notifyMany([input]);
}

export async function notifyMany(inputs: NotifyInput[]): Promise<void> {
  if (inputs.length === 0) return;

  try {
    // Single batch insert — one statement for all recipients.
    await db.insert(notifications).values(
      inputs.map((input) => ({
        id: crypto.randomUUID(),
        userId: input.userId,
        title: input.title,
        message: "",
        type: input.type,
        link: input.link ?? null,
      }))
    );
  } catch (error) {
    console.error("[notify] failed to insert notifications:", error);
  }

  revalidatePath("/notifications");
}
