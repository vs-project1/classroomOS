"use server";

import { requireAuth } from "@/lib/auth";
import { db } from "@/db";
import { studentProfiles, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

export interface UpdatePhoneResult {
  success: boolean;
  message?: string;
}

const phoneSchema = z
  .string()
  .trim()
  .max(24, "Phone number is too long.")
  .regex(/^[+0-9()\-\s]*$/, "Only digits, spaces, +, -, and parentheses are allowed.")
  .optional()
  .transform((value) => (value ? value : null));

/**
 * Updates the signed-in user's own contact phone number.
 * STUDENT/CR -> student_profiles.phone; TEACHER -> teachers.phone.
 * Email, roll number, and academic fields are identity-linked and stay
 * admin-managed (read-only here) on purpose.
 */
export async function updatePhoneAction(
  _prevState: UpdatePhoneResult,
  formData: FormData
): Promise<UpdatePhoneResult> {
  const user = await requireAuth(["STUDENT", "CR", "TEACHER", "ADMIN"]);

  const parsed = phoneSchema.safeParse(formData.get("phone"));
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? "Invalid phone number." };
  }

  try {
    if (user.role === "TEACHER") {
      if (!user.teacherId) {
        return { success: false, message: "Your account is not linked to a teacher profile." };
      }
      await db
        .update(teachers)
        .set({ phone: parsed.data, updatedAt: new Date() })
        .where(eq(teachers.id, user.teacherId));
    } else {
      if (!user.studentProfileId) {
        return { success: false, message: "Your account is not linked to a student profile." };
      }
      await db
        .update(studentProfiles)
        .set({ phone: parsed.data, updatedAt: new Date() })
        .where(eq(studentProfiles.id, user.studentProfileId));
    }
  } catch (error) {
    console.error("updatePhoneAction failed:", error);
    return { success: false, message: "Failed to update phone number. Please try again." };
  }

  revalidatePath("/profile");
  return { success: true, message: "Phone number updated." };
}
