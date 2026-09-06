"use server";

import { db } from "@/db";
import { students } from "@/db/schema";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import crypto from "crypto";
import { PhoneNumberUtil } from "google-libphonenumber";

const phoneUtil = PhoneNumberUtil.getInstance();

export type StudentActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: {
    name?: string[];
    rollNumber?: string[];
    email?: string[];
    phone?: string[];
    faculty?: string[];
    semester?: string[];
  };
};

const StudentSchema = z.object({
  name: z.string().trim().min(1, "Name is required"),
  rollNumber: z.string().trim().min(1, "Roll number is required"),
  email: z.union([
    z.string().trim().toLowerCase().email("Invalid email format"),
    z.literal("").transform(() => null),
    z.null(),
    z.undefined()
  ]),
  phone: z.union([
    z.string().trim().refine((val) => {
      try {
        const number = phoneUtil.parseAndKeepRawInput(val, 'NP'); // Default to Nepal if no country code provided
        return phoneUtil.isValidNumber(number);
      } catch {
        return false;
      }
    }, "Invalid phone number"),
    z.literal("").transform(() => null),
    z.null(),
    z.undefined()
  ]),
  faculty: z.string().trim().min(1, "Faculty is required"),
  semester: z.string().trim().min(1, "Semester is required"),
});

export async function createStudent(prevState: StudentActionState, formData: FormData): Promise<StudentActionState> {
  await requireAuth(["ADMIN"]);

  const validatedFields = StudentSchema.safeParse({
    name: formData.get("name"),
    rollNumber: formData.get("rollNumber"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    faculty: formData.get("faculty"),
    semester: formData.get("semester"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, rollNumber, email, phone, faculty, semester } = validatedFields.data;

  try {
    await db.insert(students).values({
      id: crypto.randomUUID(),
      name,
      rollNumber,
      email: email ?? null,
      phone: phone ?? null,
      faculty,
      semester,
    });

    revalidatePath("/admin/students");
    return { success: true, message: "Student registered successfully!" };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      return { success: false, message: "A student with this roll number already exists." };
    }
    console.error("Failed to create student:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}

export async function updateStudent(prevState: StudentActionState, formData: FormData): Promise<StudentActionState> {
  await requireAuth(["ADMIN"]);

  const id = formData.get("id") as string;
  const validatedFields = StudentSchema.safeParse({
    name: formData.get("name"),
    rollNumber: formData.get("rollNumber"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    faculty: formData.get("faculty"),
    semester: formData.get("semester"),
  });

  if (!validatedFields.success) {
    return {
      success: false,
      fieldErrors: validatedFields.error.flatten().fieldErrors,
    };
  }

  const { name, rollNumber, email, phone, faculty, semester } = validatedFields.data;

  try {
    const { eq } = await import("drizzle-orm");
    const { studentProfiles, users } = await import("@/db/schema");

    const existing = await db.query.students.findFirst({
      where: eq(students.id, id),
    });

    if (!existing) {
      return { success: false, message: "Student record not found." };
    }

    await db.transaction(async (tx) => {
      await tx.update(students).set({
        name,
        rollNumber,
        email: email ?? null,
        phone: phone ?? null,
        faculty,
        semester,
      }).where(eq(students.id, id));

      const userId = existing.userId;
      if (userId) {
        if (email) {
          await tx.update(users).set({ email, updatedAt: new Date() }).where(eq(users.id, userId));
        }
        const semDigitMatch = semester.match(/(\d+)/);
        const semInt = semDigitMatch ? parseInt(semDigitMatch[1], 10) : 1;
        await tx.update(studentProfiles).set({
          rollNumber,
          semester: semInt,
          phone: phone ?? null,
          updatedAt: new Date(),
        }).where(eq(studentProfiles.userId, userId));
      } else {
        const profile = await tx.query.studentProfiles.findFirst({
          where: eq(studentProfiles.rollNumber, existing.rollNumber),
        });
        if (profile) {
          await tx.update(students).set({ userId: profile.userId }).where(eq(students.id, id));
          const semDigitMatch = semester.match(/(\d+)/);
          const semInt = semDigitMatch ? parseInt(semDigitMatch[1], 10) : 1;
          await tx.update(studentProfiles).set({
            rollNumber,
            semester: semInt,
            phone: phone ?? null,
            updatedAt: new Date(),
          }).where(eq(studentProfiles.id, profile.id));
          if (email) {
            await tx.update(users).set({ email, updatedAt: new Date() }).where(eq(users.id, profile.userId));
          }
        }
      }
    });

    revalidatePath("/admin/students");
    revalidatePath("/admin/accounts");
    return { success: true, message: "Student updated successfully!" };
  } catch (error: unknown) {
    if (error && typeof error === "object" && "digest" in error && String(error.digest).startsWith("NEXT_REDIRECT")) throw error;
    if (error instanceof Error && error.message?.includes("UNIQUE constraint failed")) {
      return { success: false, message: "A student with this roll number or email already exists." };
    }
    console.error("Failed to update student:", error);
    return { success: false, message: "Something went wrong. Please try again." };
  }
}
