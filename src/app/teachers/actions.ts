"use server";

import { db } from "@/db";
import { teachers } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import crypto from "crypto";
import { eq } from "drizzle-orm";

export type TeacherActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    name?: string[];
    email?: string[];
    phone?: string[];
  };
};

const TeacherSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  email: z.string().trim().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().trim().optional(),
});

export async function saveTeacher(prevState: any, formData: FormData): Promise<TeacherActionState> {
  const id = formData.get("id")?.toString();
  const rawData = {
    name: formData.get("name"),
    email: formData.get("email") || undefined,
    phone: formData.get("phone") || undefined,
  };

  const validatedFields = TeacherSchema.safeParse(rawData);

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const data = validatedFields.data;

  try {
    if (id) {
      await db.update(teachers)
        .set({
          name: data.name,
          email: data.email || null,
          phone: data.phone || null,
          updatedAt: new Date(),
        })
        .where(eq(teachers.id, id));
    } else {
      await db.insert(teachers).values({
        id: crypto.randomUUID(),
        name: data.name,
        email: data.email || null,
        phone: data.phone || null,
      });
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      return { success: false, message: "A teacher with this email already exists." };
    }
    console.error("Failed to save teacher:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }

  revalidatePath("/teachers");
  revalidatePath("/subjects");
  revalidatePath("/routine");
  redirect("/teachers");
}

export async function deleteTeacher(id: string) {
  try {
    await db.delete(teachers).where(eq(teachers.id, id));
    revalidatePath("/teachers");
    revalidatePath("/subjects");
    revalidatePath("/routine");
  } catch (error) {
    console.error("Failed to delete teacher:", error);
  }
}
