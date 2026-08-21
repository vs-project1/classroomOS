"use server";

import { db } from "@/db";
import { weeklyRoutine } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { and, eq, ne } from "drizzle-orm";
import { parseAndNormalizeTime } from "@/lib/time";

const routineSchema = z.object({
  subjectId: z.string().min(1, "Subject is required"),
  dayOfWeek: z.coerce.number().min(0).max(6, "Invalid day of week"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid start time"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid end time"),
  teacherName: z.string().optional(),
  room: z.string().optional(),
  notes: z.string().optional(),
}).refine(data => data.startTime < data.endTime, {
  message: "End time must be after start time",
  path: ["endTime"]
});

async function checkOverlap(dayOfWeek: number, startTime: string, endTime: string, excludeId?: string) {
  const existingRoutines = await db.query.weeklyRoutine.findMany({
    where: excludeId 
      ? and(eq(weeklyRoutine.dayOfWeek, dayOfWeek), ne(weeklyRoutine.id, excludeId))
      : eq(weeklyRoutine.dayOfWeek, dayOfWeek)
  });

  for (const r of existingRoutines) {
    if (startTime < r.endTime && endTime > r.startTime) {
      return r;
    }
  }
  return null;
}

export async function saveRoutine(prevState: any, formData: FormData) {
  const id = formData.get("id")?.toString();
  const rawStartTime = formData.get("startTime")?.toString() || "";
  const rawEndTime = formData.get("endTime")?.toString() || "";
  const normalizedStartTime = parseAndNormalizeTime(rawStartTime) || rawStartTime;
  const normalizedEndTime = parseAndNormalizeTime(rawEndTime) || rawEndTime;

  const rawData = {
    subjectId: formData.get("subjectId"),
    dayOfWeek: formData.get("dayOfWeek"),
    startTime: normalizedStartTime,
    endTime: normalizedEndTime,
    teacherName: formData.get("teacherName") || undefined,
    room: formData.get("room") || undefined,
    notes: formData.get("notes") || undefined,
  };

  const validatedFields = routineSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  // Check overlap
  const overlap = await checkOverlap(data.dayOfWeek, data.startTime, data.endTime, id);
  if (overlap) {
    const subject = await db.query.subjects.findFirst({ where: (s, { eq }) => eq(s.id, overlap.subjectId) });
    return {
      success: false,
      message: `This routine overlaps with ${subject?.name || "another class"} from ${overlap.startTime} to ${overlap.endTime}.`
    };
  }

  try {
    if (id) {
      await db.update(weeklyRoutine)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(weeklyRoutine.id, id));
    } else {
      await db.insert(weeklyRoutine).values({
        id: crypto.randomUUID(),
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }
  } catch (error) {
    console.error("Failed to save routine:", error);
    return {
      success: false,
      message: "Database error. Failed to save routine.",
    };
  }

  revalidatePath("/routine");
  revalidatePath("/");
  redirect("/routine");
}

export async function deleteRoutine(id: string) {
  try {
    await db.delete(weeklyRoutine).where(eq(weeklyRoutine.id, id));
    revalidatePath("/routine");
    revalidatePath("/");
  } catch (error) {
    console.error("Failed to delete routine:", error);
  }
  redirect("/routine");
}
