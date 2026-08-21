"use server";

import { z } from "zod";
import { db } from "@/db";
import { users, students, studentProfiles, teachers } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hashPassword, generateMemorablePassword } from "@/lib/auth/password";
import { requireAuth } from "@/lib/auth/session";
import { revalidatePath } from "next/cache";
import crypto from "node:crypto";

export type AccountActionState = {
  success: boolean;
  message?: string;
  fieldErrors?: Record<string, string[]>;
  credentials?: {
    name: string;
    email: string;
    role: "ADMIN" | "TEACHER" | "CR" | "STUDENT";
    temporaryPassword: string;
  };
};

function getOrdinalSuffix(n: number): string {
  if (n === 1) return "st";
  if (n === 2) return "nd";
  if (n === 3) return "rd";
  return "th";
}

function normalizeSemester(input: string | number | undefined): {
  intVal: number;
  strVal: string;
} {
  if (typeof input === "number") {
    const clamped = Math.max(1, Math.min(8, Math.floor(input)));
    return {
      intVal: clamped,
      strVal: `${clamped}${getOrdinalSuffix(clamped)} Semester`,
    };
  }
  if (!input) return { intVal: 1, strVal: "1st Semester" };
  const clean = input.toString().trim();
  const digitMatch = clean.match(/(\d+)/);
  if (digitMatch) {
    const num = parseInt(digitMatch[1], 10);
    const clamped = Math.max(1, Math.min(8, num));
    return {
      intVal: clamped,
      strVal: `${clamped}${getOrdinalSuffix(clamped)} Semester`,
    };
  }
  const romanMap: Record<string, number> = {
    i: 1,
    ii: 2,
    iii: 3,
    iv: 4,
    v: 5,
    vi: 6,
    vii: 7,
    viii: 8,
  };
  const romanVal = romanMap[clean.toLowerCase()];
  if (romanVal) {
    return {
      intVal: romanVal,
      strVal: `${romanVal}${getOrdinalSuffix(romanVal)} Semester`,
    };
  }
  return { intVal: 1, strVal: "1st Semester" };
}

const CreateAccountSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(1, "Full name is required")
      .max(255, "Name is too long"),
    email: z
      .string()
      .trim()
      .toLowerCase()
      .email("Invalid email address format"),
    role: z.enum(["ADMIN", "TEACHER", "CR", "STUDENT"]),
    phone: z.string().trim().optional().nullable(),
    temporaryPassword: z.string().optional(),
    rollNumber: z.string().trim().optional(),
    faculty: z.string().trim().optional(),
    semester: z.string().trim().optional(),
    section: z.string().trim().optional(),
    batchYear: z.coerce.number().optional(),
    faculties: z.array(z.string()).optional(),
    semesters: z.array(z.string()).optional(),
  })
  .superRefine((data, ctx) => {
    if (data.role === "STUDENT" || data.role === "CR") {
      if (!data.rollNumber || data.rollNumber.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["rollNumber"],
          message: "Roll number is required for students",
        });
      }
    }
  });

export async function createAccountAction(
  prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  try {
    await requireAuth(["ADMIN"]);
  } catch {
    return { success: false, message: "Unauthorized. Admin role required." };
  }

  const rawFaculties = formData.getAll("faculties").map(String);
  const rawSemesters = formData.getAll("semesters").map(String);

  const parsed = CreateAccountSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    phone: formData.get("phone") || null,
    temporaryPassword: formData.get("temporaryPassword") || undefined,
    rollNumber: formData.get("rollNumber") || undefined,
    faculty: formData.get("faculty") || undefined,
    semester: formData.get("semester") || undefined,
    section: formData.get("section") || undefined,
    batchYear: formData.get("batchYear") || undefined,
    faculties: rawFaculties.length > 0 ? rawFaculties : undefined,
    semesters: rawSemesters.length > 0 ? rawSemesters : undefined,
  });

  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors,
      message: "Please correct the highlighted form errors.",
    };
  }

  const data = parsed.data;
  const tempPassword =
    data.temporaryPassword && data.temporaryPassword.length >= 8
      ? data.temporaryPassword
      : generateMemorablePassword();

  const hashedPass = await hashPassword(tempPassword);
  const userId = `usr_${crypto.randomUUID()}`;

  try {
    await db.transaction(async (tx) => {
      // 1. Insert into users table
      await tx.insert(users).values({
        id: userId,
        email: data.email,
        passwordHash: hashedPass,
        role: data.role,
        mustChangePassword: true,
        isActive: true,
      });

      // 2. Insert role-specific profile records
      if (data.role === "STUDENT" || data.role === "CR") {
        const studentId = `std_${crypto.randomUUID()}`;
        const profileId = `sp_${crypto.randomUUID()}`;
        const semNorm = normalizeSemester(data.semester);
        const faculty = data.faculty || "BCA";
        const section = data.section || "A";
        const batchYear = data.batchYear || new Date().getFullYear();

        // Insert academic student record
        await tx.insert(students).values({
          id: studentId,
          name: data.name,
          rollNumber: data.rollNumber!,
          email: data.email,
          phone: data.phone || null,
          faculty,
          semester: semNorm.strVal,
        });

        // Insert 1:1 student profile linking userId
        await tx.insert(studentProfiles).values({
          id: profileId,
          userId,
          rollNumber: data.rollNumber!,
          faculty,
          semester: semNorm.intVal,
          section,
          batchYear,
          phone: data.phone || null,
        });
      } else if (data.role === "TEACHER") {
        const teacherId = `tch_${crypto.randomUUID()}`;
        await tx.insert(teachers).values({
          id: teacherId,
          name: data.name,
          email: data.email,
          phone: data.phone || null,
          faculties:
            data.faculties && data.faculties.length > 0
              ? data.faculties
              : ["BCA"],
          semesters:
            data.semesters && data.semesters.length > 0
              ? data.semesters
              : ["4th Semester"],
        });
      }
    });

    revalidatePath("/admin/accounts");
    revalidatePath("/admin/students");
    revalidatePath("/admin/teachers");

    return {
      success: true,
      message: `Account for ${data.name} created successfully!`,
      credentials: {
        name: data.name,
        email: data.email,
        role: data.role,
        temporaryPassword: tempPassword,
      },
    };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message?.includes("UNIQUE constraint failed")
    ) {
      if (
        error.message.includes("users.email") ||
        error.message.includes("students.email") ||
        error.message.includes("teachers.email")
      ) {
        return {
          success: false,
          message: "A user with this email address already exists.",
        };
      }
      if (
        error.message.includes("roll_number") ||
        error.message.includes("rollNumber")
      ) {
        return {
          success: false,
          message: "A student with this roll number already exists.",
        };
      }
      return {
        success: false,
        message: "Unique constraint violation: record already exists.",
      };
    }
    console.error("Failed to create account:", error);
    return {
      success: false,
      message: "An unexpected error occurred while creating the account.",
    };
  }
}

