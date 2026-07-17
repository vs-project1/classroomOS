"use server";

import { db } from "@/db";
import { students } from "@/db/schema";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "crypto";

export type StudentActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    name?: string[];
    rollNumber?: string[];
  };
};

const StudentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  rollNumber: z.string().trim().min(1, "Roll number is required"),
});

export async function createStudent(prevState: StudentActionState, formData: FormData): Promise<StudentActionState> {
  const validatedFields = StudentSchema.safeParse({
    name: formData.get("name"),
    rollNumber: formData.get("rollNumber"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, rollNumber } = validatedFields.data;

  try {
    await db.insert(students).values({
      id: crypto.randomUUID(),
      name,
      rollNumber,
    });

    revalidatePath("/students");
    return { success: true, message: "Student registered successfully!" };
  } catch (error: unknown) {
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      return { success: false, message: "A student with this roll number already exists." };
    }
    console.error("Failed to create student:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
