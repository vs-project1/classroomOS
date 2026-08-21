"use server";

import { db } from "@/db";
import { events } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";
import { parseAndNormalizeTime } from "@/lib/time";
import { requireAuth } from "@/lib/auth/session";

const eventSchema = z.object({
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().min(1, "Description is required"),
  eventDate: z.string().refine((val) => !isNaN(Date.parse(val)), { message: "Invalid date" }),
  startTime: z.string().optional().refine(val => !val || /^\d{2}:\d{2}$/.test(val), { message: "Invalid start time" }),
  endTime: z.string().optional().refine(val => !val || /^\d{2}:\d{2}$/.test(val), { message: "Invalid end time" }),
  eventType: z.string().trim().min(1, "Event type is required"),
  location: z.string().optional(),
}).refine(data => {
  if (!data.startTime && !data.endTime) return true;
  if (data.startTime && data.endTime) return data.endTime > data.startTime;
  return false; // only one time provided
}, {
  message: "Provide both start and end times, or neither. End time must be after start time.",
  path: ["endTime"],
});

export async function createEvent(prevState: any, formData: FormData) {
  await requireAuth(["ADMIN", "TEACHER"]);

  const rawStartTime = formData.get("startTime")?.toString() || "";
  const rawEndTime = formData.get("endTime")?.toString() || "";
  const normalizedStartTime = parseAndNormalizeTime(rawStartTime) || undefined;
  const normalizedEndTime = parseAndNormalizeTime(rawEndTime) || undefined;

  const validatedFields = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description"),
    eventDate: formData.get("eventDate"),
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
    eventType: formData.get("eventType"),
    location: formData.get("location") || undefined,
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  try {
    await db.insert(events).values({
      id: crypto.randomUUID(),
      title: data.title,
      description: data.description,
      eventDate: new Date(data.eventDate),
      startTime: data.startTime,
      endTime: data.endTime,
      eventType: data.eventType,
      location: data.location,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  } catch (error) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    console.error("Failed to create event:", error);
    return {
      success: false,
      message: "Database error. Failed to create event.",
    };
  }

  revalidatePath("/admin/events");
  revalidatePath("/events");
  revalidatePath("/");
  redirect("/admin/events");
}

export async function deleteEvent(id: string) {
  await requireAuth(["ADMIN"]);

  try {
    await db.delete(events).where(eq(events.id, id));
    revalidatePath("/events");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to delete event:", error);
  }
}