export async function toggleAccountStatusAction(
  userId: string
): Promise<AccountActionState> {
  const currentAdmin = await requireAuth(["ADMIN"]);

  if (userId === currentAdmin.id) {
    return {
      success: false,
      message: "Cannot deactivate your own active administrator account.",
    };
  }

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    return { success: false, message: "User account not found." };
  }

  const newStatus = !targetUser.isActive;

  try {
    await db
      .update(users)
      .set({
        isActive: newStatus,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/admin/accounts");
    return {
      success: true,
      message: `Account ${targetUser.email} has been ${
        newStatus ? "activated" : "deactivated"
      }.`,
    };
  } catch (error) {
    console.error("Failed to toggle status:", error);
    return { success: false, message: "Failed to update account status." };
  }
}

export async function resetPasswordAction(
  userId: string
): Promise<AccountActionState> {
  await requireAuth(["ADMIN"]);

  const targetUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!targetUser) {
    return { success: false, message: "User account not found." };
  }

  const newTempPassword = generateMemorablePassword();
  const hashed = await hashPassword(newTempPassword);

  try {
    await db
      .update(users)
      .set({
        passwordHash: hashed,
        mustChangePassword: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, userId));

    revalidatePath("/admin/accounts");
    return {
      success: true,
      message: "Temporary password generated successfully!",
      credentials: {
        name: targetUser.email.split("@")[0],
        email: targetUser.email,
        role: targetUser.role as "ADMIN" | "TEACHER" | "CR" | "STUDENT",
        temporaryPassword: newTempPassword,
      },
    };
  } catch (error) {
    console.error("Failed to reset password:", error);
    return { success: false, message: "Failed to reset password." };
  }
}

export async function updateAccountAction(
  prevState: AccountActionState,
  formData: FormData
): Promise<AccountActionState> {
  await requireAuth(["ADMIN"]);

  const userId = formData.get("userId") as string;
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  const phone = formData.get("phone") as string;
  const rollNumber = formData.get("rollNumber") as string;
  const faculty = formData.get("faculty") as string;
  const semester = formData.get("semester") as string;
  const section = formData.get("section") as string;

  if (!userId || !email || !name) {
    return { success: false, message: "Missing required fields." };
  }

  try {
    const targetUser = await db.query.users.findFirst({
      where: eq(users.id, userId),
    });

    if (!targetUser) {
      return { success: false, message: "User not found." };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(users)
        .set({
          email: email.trim().toLowerCase(),
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId));

      if (targetUser.role === "STUDENT" || targetUser.role === "CR") {
        const semNorm = normalizeSemester(semester);
        await tx
          .update(studentProfiles)
          .set({
            rollNumber: rollNumber || undefined,
            faculty: faculty || undefined,
            semester: semNorm.intVal,
            section: section || undefined,
            phone: phone || null,
            updatedAt: new Date(),
          })
          .where(eq(studentProfiles.userId, userId));

        await tx
          .update(students)
          .set({
            name,
            rollNumber: rollNumber || undefined,
            faculty: faculty || undefined,
            semester: semNorm.strVal,
            phone: phone || null,
          })
          .where(eq(students.email, targetUser.email));
      } else if (targetUser.role === "TEACHER") {
        await tx
          .update(teachers)
          .set({
            name,
            phone: phone || null,
            updatedAt: new Date(),
          })
          .where(eq(teachers.email, targetUser.email));
      }
    });

    revalidatePath("/admin/accounts");
    revalidatePath("/admin/students");
    revalidatePath("/admin/teachers");

    return { success: true, message: "Account details updated successfully!" };
  } catch (error: unknown) {
    if (
      error instanceof Error &&
      error.message?.includes("UNIQUE constraint failed")
    ) {
      return {
        success: false,
        message: "Another user already possesses this email or roll number.",
      };
    }
    console.error("Failed to update account:", error);
    return { success: false, message: "Failed to update account." };
  }
}
