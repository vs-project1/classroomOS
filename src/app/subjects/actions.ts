"use server";

import { db } from "@/db";
import { subjects } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "crypto";

export type SubjectActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    name?: string[];
    code?: string[];
  };
};

const SubjectSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  code: z.string().trim().min(1, "Code is required"),
  teacherId: z.string().optional().or(z.literal("")),
});

export async function createSubject(prevState: SubjectActionState, formData: FormData): Promise<SubjectActionState> {
  const validatedFields = SubjectSchema.safeParse({
    name: formData.get("name"),
    code: formData.get("code"),
    teacherId: formData.get("teacherId"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, code, teacherId } = validatedFields.data;

  try {
    await db.insert(subjects).values({
      id: crypto.randomUUID(),
      name,
      code,
      teacherId: teacherId || null,
    });

    revalidatePath("/subjects");
    return { success: true, message: "Subject created successfully!" };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      return { success: false, message: "A subject with this code already exists." };
    }
    console.error("Failed to create subject:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
